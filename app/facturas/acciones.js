'use server'

import { PrismaClient } from '@prisma/client'
import facturapi from '../../lib/facturapi'

const prisma = new PrismaClient()

export async function prepararYTimbrarFactura(formDataRaw) {
  try {
    const { empresaId, clienteId, usoCfdi, formaPago, metodoPago, items } = formDataRaw;

    if (!items || items.length === 0) {
      return { success: false, error: 'Debe agregar al menos un concepto a la factura.' }
    }

    // 1. Obtener Entidades de la Base de Datos Local
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } })
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } })

    if (!empresa) return { success: false, error: 'Empresa emisora no encontrada.' }
    if (!cliente) return { success: false, error: 'Cliente receptor no encontrado.' }

    // 2. Transmutación al Motor JSON de Facturapi
    const facturaPayload = {
      customer: {
        legal_name: cliente.razonSocial,
        tax_id: cliente.rfc,
        tax_system: cliente.regimen,
        email: cliente.correoDestino || '',
        address: {
          zip: cliente.codigoPostal
        }
      },
      items: items.map((i) => ({
        product: {
          description: i.descripcion,
          product_key: i.claveProdServ,
          price: parseFloat(i.precio),
          tax_included: false,
          taxes: [
            {
              type: i.impuesto === '002' ? 'IVA' : i.impuesto === '001' ? 'ISR' : 'IEPS',
              rate: parseFloat(i.tasaOCuota)
            }
          ],
          unit_key: i.claveUnidad
        },
        quantity: parseInt(i.cantidad)
      })),
      use: usoCfdi,
      payment_form: formaPago,
      payment_method: metodoPago
    };

    console.log("PAYLOAD REDIRIGIDO A FACTURAPI: ", JSON.stringify(facturaPayload, null, 2));

    let receipt;
    let fallbackStatus = 'Borrador';

    // 3. Ejecutar Disparo al PAC
    // ENV guard condition
    if (process.env.FACTURAPI_KEY && !process.env.FACTURAPI_KEY.includes('PENDING_KEY')) {
      try {
        receipt = await facturapi.invoices.create(facturaPayload);
        fallbackStatus = 'Timbrada';
      } catch (pacError) {
        console.error("Fallo de API del PAC: ", pacError);
        return { success: false, error: 'Error del SAT/PAC: ' + (pacError.message || JSON.stringify(pacError)) }
      }
    } else {
      console.log("[SIMULACION PAC] No hay llave válida de Facturapi activa. Omitiendo la red...");
      receipt = { id: 'mock_uuid_123', status: 'valid', created_at: new Date() };
      fallbackStatus = 'Borrador (Falta LLave)';
    }

    // 4. Salvar el Comprobante Logístico a Supabase
    // Sumarizaciones simples (Facturapi recalcula en producción, esto es solo referencial interno)
    let sumTotal = 0;
    items.forEach(i => sumTotal += (parseFloat(i.precio) * parseInt(i.cantidad)));

    const newFactura = await prisma.factura.create({
      data: {
        empresaId,
        clienteId,
        formaPago,
        metodoPago,
        subTotal: sumTotal,
        totalImpuestosTrasladados: 0, // Placeholder
        total: sumTotal, // Placeholder
        estatus: fallbackStatus,
        uuid: receipt.id || null
      }
    });

    return { success: true, facturaId: newFactura.id, status: fallbackStatus };
  } catch (error) {
    console.error("Error catastrofico elaborando CFDI: ", error);
    return { success: false, error: 'Excepción del Servidor: ' + error.message };
  }
}
