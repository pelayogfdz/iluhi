import { NextResponse } from 'next/server'
import Facturapi from 'facturapi'
import prisma from '../../../../../lib/prisma'

export async function GET(request, { params }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('type') || 'pdf' // 'pdf' or 'xml'
  const pagoId = searchParams.get('pagoId')
  
  if (!['pdf', 'xml', 'zip'].includes(format)) {
    return NextResponse.json({ error: 'Formato inválido. Use pdf, xml o zip' }, { status: 400 })
  }

  if (!pagoId) {
    return NextResponse.json({ error: 'Falta el parámetro pagoId' }, { status: 400 })
  }

  try {
    // 1. Check if we have this complement in the local database (either emitted or received)
    const localEmitida = await prisma.facturaEmitida.findUnique({
      where: { uuid: pagoId }
    });
    const localRecibida = await prisma.facturaRecibida.findUnique({
      where: { uuid: pagoId }
    });

    const localComp = localEmitida || localRecibida;

    if (localComp) {
      if (format === 'xml') {
        if (localComp.xmlBase64) {
          const xmlContent = Buffer.from(localComp.xmlBase64, 'base64').toString('utf-8');
          const encoder = new TextEncoder();
          const webStream = new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode(xmlContent));
              controller.close();
            }
          });
          return new Response(webStream, {
            headers: {
              'Content-Type': 'application/xml',
              'Content-Disposition': `attachment; filename="Pago_${pagoId}.xml"`
            }
          });
        }
      } else if (format === 'pdf') {
        if (localComp.pdfBase64) {
          const pdfContent = Buffer.from(localComp.pdfBase64, 'base64');
          const webStream = new ReadableStream({
            start(controller) {
              controller.enqueue(pdfContent);
              controller.close();
            }
          });
          return new Response(webStream, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="Pago_${pagoId}.pdf"`
            }
          });
        }
      }
    }

    // 2. Original invoice check to find client keys
    const fac = await prisma.factura.findUnique({
      where: { uuid: id },
      include: { empresa: true }
    });

    if (!fac || !fac.uuid) {
      return returnFriendlyError(format, 'Factura original no encontrada o no timbrada');
    }

    let targetKey = fac.empresa.facturapiLiveKey || process.env.FACTURAPI_LIVE_KEY;
    if (fac.estatus && fac.estatus.includes('Test Fallback')) {
      targetKey = fac.empresa.facturapiTestKey || process.env.FACTURAPI_TEST_KEY || process.env.FACTURAPI_LIVE_KEY;
    }

    if (!targetKey || targetKey.includes('PENDING_KEY')) {
      return returnFriendlyError(format, 'LLave Facturapi no configurada para la empresa');
    }

    const tenantFacturapi = new Facturapi(targetKey);

    let stream;
    let contentType;
    let fileName = `Pago_${pagoId}`;
    
    try {
      if (format === 'pdf') {
        stream = await tenantFacturapi.invoices.downloadPdf(pagoId);
        contentType = 'application/pdf';
        fileName += '.pdf';
      } else if (format === 'xml') {
        stream = await tenantFacturapi.invoices.downloadXml(pagoId);
        contentType = 'application/xml';
        fileName += '.xml';
      } else if (format === 'zip') {
        stream = await tenantFacturapi.invoices.downloadZip(pagoId);
        contentType = 'application/zip';
        fileName += '.zip';
      }

      const { Readable } = require('stream');
      const webStream = Readable.toWeb(stream);

      return new Response(webStream, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${fileName}"`
        }
      });
    } catch (apiError) {
      console.error(`Error de API al descargar complemento ${pagoId}:`, apiError);
      return returnFriendlyError(format, `El archivo no está disponible en Facturapi y no existe copia local en el sistema. Detalle: ${apiError.message}`);
    }

  } catch (error) {
    console.error(`Error descargando comprobante de pago ${pagoId}:`, error);
    return returnFriendlyError(format, error.message);
  }
}

function returnFriendlyError(format, message) {
  if (format === 'xml') {
    const htmlMsg = `
      <html>
        <head><title>XML no disponible</title></head>
        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center; background-color: #0f172a; color: #f8fafc;">
          <div style="background: #1e293b; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; border: 1px solid #334155; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);">
            <h2 style="color: #facc15; margin-top: 0;">XML No Disponible</h2>
            <p style="font-size: 1.1rem; line-height: 1.5;">El archivo XML de este complemento de pago no está disponible localmente ni en Facturapi.</p>
            <p style="font-size: 1rem; color: #94a3b8; margin-bottom: 30px;">${message}</p>
            <button onclick="window.close()" style="padding: 10px 24px; background: #ca8a04; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; font-weight: bold;">Cerrar Pestaña</button>
          </div>
        </body>
      </html>
    `;
    return new Response(htmlMsg, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } else {
    const htmlMsg = `
      <html>
        <head><title>PDF no disponible</title></head>
        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center; background-color: #0f172a; color: #f8fafc;">
          <div style="background: #1e293b; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; border: 1px solid #334155; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);">
            <h2 style="color: #38bdf8; margin-top: 0;">Representación Gráfica No Disponible</h2>
            <p style="font-size: 1.1rem; line-height: 1.5;">Este complemento de pago fue importado masivamente desde el SAT en formato XML, el cual es el único documento oficial.</p>
            <p style="font-size: 1rem; color: #94a3b8; margin-bottom: 30px;">${message}</p>
            <button onclick="window.close()" style="padding: 10px 24px; background: #0284c7; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; font-weight: bold;">Cerrar Pestaña</button>
          </div>
        </body>
      </html>
    `;
    return new Response(htmlMsg, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}
