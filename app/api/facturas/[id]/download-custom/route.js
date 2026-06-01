import { NextResponse } from 'next/server'
import Facturapi from 'facturapi'
import prisma from '../../../../../lib/prisma'
import { generateCotizacionPdf, generateOrdenServicioPdf } from '../../../../../lib/pdfGenerator'

export async function GET(request, { params }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'COTIZACION' // 'COTIZACION' or 'ORDEN_SERVICIO'
  
  if (!['COTIZACION', 'ORDEN_SERVICIO'].includes(type)) {
    return NextResponse.json({ error: 'Tipo inválido. Use COTIZACION u ORDEN_SERVICIO' }, { status: 400 })
  }

  try {
    const fac = await prisma.factura.findUnique({
      where: { id: id },
      include: { empresa: true, cliente: true }
    });

    if (!fac || !fac.uuid) {
      return NextResponse.json({ error: 'Comprobante no encontrado o no tiene uuid asociado.' }, { status: 404 })
    }

    let targetKey = fac.empresa.facturapiLiveKey || process.env.FACTURAPI_LIVE_KEY;
    if (fac.estatus && fac.estatus.includes('Test Fallback')) {
      targetKey = fac.empresa.facturapiTestKey || process.env.FACTURAPI_TEST_KEY || process.env.FACTURAPI_LIVE_KEY;
    }

    if (!targetKey || targetKey.includes('PENDING_KEY')) {
      return NextResponse.json({ error: 'LLave Facturapi no configurada para la empresa' }, { status: 500 })
    }

    const tenantFacturapi = new Facturapi(targetKey);

    let pdfBuffer;
    let fileName = '';

    if (type === 'COTIZACION') {
        pdfBuffer = await generateCotizacionPdf(fac, fac.empresa, fac.cliente, tenantFacturapi);
        fileName = `Cotizacion_${fac.folioInterno || fac.folio || fac.uuid}.pdf`;
    } else {
        pdfBuffer = await generateOrdenServicioPdf(fac, fac.empresa, fac.cliente, tenantFacturapi);
        fileName = `OrdenServicio_${fac.folioInterno || fac.folio || fac.uuid}.pdf`;
    }

    if (!pdfBuffer) {
        return NextResponse.json({ error: 'No se pudo generar el PDF' }, { status: 500 });
    }

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });

  } catch (error) {
    console.error(`Error descargando comprobante custom ${id}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
