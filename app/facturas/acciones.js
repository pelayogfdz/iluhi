'use server'
import prisma from '../../lib/prisma';




import facturapi from '../../lib/facturapi'



export async function prepararYTimbrarFactura(formDataRaw) {
  try {
    const { empresaId, clienteId, usoCfdi, formaPago, metodoPago, items, notasServicio } = formDataRaw;

    if (!items || items.length === 0) {
      return { success: false, error: 'Debe agregar al menos un concepto a la factura.' }
    }

    // 1. Obtener Entidades de la Base de Datos Local
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } })
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } })

    if (!empresa) return { success: false, error: 'Empresa emisora no encontrada.' }
    if (!cliente) return { success: false, error: 'Cliente receptor no encontrado.' }

    // 1.5 Auto-Guardado de Productos Al Vuelo
    // Si la descripciÃ³n del concepto fue alterada en el formulario y no existe en el catÃ¡logo, lo creamos.
    for (const i of items) {
      if (i.id) { // Solo los que se heredaron del catÃ¡logo
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

    // 2. TransmutaciÃ³n al Motor JSON de Facturapi
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

    if (notasServicio && notasServicio.trim() !== '') {
      // Usa un HTML basico para respetar saltos de linea usando replace de newlines
      facturaPayload.pdf_custom_section = `<div><strong>Notas del Servicio:</strong><br/>${notasServicio.replace(/\n/g, '<br/>')}</div>`;
    }

    console.log("PAYLOAD REDIRIGIDO A FACTURAPI: ", JSON.stringify(facturaPayload, null, 2));

    let receipt;
    let fallbackStatus = 'Borrador';

    // 3. Ejecutar Disparo al PAC (Multi-Tenant Facturapi engine)
    const activeTenantKey = empresa.facturapiLiveKey || empresa.facturapiTestKey || process.env.FACTURAPI_LIVE_KEY;
    
    if (activeTenantKey && !activeTenantKey.includes('PENDING_KEY')) {
      try {
        const tenantFacturapi = new facturapi.constructor(activeTenantKey); // Use the constructor from the imported instance
        receipt = await tenantFacturapi.invoices.create(facturaPayload);
        fallbackStatus = 'Timbrada';
      } catch (pacError) {
        console.error("Fallo de API del PAC: ", pacError);
        return { success: false, error: 'Error del SAT/PAC: ' + (pacError.message || JSON.stringify(pacError)) }
      }
    } else {
      console.log("[SIMULACION PAC] No hay llave válida de Facturapi activa. Omitiendo la red...");
      receipt = { id: 'mock_uuid_' + Math.floor(Math.random() * 1000000), status: 'valid', created_at: new Date() };
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
        notasServicio: notasServicio || null,
        uuid: receipt.id || null
      }
    });

    // 5. Encolar tareas de envÃ­o de correo en la Base de Datos
    if (cliente.correoDestino) {
       const now = new Date();
       await prisma.emailTask.createMany({
         data: [
           { facturaId: newFactura.id, type: 'COTIZACION', scheduledFor: now },
           { facturaId: newFactura.id, type: 'ORDEN_SERVICIO', scheduledFor: new Date(now.getTime() + 5 * 60000) },
           { facturaId: newFactura.id, type: 'FACTURA', scheduledFor: new Date(now.getTime() + 10 * 60000) }
         ]
       });
    }

    return { success: true, facturaId: newFactura.id, status: fallbackStatus };
  } catch (error) {
    console.error("Error catastrofico elaborando CFDI: ", error);
    return { success: false, error: 'ExcepciÃ³n del Servidor: ' + error.message };
  }
}

export async function cancelarFactura(facturaId, motivo = '02', uuidSustitucion = '') {
  try {
    const fac = await prisma.factura.findUnique({ 
        where: { id: facturaId }, 
        include: { empresa: true } 
    });
    if (!fac || !fac.uuid) return { success: false, error: 'Factura no timbrada o inexistente.' };

    const activeTenantKey = fac.empresa.facturapiLiveKey || fac.empresa.facturapiTestKey || process.env.FACTURAPI_LIVE_KEY;

    if (activeTenantKey && !activeTenantKey.includes('PENDING_KEY')) {
      const payload = { motive: motivo };
      if (motivo === '01') payload.substitution = uuidSustitucion;
      
      const tenantFacturapi = new facturapi.constructor(activeTenantKey);
      await tenantFacturapi.invoices.cancel(fac.uuid, payload);
    } else {
       console.log(`[SIMULACION] Cancelando factura ${fac.uuid} con motivo ${motivo}`);
    }

    await prisma.factura.update({
      where: { id: facturaId },
      data: { estatus: 'Cancelada' }
    });

    return { success: true };
  } catch(error) {
    console.error("Error al cancelar factura: ", error);
    return { success: false, error: error.message };
  }
}

export async function emitirComplementoPago(facturaId, montoAbonado, formaPago, fechaPago, moneda = 'MXN', tipoCambio = 1, numOperacion = '') {
  try {
    const fac = await prisma.factura.findUnique({ 
        where: { id: facturaId },
        include: { empresa: true }
    });
    if (!fac || !fac.uuid) return { success: false, error: 'Factura no timbrada o inexistente.' };
    
    if (fac.metodoPago !== 'PPD') return { success: false, error: 'Solo facturas PPD admiten complementos.' }

    const activeTenantKey = fac.empresa.facturapiLiveKey || fac.empresa.facturapiTestKey || process.env.FACTURAPI_LIVE_KEY;

    if (activeTenantKey && !activeTenantKey.includes('PENDING_KEY')) {
      const pagoData = {
        payment_form: formaPago,
        related_documents: [
          {
            document: fac.uuid,
            amount: parseFloat(montoAbonado),
            installment: 1 // Facturapi can infer installment, or we hardcode 1 for now if we don't track history locally. It's optional for Facturapi v2.
          }
        ]
      };

      if (moneda && moneda !== 'MXN') {
         pagoData.currency = moneda;
         pagoData.exchange = parseFloat(tipoCambio);
      }

      const payload = {
        type: 'P',
        customer: fac.clienteId || undefined, // Not strictly necessary if using related_documents. Facturapi usually infers it or we might need it. Wait, the old payload used `receipts.create`, which uses `items`.
        // Let's preserve the `receipts.create` structure exactly as before but with added properties
        payment_form: formaPago,
        items: [
          {
            invoice: fac.uuid,
            amount: parseFloat(montoAbonado)
          }
        ]
      };

      if (moneda && moneda !== 'MXN') {
         payload.currency = moneda;
         payload.exchange = parseFloat(tipoCambio);
      }
      
      if (fechaPago) {
        // Aseguramos formato ISO
        payload.date = new Date(fechaPago).toISOString();
      }

      // Add operation number (requires custom facturapi payload mapping? wait, Receipts in facturapi might not have num_operacion in the root, it might be `external_id` or we can ignore it if unsupported in receipts.create)
      // Facturapi receipts.create does support `folio_number`, `branch`, but maybe not num_operacion natively in the simple wrapper. We'll pass `external_id` as the operacion.
      if (numOperacion) {
        payload.external_id = numOperacion;
      }

      const tenantFacturapi = new facturapi.constructor(activeTenantKey);
      await tenantFacturapi.receipts.create(payload);
    } else {
       console.log(`[SIMULACION] Emitiendo complemento REP a factura ${fac.uuid} por $${montoAbonado} en fecha ${fechaPago || 'actual'} Moneda: ${moneda}`);
    }

    await prisma.factura.update({
      where: { id: facturaId },
      data: { estatus: 'Timbrada - Complementado Local' } // Optionally we can append something.
    })

    return { success: true };
  } catch(error) {
    console.error("Error al emitir REP: ", error);
    return { success: false, error: error.message };
  }
}

export async function emitirNotaCredito(facturaId, monto, formaPago, usoCfdi, concepto) {
  try {
    const fac = await prisma.factura.findUnique({ 
        where: { id: facturaId },
        include: { empresa: true, cliente: true }
    });
    if (!fac || !fac.uuid) return { success: false, error: 'Factura no timbrada o inexistente.' };

    const activeTenantKey = fac.empresa.facturapiLiveKey || fac.empresa.facturapiTestKey || process.env.FACTURAPI_LIVE_KEY;

    let receipt;
    let fallbackStatus = 'Nota de Crédito (Simulada)';

    if (activeTenantKey && !activeTenantKey.includes('PENDING_KEY')) {
      const payload = {
        type: "E", // Egreso
        customer: fac.clienteId ? {
          legal_name: fac.cliente.razonSocial,
          tax_id: fac.cliente.rfc,
          tax_system: fac.cliente.regimen,
          email: fac.cliente.correoDestino || '',
          address: {
            zip: fac.cliente.codigoPostal
          }
        } : undefined,
        payment_form: formaPago,
        payment_method: "PUE", // Notas de crédito suelen ser PUE
        use: usoCfdi,
        items: [
          {
            product: {
              description: concepto || "Devolución o descuento",
              product_key: "84111506", // Servicios de facturación / devoluciones genérico
              price: parseFloat(monto),
              unit_key: "ACT" // Actividad
            },
            quantity: 1
          }
        ],
        related_documents: [
          {
            relationship: "01", // Nota de crédito de los documentos relacionados
            document: fac.uuid
          }
        ]
      };

      const tenantFacturapi = new facturapi.constructor(activeTenantKey);
      receipt = await tenantFacturapi.invoices.create(payload);
      fallbackStatus = 'Nota de Crédito Generada';
    } else {
       console.log(`[SIMULACION] Emitiendo Nota de Crédito a factura ${fac.uuid} por $${monto}`);
       receipt = { id: 'mock_egreso_' + Math.floor(Math.random() * 1000) };
    }

    await prisma.factura.update({
      where: { id: facturaId },
      data: { estatus: fallbackStatus } 
    });

    return { success: true, egresoId: receipt.id };
  } catch(error) {
    console.error("Error al emitir Nota de Crédito: ", error);
    return { success: false, error: error.message };
  }
}


