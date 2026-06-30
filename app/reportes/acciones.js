'use server'
import prisma from '../../lib/prisma';
import { getSessionUser } from '../../lib/auth';
import { formatDateDDMMYYYY } from '../../lib/date';
import facturapi from '../../lib/facturapi';

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

function decodeXmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x[a-fA-F0-9]+;/g, (match) => {
      const hex = match.substring(3, match.length - 1);
      return String.fromCharCode(parseInt(hex, 16));
    })
    .replace(/&#\d+;/g, (match) => {
      const dec = match.substring(2, match.length - 1);
      return String.fromCharCode(parseInt(dec, 10));
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function extractConceptsFromXml(xmlText) {
  const concepts = [];
  const conceptoRegex = /<[^>]*Concepto\s+([^>]*)\/?>/gi;
  let match;
  while ((match = conceptoRegex.exec(xmlText)) !== null) {
    const attrsStr = match[1];
    const claveProdServAttr = attrsStr.match(/ClaveProdServ\s*=\s*["']([^"']*)["']/i);
    const descripcionAttr = attrsStr.match(/Descripcion\s*=\s*["']([^"']*)["']/i);
    const importeAttr = attrsStr.match(/Importe\s*=\s*["']([^"']*)["']/i);
    
    concepts.push({
      claveProdServ: claveProdServAttr ? claveProdServAttr[1] : 'N/A',
      concepto: descripcionAttr ? descripcionAttr[1] : 'N/A',
      neto: importeAttr ? parseFloat(importeAttr[1]) : 0
    });
  }
  return concepts;
}

async function ensureXmlAndGetConcepts(f) {
  let xmlText = '';
  
  if (f.xmlBase64) {
    xmlText = Buffer.from(f.xmlBase64, 'base64').toString('utf8');
  } else {
    const isFacturapi = f.uuid && f.uuid.length !== 36 && !f.uuid.startsWith('sim_uuid') && !f.uuid.startsWith('mock_uuid');
    
    if (isFacturapi) {
      let targetKey = f.empresa.facturapiLiveKey || process.env.FACTURAPI_LIVE_KEY;
      if (f.estatus && f.estatus.includes('Test')) {
        targetKey = f.empresa.facturapiTestKey || process.env.FACTURAPI_TEST_KEY || process.env.FACTURAPI_LIVE_KEY;
      }
      
      if (targetKey && !targetKey.includes('PENDING_KEY')) {
        try {
          const tenantFacturapi = new facturapi.constructor(targetKey);
          const stream = await tenantFacturapi.invoices.downloadXml(f.uuid);
          
          const chunks = [];
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
          const xmlBuffer = Buffer.concat(chunks);
          xmlText = xmlBuffer.toString('utf8');
          const base64 = xmlBuffer.toString('base64');
          
          await prisma.factura.update({
            where: { id: f.id },
            data: { xmlBase64: base64 }
          }).catch(err => console.error("Error caching xmlBase64:", err));
        } catch (apiError) {
          console.error(`Error downloading XML for invoice ${f.uuid} from Facturapi:`, apiError.message);
        }
      }
    }
  }
  
  if (xmlText) {
    return extractConceptsFromXml(xmlText);
  }
  
  return [{
    claveProdServ: '80141600',
    concepto: f.notasServicio || 'Concepto General / Factura Importada',
    neto: f.subTotal
  }];
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
        xmlBase64: true,
        complementosPago: true,
        notasServicio: true,
        empresa: {
          select: {
            razonSocial: true,
            facturapiLiveKey: true,
            facturapiTestKey: true
          }
        },
        cliente: { select: { razonSocial: true } }
      },
      orderBy: { fechaEmision: 'desc' }
    });

    const uniqueClaves = new Set();
    for (const f of facturasRaw) {
      const concepts = await ensureXmlAndGetConcepts(f);
      f.concepts = concepts;
      concepts.forEach(c => {
        if (c.claveProdServ && c.claveProdServ !== 'N/A') {
          uniqueClaves.add(c.claveProdServ);
        }
      });
    }

    // Resolve descriptions in batch
    const cachedCatalog = await prisma.satCatalogoProducto.findMany({
      where: { clave: { in: Array.from(uniqueClaves) } }
    });
    const catalogMap = {};
    cachedCatalog.forEach(item => {
      catalogMap[item.clave] = item.descripcion;
    });

    const missingKeys = Array.from(uniqueClaves).filter(k => !catalogMap[k]);
    if (missingKeys.length > 0) {
      const sampleCompany = facturasRaw.find(f => f.empresa.facturapiLiveKey)?.empresa;
      let targetKey = sampleCompany?.facturapiLiveKey || process.env.FACTURAPI_LIVE_KEY;
      if (targetKey && !targetKey.includes('PENDING_KEY')) {
        const tenantFacturapi = new facturapi.constructor(targetKey);
        for (const key of missingKeys) {
          try {
            const res = await tenantFacturapi.catalogs.searchProducts({ q: key });
            if (res && res.data && res.data.length > 0) {
              const item = res.data.find(d => d.key === key) || res.data[0];
              const desc = item.description || item.name || item.label || 'N/A';
              catalogMap[key] = desc;
              
              await prisma.satCatalogoProducto.create({
                data: { clave: key, descripcion: desc }
              }).catch(() => {});
            }
          } catch (err) {
            console.error(`Error fetching key ${key} from Facturapi:`, err.message);
          }
        }
      }
    }

    const data = [];
    for (const f of facturasRaw) {
      for (const c of f.concepts) {
        data.push({
          'Fecha': formatDateDDMMYYYY(f.fechaEmision),
          'UUID': f.uuid || 'N/A',
          'Folio': f.folio ? `${f.serie || ''}${f.folio}` : 'Sin Folio',
          'Razón Social': f.cliente?.razonSocial || 'N/A',
          'Clave Prod/Serv': c.claveProdServ,
          'Descripción': catalogMap[c.claveProdServ] || 'N/A',
          'Concepto': decodeXmlEntities(c.concepto),
          'Neto': c.neto,
          'Total Factura': f.total,
          'Método de Pago': f.metodoPago || 'N/A',
          'Estatus': f.estatus || 'N/A',
          'Complementos': (f.metodoPago === 'PPD' && typeof f.complementosPago === 'object' && Array.isArray(f.complementosPago)) ? (f.complementosPago.length > 0 ? 'Con Complemento' : 'Pendiente') : 'N/A'
        });
      }
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error obteniendo datos para excel:", error);
    return { success: false, error: error.message };
  }
}
