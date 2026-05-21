'use server'
export const maxDuration = 60;
import prisma from '../../lib/prisma';

import { buildPdfDocDefinition, createPdfBuffer } from '../../lib/pdfGenerator'

export async function guardarCotizacion(formDataRaw) {
  try {
    const { empresaId, clienteId, usoCfdi, formaPago, metodoPago, items, notasServicio } = formDataRaw;

    if (!items || items.length === 0) {
      return { success: false, error: 'Debe agregar al menos un concepto a la cotización.' }
    }

    let sumTotal = 0;
    let totalImpuestosTrasladados = 0;
    
    items.forEach(i => {
      const lineSub = parseFloat(i.precio) * parseInt(i.cantidad);
      sumTotal += lineSub;
      
      const tasa = parseFloat(i.tasaOCuota || 0.16);
      if (i.impuesto === '002' || !i.impuesto) {
        totalImpuestosTrasladados += (lineSub * tasa);
      }
    });

    const totalCalculado = sumTotal + totalImpuestosTrasladados;

    const newCotizacion = await prisma.cotizacion.create({
      data: {
        empresaId,
        clienteId,
        formaPago,
        metodoPago,
        usoCfdi,
        subTotal: sumTotal,
        totalImpuestosTrasladados: totalImpuestosTrasladados,
        total: totalCalculado,
        estatus: 'Borrador',
        notasServicio: notasServicio || null,
        productos: items // Guardamos el array de productos como JSON
      }
    });

    return { success: true, cotizacionId: newCotizacion.id };
  } catch (error) {
    console.error("Error guardando cotización: ", error);
    return { success: false, error: 'Excepción del Servidor: ' + error.message };
  }
}

export async function obtenerCotizacionesPendientes(empresaId) {
  try {
    const cotizaciones = await prisma.cotizacion.findMany({
      where: { 
        empresaId,
        estatus: { in: ['Borrador', 'Enviada', 'Aceptada'] } // Que no estén rechazadas ni ya facturadas
      },
      include: {
        cliente: {
          select: { razonSocial: true, rfc: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, cotizaciones };
  } catch(error) {
    console.error("Error obteniendo cotizaciones: ", error);
    return { success: false, error: error.message };
  }
}

export async function generarVistaPreviaCotizacion(formDataRaw) {
  try {
    const { empresaId, clienteId, items, notasServicio } = formDataRaw;

    if (!items || items.length === 0) {
      return { success: false, error: 'Agregue al menos un concepto para generar la vista previa.' }
    }

    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } })
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } })

    if (!empresa) return { success: false, error: 'Empresa emisora no encontrada.' }
    if (!cliente) return { success: false, error: 'Cliente receptor no encontrado.' }

    let sumTotal = 0;
    let totalImpuestosTrasladados = 0;
    
    const itemsTable = [
      [ { text: 'Cant', style: 'th' }, { text: 'U. Medida', style: 'th'}, { text: 'Concepto', style: 'th' }, { text: 'P. Unitario', style: 'th' }, { text: 'Importe', style: 'th' } ]
    ];

    items.forEach(i => {
      const cantidad = parseFloat(i.cantidad) || 0;
      const precio = parseFloat(i.precio) || 0;
      const lineSub = precio * cantidad;
      sumTotal += lineSub;
      
      const tasa = parseFloat(i.tasaOCuota || 0.16);
      if (i.impuesto === '002' || !i.impuesto) {
        totalImpuestosTrasladados += (lineSub * tasa);
      }

      itemsTable.push([
        cantidad.toString(),
        i.claveUnidad || 'H87',
        i.descripcion,
        `$${precio.toFixed(2)}`,
        `$${lineSub.toFixed(2)}`
      ]);
    });

    const totalCalculado = sumTotal + totalImpuestosTrasladados;

    const dummyFactura = {
      subTotal: sumTotal,
      totalImpuestosTrasladados: totalImpuestosTrasladados,
      total: totalCalculado,
      moneda: 'MXN',
      notasServicio: notasServicio,
      folioInterno: 'VISTA-PREVIA'
    };

    const totals = [
        { text: `Subtotal: $${dummyFactura.subTotal.toFixed(2)}`, margin: [0, 5, 0, 5], bold: true },
        { text: `Total Impuestos: $${dummyFactura.totalImpuestosTrasladados.toFixed(2)}`, margin: [0, 0, 0, 5] },
        { text: `TOTAL ESTIMADO: $${dummyFactura.total.toFixed(2)} ${dummyFactura.moneda}`, bold: true, fontSize: 14, color: empresa.colorPrimario || '#0054a6' }
    ];

    const docDefinition = buildPdfDocDefinition(dummyFactura, empresa, cliente, 'COTIZACION', itemsTable, totals, 'VISTA PREVIA - COTIZACIÓN');
    const pdfBuffer = await createPdfBuffer(docDefinition);

    return { success: true, base64: pdfBuffer.toString('base64') };
  } catch (error) {
    console.error("Error generando vista previa PDF: ", error);
    return { success: false, error: 'Error generando PDF: ' + error.message };
  }
}
