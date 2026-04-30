import prisma from "../../lib/prisma";
import FlujoTrabajoClient from "./FlujoTrabajoClient";

export const metadata = {
  title: "Flujo de Trabajo | SEIT",
  description: "Módulo de captura y asignación de pagos",
};

export default async function FlujoTrabajoPage() {
  // Cargar facturas disponibles (Timbradas o Borrador/PPD, depende del caso de uso. Por ahora cargaremos todas ordenadas por folio descentente)
  const facturasDisponibles = await prisma.factura.findMany({
    where: {
      estatus: {
        not: "Cancelada"
      }
    },
    include: {
      cliente: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 100 // Limitamos para rendimiento, la búsqueda full se podría hacer server-side en el futuro
  });

  const empresasDisponibles = await prisma.empresa.findMany({
    orderBy: { razonSocial: 'asc' }
  });

  const clientesDisponibles = await prisma.cliente.findMany({
    orderBy: { razonSocial: 'asc' }
  });

  // Cargar pagos pendientes
  const pagosPendientes = await prisma.pagoFlujo.findMany({
    where: { estatus: "Pendiente" },
    orderBy: { createdAt: 'desc' }
  });

  // Cargar ultimos pagos asignados
  const pagosAsignados = await prisma.pagoFlujo.findMany({
    where: { estatus: "Asignado" },
    include: {
      factura: {
        include: { cliente: true }
      }
    },
    orderBy: { updatedAt: 'desc' },
    take: 50
  });

  return (
    <div className="p-8 pb-20 sm:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Flujo de Trabajo (Pagos)</h1>
          <p className="text-gray-500 mt-2 text-sm sm:text-base">Registra ingresos y concilia pagos con facturas.</p>
        </div>

        <FlujoTrabajoClient 
          facturasDisponibles={facturasDisponibles} 
          empresasDisponibles={empresasDisponibles}
          clientesDisponibles={clientesDisponibles}
          pagosPendientesIniciales={pagosPendientes}
          pagosAsignadosIniciales={pagosAsignados}
        />
      </div>
    </div>
  );
}
