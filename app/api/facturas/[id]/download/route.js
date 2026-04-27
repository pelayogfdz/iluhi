import { NextResponse } from 'next/server'
import Facturapi from 'facturapi'
import prisma from '../../../../../lib/prisma'

export async function GET(request, { params }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('type') || 'pdf' // 'pdf' or 'xml'
  
  if (!['pdf', 'xml', 'zip'].includes(format)) {
    return NextResponse.json({ error: 'Formato inválido. Use pdf, xml o zip' }, { status: 400 })
  }

  try {
    const fac = await prisma.factura.findUnique({
      where: { id: id },
      include: { empresa: true }
    });

    if (!fac || !fac.uuid) {
      return NextResponse.json({ error: 'Factura no encontrada o no timbrada' }, { status: 404 })
    }

    let targetKey = fac.empresa.facturapiLiveKey || process.env.FACTURAPI_LIVE_KEY;
    if (fac.estatus && fac.estatus.includes('Test Fallback')) {
      targetKey = fac.empresa.facturapiTestKey || process.env.FACTURAPI_TEST_KEY || process.env.FACTURAPI_LIVE_KEY;
    } else if (!fac.empresa.cerPath) {
      targetKey = fac.empresa.facturapiTestKey || process.env.FACTURAPI_TEST_KEY || process.env.FACTURAPI_LIVE_KEY;
    }

    if (!targetKey || targetKey.includes('PENDING_KEY')) {
      return NextResponse.json({ error: 'LLave Facturapi no configurada para la empresa' }, { status: 500 })
    }

    const tenantFacturapi = new Facturapi(targetKey);

    let stream;
    let contentType;
    let fileName = `Factura_${fac.uuid}`;
    
    if (format === 'pdf') {
      stream = await tenantFacturapi.invoices.downloadPdf(fac.uuid);
      contentType = 'application/pdf';
      fileName += '.pdf';
    } else if (format === 'xml') {
      stream = await tenantFacturapi.invoices.downloadXml(fac.uuid);
      contentType = 'application/xml';
      fileName += '.xml';
    } else if (format === 'zip') {
      stream = await tenantFacturapi.invoices.downloadZip(fac.uuid);
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

  } catch (error) {
    console.error(`Error descargando comprobante ${id}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
