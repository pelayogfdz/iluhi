'use server'

import prisma from '../../../../../lib/prisma'
import { revalidatePath } from 'next/cache'

export async function subirArchivoExpediente(empresaId, nombreArchivo, archivoBase64, categoria, tipoDocumento) {
  try {
    const doc = await prisma.archivoEmpresa.create({
      data: {
        empresaId,
        nombreArchivo,
        archivoBase64,
        categoria,
        tipoDocumento
      }
    })
    
    revalidatePath(`/empresas/editar/${empresaId}/expediente`)
    return { success: true, docId: doc.id }
  } catch (error) {
    console.error("Error al subir archivo de expediente:", error)
    return { error: 'Error al subir el archivo' }
  }
}

export async function eliminarArchivoExpediente(archivoId, empresaId) {
  try {
    await prisma.archivoEmpresa.delete({
      where: { id: archivoId }
    })
    
    revalidatePath(`/empresas/editar/${empresaId}/expediente`)
    return { success: true }
  } catch (error) {
    console.error("Error al eliminar archivo:", error)
    return { error: 'Error al eliminar el archivo' }
  }
}

export async function guardarTextosPlaneacion(empresaId, objetoSocial, actividadEconomica) {
  try {
    await prisma.empresa.update({
      where: { id: empresaId },
      data: {
        objetoSocial,
        actividadEconomica
      }
    })
    
    revalidatePath(`/empresas/editar/${empresaId}/expediente`)
    return { success: true }
  } catch (error) {
    console.error("Error al actualizar planeación:", error)
    return { error: 'Error al actualizar información' }
  }
}
