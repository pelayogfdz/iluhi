"use server";

import prisma from "../../lib/prisma";
import { revalidatePath } from "next/cache";

export async function registrarPagoFlujo(datos) {
  try {
    const pago = await prisma.pagoFlujo.create({
      data: {
        banco: datos.banco,
        monto: parseFloat(datos.monto),
        fechaPago: new Date(datos.fechaPago),
        horaPago: datos.horaPago,
        empresaId: datos.empresaId,
        clienteId: datos.clienteId || null,
        estatus: "Pendiente"
      }
    });
    
    revalidatePath("/flujo-trabajo");
    return { success: true, pago };
  } catch (error) {
    console.error("Error al registrar pago:", error);
    return { success: false, error: "Error al guardar el pago" };
  }
}

export async function obtenerPagosPendientes() {
  try {
    const pagos = await prisma.pagoFlujo.findMany({
      where: { estatus: "Pendiente" },
      include: { empresa: true, cliente: true },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, pagos };
  } catch (error) {
    console.error("Error al obtener pagos:", error);
    return { success: false, error: "Error al cargar pagos" };
  }
}

export async function obtenerPagosAsignados() {
  try {
    const pagos = await prisma.pagoFlujo.findMany({
      where: { estatus: "Asignado" },
      include: {
        factura: {
          include: { cliente: true, empresa: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 50 // Solo mostrar los ultimos 50 para no saturar
    });
    return { success: true, pagos };
  } catch (error) {
    console.error("Error al obtener pagos asignados:", error);
    return { success: false, error: "Error al cargar pagos" };
  }
}

export async function asignarFacturaAPago(pagoId, facturaId) {
  try {
    const factura = await prisma.factura.findUnique({
      where: { id: facturaId },
      select: { clienteId: true }
    });

    const pago = await prisma.pagoFlujo.update({
      where: { id: pagoId },
      data: {
        facturaId: facturaId,
        clienteId: factura?.clienteId, // Heredar cliente si no tenía
        estatus: "Asignado"
      }
    });
    
    revalidatePath("/flujo-trabajo");
    return { success: true, pago };
  } catch (error) {
    console.error("Error al asignar pago:", error);
    return { success: false, error: "Error al asignar la factura al pago" };
  }
}

export async function eliminarPago(pagoId) {
  try {
    await prisma.pagoFlujo.delete({
      where: { id: pagoId }
    });
    revalidatePath("/flujo-trabajo");
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar pago:", error);
    return { success: false, error: "Error al eliminar el pago" };
  }
}
