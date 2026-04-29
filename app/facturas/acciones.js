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
          zip: cliente.codigoPostal,
          street: cliente.calle || undefined,
          exterior: cliente.numExterior || undefined,
          interior: cliente.numInterior || undefined,
          neighborhood: cliente.colonia || undefined,
          city: cliente.ciudad || undefined,
          municipality: cliente.municipio || undefined,
          state: cliente.estado || undefined
        }
      },
      items: items.map((i) => {
        const itemPayload = {
          product: {
            description: i.descripcion,
            product_key: i.claveProdServ,
            price: parseFloat(i.precio),
            tax_included: false,
            unit_key: i.claveUnidad || 'H87'
          },
          quantity: parseInt(i.cantidad)
        };

        if ((i.impuesto === '002' || i.impuesto === '003') && i.tasaOCuota !== null && i.tasaOCuota !== '') {
          itemPayload.product.taxes = [
            {
              type: i.impuesto === '002' ? 'IVA' : 'IEPS',
              rate: parseFloat(i.tasaOCuota)
            }
          ];
        }
        return itemPayload;
      }),
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
    // Si no hay CSD cargado, Facturapi rechazará el timbrado Live. Hacemos fallback automático a Test Mode.
    const activeTenantKey = (empresa.cerPath && empresa.facturapiLiveKey) 
      ? empresa.facturapiLiveKey 
      : (empresa.facturapiTestKey || process.env.FACTURAPI_LIVE_KEY);
    
    if (activeTenantKey && !activeTenantKey.includes('PENDING_KEY')) {
      try {
        const tenantFacturapi = new facturapi.constructor(activeTenantKey); // Use the constructor from the imported instance
        receipt = await tenantFacturapi.invoices.create(facturaPayload);
        fallbackStatus = 'Timbrada';
      } catch (pacError) {
        if (pacError.message && (pacError.message.includes('terminar de configurar') || pacError.message.includes('pending steps'))) {
          console.log("Facturapi rechazó Live por falta de CSD real. Intentando con Test Key...");
          const fallbackKey = empresa.facturapiTestKey || process.env.FACTURAPI_TEST_KEY || process.env.FACTURAPI_LIVE_KEY;
          const testFacturapi = new facturapi.constructor(fallbackKey);
          try {
            receipt = await testFacturapi.invoices.create(facturaPayload);
            fallbackStatus = 'Timbrada (Test Fallback)';
          } catch(fallbackErr) {
             const errorMsg = fallbackErr.response?.data?.message || fallbackErr.message || "Error desconocido";
             console.error("Fallo de API del PAC (Fallback Test): ", errorMsg);
             return { success: false, error: 'Error del SAT/PAC: ' + errorMsg }
          }
        } else {
          const errorMsg = pacError.response?.data?.message || pacError.message || "Error desconocido";
          console.error("Fallo de API del PAC: ", errorMsg);
          return { success: false, error: 'Error del SAT/PAC: ' + errorMsg }
        }
      }
    } else {
      console.log("[SIMULACION PAC] No hay llave válida de Facturapi activa. Omitiendo la red...");
      receipt = { id: 'mock_uuid_' + Math.floor(Math.random() * 1000000), status: 'valid', created_at: new Date() };
      fallbackStatus = 'Borrador (Falta LLave)';
    }

    // 4. Salvar el Comprobante Logístico a Supabase
    // Sumarizaciones reales (Facturapi recalcula en producción, esto es referencial interno)
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

    const newFactura = await prisma.factura.create({
      data: {
        empresaId,
        clienteId,
        formaPago,
        metodoPago,
        subTotal: sumTotal,
        totalImpuestosTrasladados: totalImpuestosTrasladados,
        total: totalCalculado,
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

    const activeTenantKey = (fac.empresa.cerPath && fac.empresa.facturapiLiveKey)
      ? fac.empresa.facturapiLiveKey 
      : (fac.empresa.facturapiTestKey || process.env.FACTURAPI_LIVE_KEY);

    if (activeTenantKey && !activeTenantKey.includes('PENDING_KEY')) {
      const payload = { motive: motivo };
      if (motivo === '01') payload.substitution = uuidSustitucion;
      
      try {
        const tenantFacturapi = new facturapi.constructor(activeTenantKey);
        await tenantFacturapi.invoices.cancel(fac.uuid, payload);
        } catch (pacError) {
        if (pacError.message && (pacError.message.includes('terminar de configurar') || pacError.message.includes('pending steps'))) {
          console.log("Facturapi rechazó Live por falta de CSD real. Cancelando con Test Key...");
          const fallbackKey = fac.empresa.facturapiTestKey || process.env.FACTURAPI_TEST_KEY || process.env.FACTURAPI_LIVE_KEY;
          const testFacturapi = new facturapi.constructor(fallbackKey);
          await testFacturapi.invoices.cancel(fac.uuid, payload);
        } else {
          const errorMsg = pacError.response?.data?.message || pacError.message || "Error desconocido";
          throw new Error(errorMsg);
        }
      }
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

    const activeTenantKey = (fac.empresa.cerPath && fac.empresa.facturapiLiveKey)
      ? fac.empresa.facturapiLiveKey 
      : (fac.empresa.facturapiTestKey || process.env.FACTURAPI_LIVE_KEY);

    if (activeTenantKey && !activeTenantKey.includes('PENDING_KEY')) {
      const payload = {
        type: 'P',
        customer: fac.clienteId ? {
          legal_name: fac.cliente?.razonSocial || 'Público General',
          tax_id: fac.cliente?.rfc || 'XAXX010101000',
          tax_system: fac.cliente?.regimen || '616',
          email: fac.cliente?.correoDestino || '',
          address: {
            zip: fac.cliente?.codigoPostal || '00000',
            street: fac.cliente?.calle || undefined,
            exterior: fac.cliente?.numExterior || undefined,
            interior: fac.cliente?.numInterior || undefined,
            neighborhood: fac.cliente?.colonia || undefined,
            city: fac.cliente?.ciudad || undefined,
            municipality: fac.cliente?.municipio || undefined,
            state: fac.cliente?.estado || undefined
          }
        } : undefined,
        complements: [
          {
            type: 'pago',
            data: [
              {
                payment_form: formaPago,
                date: fechaPago ? new Date(fechaPago).toISOString() : new Date().toISOString(),
                currency: moneda || 'MXN',
                exchange: parseFloat(tipoCambio) || 1,
                numOperacion: numOperacion || undefined,
                related_documents: [
                  {
                    document: fac.uuid,
                    amount: parseFloat(montoAbonado),
                    installment: 1
                  }
                ]
              }
            ]
          }
        ]
      };

      try {
        const tenantFacturapi = new facturapi.constructor(activeTenantKey);
        await tenantFacturapi.invoices.create(payload);
        } catch (pacError) {
        if (pacError.message && (pacError.message.includes('terminar de configurar') || pacError.message.includes('pending steps'))) {
          console.log("Facturapi rechazó Live por falta de CSD real. Emitiendo Complemento con Test Key...");
          const fallbackKey = fac.empresa.facturapiTestKey || process.env.FACTURAPI_TEST_KEY || process.env.FACTURAPI_LIVE_KEY;
          const testFacturapi = new facturapi.constructor(fallbackKey);
          await testFacturapi.invoices.create(payload);
        } else {
          const errorMsg = pacError.response?.data?.message || pacError.message || "Error desconocido";
          throw new Error(errorMsg);
        }
      }
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

    const activeTenantKey = (fac.empresa.cerPath && fac.empresa.facturapiLiveKey)
      ? fac.empresa.facturapiLiveKey 
      : (fac.empresa.facturapiTestKey || process.env.FACTURAPI_LIVE_KEY);

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
            zip: fac.cliente.codigoPostal,
            street: fac.cliente.calle || undefined,
            exterior: fac.cliente.numExterior || undefined,
            interior: fac.cliente.numInterior || undefined,
            neighborhood: fac.cliente.colonia || undefined,
            city: fac.cliente.ciudad || undefined,
            municipality: fac.cliente.municipio || undefined,
            state: fac.cliente.estado || undefined
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
            documents: [fac.uuid]
          }
        ]
      };

      try {
        const tenantFacturapi = new facturapi.constructor(activeTenantKey);
        receipt = await tenantFacturapi.invoices.create(payload);
        fallbackStatus = 'Nota de Crédito Generada';
      } catch (pacError) {
        if (pacError.message && (pacError.message.includes('terminar de configurar') || pacError.message.includes('pending steps'))) {
          console.log("Facturapi rechazó Live por falta de CSD real. Emitiendo Nota de Crédito con Test Key...");
          const fallbackKey = fac.empresa.facturapiTestKey || process.env.FACTURAPI_TEST_KEY || process.env.FACTURAPI_LIVE_KEY;
          const testFacturapi = new facturapi.constructor(fallbackKey);
          receipt = await testFacturapi.invoices.create(payload);
          fallbackStatus = 'Nota de Crédito Generada (Test Fallback)';
        } else {
          const errorMsg = pacError.response?.data?.message || pacError.message || "Error desconocido";
          throw new Error(errorMsg);
        }
      }
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
    const errorMsg = error.response?.data?.message || error.message || "Error desconocido";
    console.error("Error al emitir Nota de Crédito: ", errorMsg);
    return { success: false, error: errorMsg };
  }
}


