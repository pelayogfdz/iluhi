'use server'
import prisma from '../../lib/prisma';






export async function actualizarCliente(id, data) {
  try {
    await prisma.cliente.update({
      where: { id },
      data: {
        rfc: data.rfc,
        razonSocial: data.razonSocial,
        regimen: data.regimen,
        codigoPostal: data.codigoPostal,
        usoCfdi: data.usoCfdi,
        calle: data.calle,
        numExterior: data.numExterior,
        numInterior: data.numInterior,
        colonia: data.colonia,
        municipio: data.municipio,
        ciudad: data.ciudad,
        estado: data.estado,
        correoDestino: data.correoDestino,
        contactoPrincipal: data.contactoPrincipal,
        telefono: data.telefono,
        condicionesPago: data.condicionesPago,
        cuentaBancaria: data.cuentaBancaria
      }
    });
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar cliente: ", error);
    return { success: false, error: error.message };
  }
}

export async function eliminarCliente(id) {
  try {
    await prisma.cliente.delete({
      where: { id }
    });
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar cliente: ", error);
    return { success: false, error: error.message };
  }
}

export async function subirEvidenciaCliente(clienteId, nombreArchivo, archivoBase64, categoria) {
  try {
    const doc = await prisma.archivoCliente.create({
      data: {
        clienteId,
        nombreArchivo,
        archivoBase64,
        categoria
      }
    });
    return { success: true, doc };
  } catch (error) {
    console.error("Error al subir archivo de cliente:", error);
    return { success: false, error: error.message };
  }
}

export async function eliminarEvidenciaCliente(archivoId, clienteId) {
  try {
    await prisma.archivoCliente.delete({
      where: {
        id: archivoId,
        clienteId: clienteId // safety check
      }
    });
    return { success: true };
  } catch (error) {
    console.error("Error eliminando evidencia cliente:", error);
    return { success: false, error: error.message };
  }
}
