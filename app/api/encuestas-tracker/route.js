import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const facturaUuid = searchParams.get('factura');
  const rating = parseInt(searchParams.get('rating'), 10);
  
  if (!facturaUuid || isNaN(rating) || rating < 1 || rating > 5) {
    return new NextResponse("Petición inválida o enlace caducado.", { status: 400 });
  }

  try {
    // Buscar la factura
    const factura = await prisma.facturaEmitida.findUnique({
      where: { uuid: facturaUuid },
      include: { empresa: true }
    });

    if (!factura) {
      return new NextResponse("Factura no encontrada.", { status: 404 });
    }

    // Actualizar la calificación si no ha sido calificada aún, o sobrescribir.
    await prisma.facturaEmitida.update({
      where: { id: factura.id },
      data: { calificacionServicio: rating }
    });

    // Validar direcciones de Growth
    const empresa = factura.empresa;
    const urlGoogle = empresa.googleReviewsUrl;
    const urlSoporte = empresa.encuestaEnlace;

    // Logica de redireccion estratificada UX/Growth:
    // 4 a 5 estrellas: Incentivar a Google Reviews (Publicidad Orgánica)
    // 1 a 3 estrellas: Mandar a buzón interno de quejas / formulario de soporte para evitar public outcry
    let targetRedirect = "https://www.google.com"; // default fallback si no hay nada configurado

    if (rating >= 4 && urlGoogle) {
      targetRedirect = urlGoogle;
    } else if (urlSoporte) {
      targetRedirect = urlSoporte;
    }

    // Redirigir al destino (Response Cache bypass 302 temporal)
    return NextResponse.redirect(targetRedirect, 302);

  } catch (error) {
    console.error("Error en Tracker de Encuesta:", error);
    return new NextResponse("Error procesando su respuesta", { status: 500 });
  }
}
