import { NextResponse } from 'next/server'
import facturapi from '../../../../../lib/facturapi'
import prisma from '../../../../../lib/prisma'

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

    // 2. Si hay llave de Facturapi, intentar descargar de Facturapi
    if (targetKey && !targetKey.includes('PENDING_KEY') && targetDocIdentifier && !targetDocIdentifier.startsWith('sim_uuid')) {
      try {
        const tenantFacturapi = new facturapi.constructor(targetKey);
        let facturapiIdToDownload = targetDocIdentifier;

        // Facturapi downloadPdf/downloadXml requiere el ID interno de 24 caracteres.
        // Si recibimos un UUID del SAT (36 chars), lo resolvemos primero con Facturapi
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
          const { Readable } = require('stream');
          const webStream = Readable.toWeb(stream);
          return new Response(webStream, {
            headers: {
              'Content-Type': contentType,
              'Content-Disposition': `inline; filename="${fileName}"`
            }
          });
        }
      } catch (fErr) {
        console.log(`Facturapi download error for ${targetDocIdentifier}, falling back to local storage:`, fErr.message);
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
            'Content-Disposition': `inline; filename="${fileName}.pdf"`
          }
        });
      }

      if (format === 'xml' && fac.xmlBase64) {
        const xmlContent = Buffer.from(fac.xmlBase64, 'base64');
        return new Response(xmlContent, {
          headers: {
            'Content-Type': 'application/xml',
            'Content-Disposition': `attachment; filename="${fileName}.xml"`
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
