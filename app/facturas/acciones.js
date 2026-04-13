'use server'
import prisma from '../../lib/prisma';




import facturapi from '../../lib/facturapi'



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

    // 1.5 Auto-Guardado de Productos Al Vuelo
    // Si la descripción del concepto fue alterada en el formulario y no existe en el catálogo, lo creamos.
    for (const i of items) {
      if (i.id) { // Solo los que se heredaron del catálogo
        const existe = await prisma.producto.findFirst({
           where: { empresaId: empresaId, descripcion: i.descripcion }
        });
        
        if (!existe) {
          console.log("Detectado nuevo producto al facturar, guardando:", i.descripcion);
          await prisma.producto.create({
            data: {
              empresaId: empresaId,
              noIdentificacion: 'GEN-' + Math.floor(Math.random() * 90000 + 10000),
              descripcion: i.descripcion,
              claveProdServ: i.claveProdServ,
              claveUnidad: i.claveUnidad || 'H87', //Fallback
              precio: parseFloat(i.precio),
              impuesto: i.impuesto,
              tasaOCuota: i.tasaOCuota
            }
          });
        }
      }
    }

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

    // 5. Encolar tareas de envío de correo en la Base de Datos
    if (cliente.correoDestino) {
       const now = new Date();
       await prisma.emailTask.createMany({
         data: [
           { facturaId: newFactura.id, type: 'COTIZACION', scheduledFor: now },
           { facturaId: newFactura.id, type: 'ORDEN_SERVICIO', scheduledFor: new Date(now.getTime() + 10 * 60000) },
           { facturaId: newFactura.id, type: 'FACTURA', scheduledFor: new Date(now.getTime() + 15 * 60000) }
         ]
       });
    }

    return { success: true, facturaId: newFactura.id, status: fallbackStatus };
  } catch (error) {
    console.error("Error catastrofico elaborando CFDI: ", error);
    return { success: false, error: 'Excepción del Servidor: ' + error.message };
  }
}
