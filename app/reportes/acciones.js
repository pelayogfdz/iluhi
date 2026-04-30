'use server'
import prisma from '../../lib/prisma';
import { getSessionUser } from '../../lib/auth';

export async function obtenerReporteFacturas(filtros = {}) {
  try {
    const user = await getSessionUser();
    if (!user) return { success: false, error: 'No autorizado' };

    // Build the query
    const whereClause = {};

    // 1. User permissions (Only see invoices for their assigned companies)
    if (user.empresasIds && user.empresasIds.length > 0) {
      whereClause.empresaId = { in: user.empresasIds };
    }

    // 2. Specific filters
    if (filtros.empresaId) {
      whereClause.empresaId = filtros.empresaId;
    }

    if (filtros.clienteId) {
      whereClause.clienteId = filtros.clienteId;
    }

    if (filtros.metodoPago) {
      whereClause.metodoPago = filtros.metodoPago;
    }

    if (filtros.estatus) {
      if (filtros.estatus === 'Activas') {
        whereClause.estatus = 'Timbrada'; // Adjust based on how you define 'Active'
      } else if (filtros.estatus === 'Canceladas') {
        whereClause.estatus = 'Cancelada';
      } else {
        whereClause.estatus = filtros.estatus;
      }
    }

    if (filtros.fechaInicio || filtros.fechaFin) {
      whereClause.fechaEmision = {};
      if (filtros.fechaInicio) {
        whereClause.fechaEmision.gte = new Date(filtros.fechaInicio);
      }
      if (filtros.fechaFin) {
        const endDate = new Date(filtros.fechaFin);
        endDate.setHours(23, 59, 59, 999);
        whereClause.fechaEmision.lte = endDate;
      }
    }

    const facturasRaw = await prisma.factura.findMany({
      where: whereClause,
      include: {
        empresa: { select: { razonSocial: true } },
        cliente: { select: { razonSocial: true } }
      },
      orderBy: { fechaEmision: 'desc' }
    });

    // 3. Post-process to filter by "Complemento Emitido / Pendiente"
    let facturasProcesadas = facturasRaw;
    if (filtros.estadoComplemento && filtros.estadoComplemento !== 'Todos') {
      facturasProcesadas = facturasProcesadas.filter(fac => {
        // Only makes sense for PPD
        if (fac.metodoPago !== 'PPD') return false;

        let hasComplemento = false;
        if (fac.complementosPago) {
           let comps = [];
           if (typeof fac.complementosPago === 'string') {
              try { comps = JSON.parse(fac.complementosPago); } catch(e){}
           } else if (Array.isArray(fac.complementosPago)) {
              comps = fac.complementosPago;
           }
           hasComplemento = comps.length > 0;
        }

        if (filtros.estadoComplemento === 'Emitido') return hasComplemento;
        if (filtros.estadoComplemento === 'Pendiente') return !hasComplemento;
        return true;
      });
    }

    // Mapear campos simples para UI
    const facturas = facturasProcesadas.map(f => ({
      id: f.id,
      uuid: f.uuid || 'N/A',
      folioInterno: f.folio ? `${f.serie || ''}${f.folio}` : 'N/A',
      fecha: f.fechaEmision,
      empresa: f.empresa?.razonSocial || 'Desconocida',
      cliente: f.cliente?.razonSocial || 'Desconocido',
      metodoPago: f.metodoPago || 'N/A',
      estatus: f.estatus,
      subTotal: f.subTotal,
      total: f.total,
      complementos: (f.metodoPago === 'PPD' && typeof f.complementosPago === 'object' && Array.isArray(f.complementosPago)) ? f.complementosPago.length : (f.complementosPago && f.complementosPago !== '[]' && f.complementosPago !== 'null' ? 1 : 0)
    }));

    return { success: true, facturas };
  } catch (error) {
    console.error("Error al obtener reportes:", error);
    return { success: false, error: error.message };
  }
}
