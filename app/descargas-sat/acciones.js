'use server'

import prisma from '../../lib/prisma'
import { revalidatePath } from 'next/cache'
import pdfParse from 'pdf-parse'

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
    'imss': 'OPINION_IMSS',
    'infonavit': 'OPINION_INFONAVIT',
    'isn': 'OPINION_ISN',
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

export async function subirOpinionManual(empresaId, fileBase64, tipoDocumento = 'OPINION') {
  try {
    if (!empresaId || empresaId === 'ALL') {
      return { success: false, error: 'Selecciona una empresa específica.' }
    }
    
    let descripcion = 'POSITIVA';
    if (tipoDocumento === 'CONSTANCIA') {
      descripcion = 'Constancia de Situación Fiscal';
    } else if (tipoDocumento === 'BUZON') {
      descripcion = 'Notificación de Buzón Tributario';
    }

    await prisma.documentoSat.create({
      data: {
        tipo: tipoDocumento,
        descripcion: descripcion,
        archivoBase64: fileBase64,
        empresaId
      }
    })
    
    // Reflejamos en la vista principal de la empresa solo si es una opinión
    if (tipoDocumento === 'OPINION') {
      await prisma.empresa.update({
        where: { id: empresaId },
        data: { opinionCumplimiento: 'POSITIVA', ultimaValidacionOpinion: new Date() }
      })
    }

    // Si es CONSTANCIA, extraemos la actividad económica
    if (tipoDocumento === 'CONSTANCIA') {
      try {
        const base64Data = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
        const pdfBuffer = Buffer.from(base64Data, 'base64');
        const pdfData = await pdfParse(pdfBuffer);
        const text = pdfData.text;

        // Búsqueda simple de Actividades Económicas
        const keyword = 'Actividades Económicas';
        const index = text.indexOf(keyword);
        if (index !== -1) {
          // Extraemos un bloque razonable de texto donde debería venir la actividad
          let snippet = text.substring(index, index + 800).trim();
          
          await prisma.empresa.update({
            where: { id: empresaId },
            data: { actividadEconomica: snippet }
          });
        }
      } catch (pdfErr) {
        console.error("Error extrayendo texto del PDF CSF:", pdfErr);
      }
    }
    
    revalidatePath('/descargas-sat')
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
