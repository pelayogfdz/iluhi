'use server'

import prisma from '../../lib/prisma'
import { revalidatePath } from 'next/cache'

export async function fetchDocumentosSATHistory(filtros) {
  const { tab, empresaId, fechaInicio, fechaFin } = filtros

  // Default limit to 100 for safety, but in production we might use pagination
  const take = 100

  // Construir clausula WHERE para empresas
  const whereEmpresa = empresaId && empresaId !== 'ALL' ? { empresaId } : {}
  
  if (tab === 'facturas') {
    const whereClause = {
      ...whereEmpresa
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

    const facturas = await prisma.facturaEmitida.findMany({
      where: whereClause,
      select: {
        id: true,
        fechaEmision: true,
        uuid: true,
        receptorNombre: true,
        receptorRfc: true,
        total: true,
        estatus: true,
        empresa: { select: { rfc: true, razonSocial: true } }
      },
      orderBy: { fechaEmision: 'desc' },
      take
    })
    
    return { success: true, data: facturas.map(f => ({ ...f, hasFile: true })) }
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
      select: {
        id: true,
        fechaEmision: true,
        uuid: true,
        emisorNombre: true,
        emisorRfc: true,
        total: true,
        estatus: true,
        empresa: { select: { rfc: true, razonSocial: true } }
      },
      orderBy: { fechaEmision: 'desc' },
      take
    })
    
    return { success: true, data: facturasRecibidas.map(f => ({ ...f, hasFile: true })) }
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
    select: {
      id: true,
      fechaDocumento: true,
      tipo: true,
      descripcion: true,
      empresaId: true,
      createdAt: true,
      empresa: { select: { rfc: true, razonSocial: true } }
    },
    orderBy: { fechaDocumento: 'desc' },
    take
  })

  revalidatePath('/descargas-sat')

  return { success: true, data: documentos.map(d => ({ ...d, hasFile: true })) }
}

export async function fetchBase64Documento(id, tab) {
  try {
    if (tab === 'facturas') {
      const doc = await prisma.facturaEmitida.findUnique({ where: { id }, select: { xmlBase64: true } })
      return { success: true, base64: doc?.xmlBase64 }
    } else if (tab === 'facturas_recibidas') {
      const doc = await prisma.facturaRecibida.findUnique({ where: { id }, select: { xmlBase64: true } })
      return { success: true, base64: doc?.xmlBase64 }
    } else {
      const doc = await prisma.documentoSat.findUnique({ where: { id }, select: { archivoBase64: true } })
      return { success: true, base64: doc?.archivoBase64 }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getEmpresasSelector() {
  return await prisma.empresa.findMany({
    select: { id: true, razonSocial: true, rfc: true },
    orderBy: { razonSocial: 'asc' }
  })
}

export async function subirOpinionManual(empresaId, fileBase64) {
  try {
    if (!empresaId || empresaId === 'ALL') {
      return { success: false, error: 'Selecciona una empresa específica.' }
    }
    
    // Asumimos que la opinión que suben es positiva y actualizada
    await prisma.documentoSat.create({
      data: {
        tipo: 'OPINION',
        descripcion: 'POSITIVA', // Se puede mejorar para detectar negativa con OCR, pero se asume Positiva de momento
        archivoBase64: fileBase64,
        empresaId
      }
    })
    
    // Reflejamos en la vista principal de la empresa
    await prisma.empresa.update({
      where: { id: empresaId },
      data: { opinionCumplimiento: 'POSITIVA', ultimaValidacionOpinion: new Date() }
    })
    
    revalidatePath('/descargas-sat')
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
