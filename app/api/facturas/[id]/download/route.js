import { NextResponse } from 'next/server'
import facturapi from '../../../../../lib/facturapi'

export async function GET(request, { params }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('type') || 'pdf' // 'pdf' or 'xml'
  
  if (!['pdf', 'xml', 'zip'].includes(format)) {
    return NextResponse.json({ error: 'Formato inválido. Use pdf, xml o zip' }, { status: 400 })
  }

  // Verificar llave Facturapi
  if (!process.env.FACTURAPI_KEY || process.env.FACTURAPI_KEY.includes('PENDING_KEY')) {
    return NextResponse.json({ error: 'LLave Facturapi no configurada en el entorno' }, { status: 500 })
  }

  try {
    let stream;
    let contentType;
    let fileName = `Factura_${id}`;
    
    if (format === 'pdf') {
      stream = await facturapi.invoices.downloadPdf(id);
      contentType = 'application/pdf';
      fileName += '.pdf';
    } else if (format === 'xml') {
      stream = await facturapi.invoices.downloadXml(id);
      contentType = 'application/xml';
      fileName += '.xml';
    } else if (format === 'zip') {
      stream = await facturapi.invoices.downloadZip(id);
      contentType = 'application/zip';
      fileName += '.zip';
    }

    const { Readable } = require('stream');
    
    // El SDK de Facturapi devuelve un Node.js stream, Next.js usa Web Streams
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
