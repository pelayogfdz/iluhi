import { NextResponse } from 'next/server';

// Memoria para almacenar solicitudes de prueba
let solicitudesDb = [
  {
    id: 'SOL-2026-8910',
    nombre: 'Logística & Distribución Monterrey S.A. de C.V.',
    tipoPersona: 'moral',
    rfc: 'LDM1804229X1',
    email: 'contacto@logistica-mty.mx',
    telefono: '+52 81 1234 5678',
    vehiculo: 'Nissan Frontier PRO-4X 2026',
    cantidadUnidades: 3,
    tipoArrendamiento: 'puro',
    plazoMeses: 36,
    pagoInicialPorc: 20,
    mensualidadEstimada: 14850,
    montoTotalVehiculo: 725000,
    estatus: 'En Revisión de Buró',
    fecha: '2026-09-20T10:30:00Z',
    documentos: ['CSF_SAT.pdf', 'EstadosCuenta_Ago2026.pdf', 'INE_Representante.pdf']
  },
  {
    id: 'SOL-2026-8911',
    nombre: 'Arq. Roberto Salazar Mendoza',
    tipoPersona: 'pfae',
    rfc: 'SAMR850312HJ4',
    email: 'roberto@salazar-arquitectura.com',
    telefono: '+52 55 9876 5432',
    vehiculo: 'BMW X3 xDrive30e Híbrida 2026',
    cantidadUnidades: 1,
    tipoArrendamiento: 'puro',
    plazoMeses: 48,
    pagoInicialPorc: 15,
    mensualidadEstimada: 23400,
    montoTotalVehiculo: 1350000,
    estatus: 'Aprobado - En Espera de Firma',
    fecha: '2026-09-21T08:15:00Z',
    documentos: ['CSF_SAT.pdf', 'ComprobanteDomicilio.pdf']
  }
];

export async function GET(request) {
  return NextResponse.json({
    success: true,
    total: solicitudesDb.length,
    solicitudes: solicitudesDb
  });
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    // Generar Folio Único
    const folio = `SOL-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const nuevaSolicitud = {
      id: folio,
      nombre: data.nombre || data.razonSocial || 'Cliente Particular',
      tipoPersona: data.tipoPersona || 'moral',
      rfc: (data.rfc || 'XAXX010101000').toUpperCase(),
      email: data.email || '',
      telefono: data.telefono || '',
      vehiculo: data.vehiculo || 'Unidad a cotizar',
      cantidadUnidades: Number(data.cantidadUnidades) || 1,
      tipoArrendamiento: data.tipoArrendamiento || 'puro',
      plazoMeses: Number(data.plazoMeses) || 36,
      pagoInicialPorc: Number(data.pagoInicialPorc) || 20,
      mensualidadEstimada: Number(data.mensualidadEstimada) || 0,
      montoTotalVehiculo: Number(data.montoTotalVehiculo) || 0,
      estatus: 'Pre-Aprobada',
      fecha: new Date().toISOString(),
      documentos: data.documentos || []
    };

    solicitudesDb.unshift(nuevaSolicitud);

    return NextResponse.json({
      success: true,
      folio: folio,
      mensaje: '¡Solicitud registrada con éxito! Un asesor se comunicará en menos de 2 horas hábiles.',
      solicitud: nuevaSolicitud
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Error al procesar la solicitud: ' + error.message },
      { status: 500 }
    );
  }
}
