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
        correoDestino: data.correoDestino
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
