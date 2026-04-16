'use server'

import prisma from '../../lib/prisma'

export async function fetchDocumentosSATHistory(filtros) {
  const { tab, empresaId, fechaInicio, fechaFin } = filtros

  // Default limit to 100 for safety, but in production we might use pagination
  const take = 100

  // Construir clausula WHERE para empresas
  const whereEmpresa = empresaId && empresaId !== 'ALL' ? { empresaId } : {}
  
  if (tab === 'facturas') {
    const whereClause = {
      ...whereEmpresa,
      xmlBase64: { not: null }
    }
    
    if (fechaInicio || fechaFin) {
      whereClause.fechaEmision = {}
      if (fechaInicio) whereClause.fechaEmision.gte = new Date(fechaInicio)
      if (fechaFin) {
        let endDate = new Date(fechaFin)
        endDate.setHours(23, 59, 59, 999)
        whereClause.fechaEmision.lte = endDate
      }
    }

    const facturas = await prisma.factura.findMany({
      where: whereClause,
      include: { empresa: { select: { rfc: true, razonSocial: true } } },
      orderBy: { fechaEmision: 'desc' },
      take
    })
    
    return { success: true, data: facturas }
  }

  if (tab === 'facturas_recibidas') {
    const whereClauseRecibidas = { ...whereEmpresa }
    
    if (fechaInicio || fechaFin) {
      whereClauseRecibidas.fechaEmision = {}
      if (fechaInicio) whereClauseRecibidas.fechaEmision.gte = new Date(fechaInicio)
      if (fechaFin) {
        let endDate = new Date(fechaFin)
        endDate.setHours(23, 59, 59, 999)
        whereClauseRecibidas.fechaEmision.lte = endDate
      }
    }

    const facturasRecibidas = await prisma.facturaRecibida.findMany({
      where: whereClauseRecibidas,
      include: { empresa: { select: { rfc: true, razonSocial: true } } },
      orderBy: { fechaEmision: 'desc' },
      take
    })
    
    return { success: true, data: facturasRecibidas }
  }

  // Para CONSTANCIAS, OPINIONES, BUZON usamos la tabla DocumentoSat
  const tipoMapeo = {
    'constancias': 'CONSTANCIA',
    'opiniones': 'OPINION',
    'buzon': 'BUZON'
  }
  
  const tipoDB = tipoMapeo[tab]
  if (!tipoDB) return { success: false, error: 'Tab no reconocido' }

  const whereDoc = {
    ...whereEmpresa,
    tipo: tipoDB
  }

  if (fechaInicio || fechaFin) {
    whereDoc.fechaDocumento = {}
    if (fechaInicio) whereDoc.fechaDocumento.gte = new Date(fechaInicio)
    if (fechaFin) {
      let endDate = new Date(fechaFin)
      endDate.setHours(23, 59, 59, 999)
      whereDoc.fechaDocumento.lte = endDate
    }
  }

  const documentos = await prisma.documentoSat.findMany({
    where: whereDoc,
    include: { empresa: { select: { rfc: true, razonSocial: true } } },
    orderBy: { fechaDocumento: 'desc' },
    take
  })

  return { success: true, data: documentos }
}

export async function getEmpresasSelector() {
  return await prisma.empresa.findMany({
    select: { id: true, razonSocial: true, rfc: true },
    orderBy: { razonSocial: 'asc' }
  })
}
