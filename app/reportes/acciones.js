'use server'
import prisma from '../../lib/prisma';
import { getSessionUser } from '../../lib/auth';
import { formatDateDDMMYYYY } from '../../lib/date';

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
        whereClause.estatus = 'Timbrada';
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

    // Apply complementos filter directly at database level
    if (filtros.estadoComplemento && filtros.estadoComplemento !== 'Todos') {
      whereClause.metodoPago = 'PPD';
      if (filtros.estadoComplemento === 'Emitido') {
        whereClause.NOT = {
          complementosPago: {
            equals: []
          }
        };
      } else if (filtros.estadoComplemento === 'Pendiente') {
        whereClause.OR = [
          { complementosPago: { equals: [] } },
          { complementosPago: { equals: null } }
        ];
      }
    }

    // 1. Fetch only the first 100 detailed records for the UI table
    const detailedPromise = prisma.factura.findMany({
      where: whereClause,
      select: {
        id: true,
        uuid: true,
        serie: true,
        folio: true,
        fechaEmision: true,
        metodoPago: true,
        estatus: true,
        subTotal: true,
        total: true,
        complementosPago: true,
        empresa: { select: { razonSocial: true } },
        cliente: { select: { razonSocial: true } }
      },
      orderBy: { fechaEmision: 'desc' },
      take: 100
    });

    // 2. Fetch grouped aggregates for KPIs and Chart data in ONE single query (Only returning ~8 rows max!)
    const groupedPromise = prisma.factura.groupBy({
      where: whereClause,
      by: ['estatus', 'metodoPago'],
      _count: { _all: true },
      _sum: { total: true }
    });

    const [detailedRaw, groupedAggregates] = await Promise.all([
      detailedPromise,
      groupedPromise
    ]);

    // Map the detailed records for the UI table
    const facturasTable = detailedRaw.map(f => ({
      id: f.id,
      uuid: f.uuid || 'N/A',
      folioInterno: f.folio ? `${f.serie || ''}${f.folio}` : 'N/A',
      fecha: f.fechaEmision.toISOString(),
      empresa: f.empresa?.razonSocial || 'Desconocida',
      cliente: f.cliente?.razonSocial || 'Desconocido',
      subTotal: f.subTotal,
      total: f.total,
      estatus: f.estatus,
      metodoPago: f.metodoPago,
      complementos: (f.metodoPago === 'PPD' && typeof f.complementosPago === 'object' && Array.isArray(f.complementosPago)) ? f.complementosPago.length : (f.complementosPago && f.complementosPago !== '[]' && f.complementosPago !== 'null' ? 1 : 0)
    }));

    // Calculate KPIs and chart data from grouped results in memory (instantaneous!)
    let totalMonto = 0;
    let totalFacturas = 0;
    let totalPPD = 0;
    let totalPUE = 0;

    const chartMap = {};

    groupedAggregates.forEach(group => {
      const total = group._sum.total || 0;
      const count = group._count._all || 0;
      const estatus = group.estatus || 'Desconocido';
      const metodo = group.metodoPago || 'N/A';

      totalMonto += total;
      totalFacturas += count;

      if (metodo === 'PPD') totalPPD += count;
      if (metodo === 'PUE') totalPUE += count;

      if (!chartMap[estatus]) {
        chartMap[estatus] = { name: estatus, cantidad: 0, montoTotal: 0 };
      }
      chartMap[estatus].cantidad += count;
      chartMap[estatus].montoTotal += total;
    });

    const chartData = Object.values(chartMap);

    const kpis = {
      totalMonto,
      totalFacturas,
      totalPPD,
      totalPUE
    };

    return {
      success: true,
      facturas: facturasTable, // Maintain parameter name compatibility
      kpis,
      chartData,
      totalCount: totalFacturas
    };
  } catch (error) {
    console.error("Error al obtener reportes:", error);
    return { success: false, error: error.message };
  }
}

export async function obtenerReporteExcelData(filtros = {}) {
  try {
    const user = await getSessionUser();
    if (!user) return { success: false, error: 'No autorizado' };

    const whereClause = {};
    if (user.empresasIds && user.empresasIds.length > 0) {
      whereClause.empresaId = { in: user.empresasIds };
    }
    if (filtros.empresaId) whereClause.empresaId = filtros.empresaId;
    if (filtros.clienteId) whereClause.clienteId = filtros.clienteId;
    if (filtros.metodoPago) whereClause.metodoPago = filtros.metodoPago;
    if (filtros.estatus) {
      if (filtros.estatus === 'Activas') whereClause.estatus = 'Timbrada';
      else if (filtros.estatus === 'Canceladas') whereClause.estatus = 'Cancelada';
      else whereClause.estatus = filtros.estatus;
    }
    if (filtros.fechaInicio || filtros.fechaFin) {
      whereClause.fechaEmision = {};
      if (filtros.fechaInicio) whereClause.fechaEmision.gte = new Date(filtros.fechaInicio);
      if (filtros.fechaFin) {
        const endDate = new Date(filtros.fechaFin);
        endDate.setHours(23, 59, 59, 999);
        whereClause.fechaEmision.lte = endDate;
      }
    }

    // Apply complementos filter directly at database level
    if (filtros.estadoComplemento && filtros.estadoComplemento !== 'Todos') {
      whereClause.metodoPago = 'PPD';
      if (filtros.estadoComplemento === 'Emitido') {
        whereClause.NOT = {
          complementosPago: {
            equals: []
          }
        };
      } else if (filtros.estadoComplemento === 'Pendiente') {
        whereClause.OR = [
          { complementosPago: { equals: [] } },
          { complementosPago: { equals: null } }
        ];
      }
    }

    const facturasRaw = await prisma.factura.findMany({
      where: whereClause,
      select: {
        id: true,
        uuid: true,
        serie: true,
        folio: true,
        fechaEmision: true,
        metodoPago: true,
        estatus: true,
        subTotal: true,
        total: true,
        complementosPago: true,
        empresa: { select: { razonSocial: true } },
        cliente: { select: { razonSocial: true } }
      },
      orderBy: { fechaEmision: 'desc' }
    });

    const data = facturasRaw.map(f => ({
      'UUID': f.uuid || 'N/A',
      'Folio Interno': f.folio ? `${f.serie || ''}${f.folio}` : 'N/A',
      'Fecha Emisión': formatDateDDMMYYYY(f.fechaEmision),
      'Empresa Emisora': f.empresa?.razonSocial || 'Desconocida',
      'Cliente Receptor': f.cliente?.razonSocial || 'Desconocido',
      'SubTotal': f.subTotal,
      'Total': f.total,
      'Estatus': f.estatus,
      'Método de Pago': f.metodoPago || 'N/A',
      'Complementos': (f.metodoPago === 'PPD' && typeof f.complementosPago === 'object' && Array.isArray(f.complementosPago)) ? (f.complementosPago.length > 0 ? 'Con Complemento' : 'Pendiente') : 'N/A'
    }));

    return { success: true, data };
  } catch (error) {
    console.error("Error obteniendo datos para excel:", error);
    return { success: false, error: error.message };
  }
}
