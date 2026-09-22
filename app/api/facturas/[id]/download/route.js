import { NextResponse } from 'next/server'
import facturapi from '../../../../../lib/facturapi'
import prisma from '../../../../../lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('type') || 'pdf' // 'pdf', 'xml', or 'zip'
  
  if (!['pdf', 'xml', 'zip'].includes(format)) {
    return NextResponse.json({ error: 'Formato inválido. Use pdf, xml o zip' }, { status: 400 })
  }

  try {
    // 1. Buscar en la base de datos por UUID o por ID interno
    const fac = await prisma.factura.findFirst({
      where: {
        OR: [
          { uuid: id },
          { id: id }
        ]
      },
      include: { empresa: true }
    });

    let targetKey = null;
    let targetDocIdentifier = id;

    if (fac) {
      targetDocIdentifier = fac.uuid || fac.id;
      targetKey = fac.empresa?.facturapiLiveKey || process.env.FACTURAPI_LIVE_KEY;
      if (fac.estatus && fac.estatus.includes('Test Fallback')) {
        targetKey = fac.empresa?.facturapiTestKey || process.env.FACTURAPI_TEST_KEY || process.env.FACTURAPI_LIVE_KEY;
      }
    }

    // 2. Si hay llave de Facturapi para la empresa, intentar descargar directo
    if (targetKey && !targetKey.includes('PENDING_KEY') && targetDocIdentifier && !targetDocIdentifier.startsWith('sim_uuid')) {
      try {
        const Facturapi = facturapi.constructor;
        const tenantFacturapi = new Facturapi(targetKey);
        let facturapiIdToDownload = targetDocIdentifier;

        // Si es UUID de 36 caracteres, resolver primero al ID interno de 24 caracteres de Facturapi
        if (targetDocIdentifier.length === 36 && targetDocIdentifier.includes('-')) {
          try {
            const listRes = await tenantFacturapi.invoices.list({ q: targetDocIdentifier, limit: 1 });
            if (listRes.data && listRes.data.length > 0) {
              facturapiIdToDownload = listRes.data[0].id;
            }
          } catch (qErr) {
            console.log("Aviso: no se pudo resolver UUID con q en Facturapi:", qErr.message);
          }
        }

        let stream;
        let contentType;
        let fileName = `${fac?.tipoComprobante === 'E' ? 'NotaCredito' : 'Factura'}_${fac?.serie || ''}${fac?.folio || ''}_${targetDocIdentifier}`;

        if (format === 'pdf') {
          stream = await tenantFacturapi.invoices.downloadPdf(facturapiIdToDownload);
          contentType = 'application/pdf';
          fileName += '.pdf';
        } else if (format === 'xml') {
          stream = await tenantFacturapi.invoices.downloadXml(facturapiIdToDownload);
          contentType = 'application/xml';
          fileName += '.xml';
        } else if (format === 'zip') {
          stream = await tenantFacturapi.invoices.downloadZip(facturapiIdToDownload);
          contentType = 'application/zip';
          fileName += '.zip';
        }

        if (stream) {
          const chunks = [];
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
          const buffer = Buffer.concat(chunks);
          return new Response(buffer, {
            headers: {
              'Content-Type': contentType,
              'Content-Disposition': `inline; filename="${fileName}"`,
              'Content-Length': buffer.length.toString(),
              'Cache-Control': 'no-store, max-age=0'
            }
          });
        }
      } catch (fErr) {
        console.log(`Facturapi download error for ${targetDocIdentifier}, buscando alternativas:`, fErr.message);
      }
    }

    // 2.1 Fallback: Si no se encontró en la empresa asignada, buscar en otras empresas con llave configurada
    const empresasConLlave = await prisma.empresa.findMany({
      where: {
        facturapiLiveKey: { not: null }
      }
    });

    for (const emp of empresasConLlave) {
      if (emp.facturapiLiveKey === targetKey) continue;
      try {
        const Facturapi = facturapi.constructor;
        const tenantFacturapi = new Facturapi(emp.facturapiLiveKey);
        let fid = id;
        if (id.length === 36) {
          const lRes = await tenantFacturapi.invoices.list({ q: id, limit: 1 });
          if (lRes.data && lRes.data.length > 0) {
            fid = lRes.data[0].id;
          } else {
            continue;
          }
        }
        let stream;
        if (format === 'pdf') stream = await tenantFacturapi.invoices.downloadPdf(fid);
        else if (format === 'xml') stream = await tenantFacturapi.invoices.downloadXml(fid);
        else if (format === 'zip') stream = await tenantFacturapi.invoices.downloadZip(fid);

        if (stream) {
          const chunks = [];
          for await (const chunk of stream) chunks.push(chunk);
          const buffer = Buffer.concat(chunks);
          return new Response(buffer, {
            headers: {
              'Content-Type': format === 'pdf' ? 'application/pdf' : format === 'xml' ? 'application/xml' : 'application/zip',
              'Content-Disposition': `inline; filename="Documento_${id}.${format}"`,
              'Content-Length': buffer.length.toString(),
              'Cache-Control': 'no-store, max-age=0'
            }
          });
        }
      } catch (e) {
        // Continuar buscando
      }
    }

    // 3. Fallback: Si no está en Facturapi pero tenemos el PDF/XML en base64 localmente
    if (fac) {
      let fileName = `${fac.tipoComprobante === 'E' ? 'NotaCredito' : 'Factura'}_${fac.serie || ''}${fac.folio || ''}_${fac.uuid}`;

      if (format === 'pdf' && fac.pdfBase64) {
        const pdfContent = Buffer.from(fac.pdfBase64, 'base64');
        return new Response(pdfContent, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${fileName}.pdf"`,
            'Content-Length': pdfContent.length.toString()
          }
        });
      }

      if (format === 'xml' && fac.xmlBase64) {
        const xmlContent = Buffer.from(fac.xmlBase64, 'base64');
        return new Response(xmlContent, {
          headers: {
            'Content-Type': 'application/xml',
            'Content-Disposition': `attachment; filename="${fileName}.xml"`,
            'Content-Length': xmlContent.length.toString()
          }
        });
      }
    }

    // 4. Si no se pudo obtener de ninguna fuente
    const htmlMsg = `
      <html>
        <head><title>Documento no disponible</title></head>
        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center; background-color: #0f172a; color: #f8fafc;">
          <div style="background: #1e293b; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; border: 1px solid #334155; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);">
            <h2 style="color: #38bdf8; margin-top: 0;">Documento No Disponible</h2>
            <p style="font-size: 1.1rem; line-height: 1.5;">El archivo ${format.toUpperCase()} de este comprobante no se pudo recuperar de Facturapi ni del almacenamiento local.</p>
            <button onclick="window.close()" style="padding: 10px 24px; background: #0284c7; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; font-weight: bold; margin-top: 15px;">Cerrar Pestaña</button>
          </div>
        </body>
      </html>
    `;
    return new Response(htmlMsg, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  } catch (error) {
    console.error(`Error descargando comprobante ${id}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
