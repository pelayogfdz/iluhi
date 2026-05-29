'use server'
import prisma from '../../lib/prisma';




import facturapi from '../../lib/facturapi'

import { buildPdfDocDefinition, createPdfBuffer } from '../../lib/pdfGenerator'

export async function prepararYTimbrarFactura(formDataRaw) {
  try {
    const { empresaId, clienteId, usoCfdi, formaPago, metodoPago, items, notasServicio, fechaTimbrado } = formDataRaw;

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
      items: (() => {
        const mappedItems = [];
        for (const i of items) {
          const priceVal = parseFloat(i.precio);
          const qtyVal = parseInt(i.cantidad);
          const rateVal = parseFloat(i.tasaOCuota || 0);

          if (i.impuesto === '002' && rateVal === 0.04) {
            // Automatically split international flight / 4% IVA into 25% gravado (at 16%) and 75% no objeto de impuesto
            mappedItems.push({
              product: {
                description: `${i.descripcion} (Parte Gravada 25%)`,
                product_key: i.claveProdServ,
                price: parseFloat((priceVal * 0.25).toFixed(4)),
                tax_included: false,
                taxability: '02',
                unit_key: i.claveUnidad || 'H87',
                taxes: [
                  {
                    type: 'IVA',
                    factor: 'Tasa',
                    rate: 0.16
                  }
                ]
              },
              quantity: qtyVal
            });

            mappedItems.push({
              product: {
                description: `${i.descripcion} (Parte No Gravada 75%)`,
                product_key: i.claveProdServ,
                price: parseFloat((priceVal * 0.75).toFixed(4)),
                tax_included: false,
                taxability: '01', // No objeto de impuesto
                unit_key: i.claveUnidad || 'H87'
              },
              quantity: qtyVal
            });
          } else {
            const itemPayload = {
              product: {
                description: i.descripcion,
                product_key: i.claveProdServ,
                price: priceVal,
                tax_included: false,
                taxability: i.objetoImp || '02',
                unit_key: i.claveUnidad || 'H87'
              },
              quantity: qtyVal
            };

            if (i.objetoImp === '02' || i.objetoImp === '03') {
              if (i.tipoFactor === 'Exento') {
                itemPayload.product.taxes = [
                  {
                    type: i.impuesto === '003' ? 'IEPS' : 'IVA',
                    factor: 'Exento'
                  }
                ];
              } else if (i.impuesto && (i.tipoFactor === 'Tasa' || i.tipoFactor === 'Cuota')) {
                const isRetencion = i.impuesto === '001';
                itemPayload.product.taxes = [
                  {
                    type: i.impuesto === '003' ? 'IEPS' : (i.impuesto === '001' ? 'ISR' : 'IVA'),
                    factor: i.tipoFactor,
                    rate: rateVal,
                    ...(isRetencion ? { withholding: true } : {})
                  }
                ];
              }
            }
            mappedItems.push(itemPayload);
          }
        }
        return mappedItems;
      })(),
      use: usoCfdi,
      payment_form: formaPago,
      payment_method: metodoPago
    };

    if (notasServicio && notasServicio.trim() !== '') {
      // Usa un HTML basico para respetar saltos de linea usando replace de newlines
      facturaPayload.pdf_custom_section = `<div><strong>Notas del Servicio:</strong><br/>${notasServicio.replace(/\n/g, '<br/>')}</div>`;
    }

    if (fechaTimbrado && fechaTimbrado.trim() !== '') {
      try {
        const customDate = new Date(fechaTimbrado);
        if (!isNaN(customDate.getTime())) {
          facturaPayload.date = customDate.toISOString();
        }
      } catch (err) {
        console.error("Error parseando fechaTimbrado:", err);
      }
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
          const isSubscriptionError = errorMsg.toLowerCase().includes('suscrip') || 
                                     errorMsg.toLowerCase().includes('plan') || 
                                     errorMsg.toLowerCase().includes('suscripcion');
          if (isSubscriptionError) {
            console.log("Error de suscripción en Facturapi al cancelar factura. Cancelando localmente en la base de datos.");
          } else {
            throw new Error(errorMsg);
          }
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

function extractTaxesFromXml(xmlText) {
  const taxes = [];
  const seen = new Set();
  
  // 1. Parse Traslados
  const trasladoRegex = /<[^>]*Traslado\s+([^>]*)\/?>/gi;
  let match;
  while ((match = trasladoRegex.exec(xmlText)) !== null) {
    const attrsStr = match[1];
    const baseAttr = attrsStr.match(/Base\s*=\s*["']([^"']*)["']/i);
    const impuestoAttr = attrsStr.match(/Impuesto\s*=\s*["']([^"']*)["']/i);
    const tasaAttr = attrsStr.match(/TasaOCuota\s*=\s*["']([^"']*)["']/i);
    const importeAttr = attrsStr.match(/Importe\s*=\s*["']([^"']*)["']/i);
    
    if (impuestoAttr && tasaAttr) {
      const base = baseAttr ? parseFloat(baseAttr[1]) : 0;
      const impuestoCode = impuestoAttr[1];
      const rate = parseFloat(tasaAttr[1]);
      const importe = importeAttr ? parseFloat(importeAttr[1]) : 0;
      
      let type = "IVA";
      if (impuestoCode === "001") type = "ISR";
      if (impuestoCode === "002") type = "IVA";
      if (impuestoCode === "003") type = "IEPS";
      
      const key = `${type}_${rate}_T`;
      if (!seen.has(key)) {
        seen.add(key);
        taxes.push({
          type,
          rate,
          withholding: false,
          originalBaseSum: base || (importe / (rate || 1))
        });
      } else {
        const existing = taxes.find(t => t.type === type && t.rate === rate && !t.withholding);
        if (existing) {
          existing.originalBaseSum += (base || (importe / (rate || 1)));
        }
      }
    }
  }

  // 2. Parse Retenciones
  const retencionRegex = /<[^>]*Retencion\s+([^>]*)\/?>/gi;
  while ((match = retencionRegex.exec(xmlText)) !== null) {
    const attrsStr = match[1];
    const baseAttr = attrsStr.match(/Base\s*=\s*["']([^"']*)["']/i);
    const impuestoAttr = attrsStr.match(/Impuesto\s*=\s*["']([^"']*)["']/i);
    const tasaAttr = attrsStr.match(/TasaOCuota\s*=\s*["']([^"']*)["']/i);
    const importeAttr = attrsStr.match(/Importe\s*=\s*["']([^"']*)["']/i);
    
    if (impuestoAttr && tasaAttr) {
      const base = baseAttr ? parseFloat(baseAttr[1]) : 0;
      const impuestoCode = impuestoAttr[1];
      const rate = parseFloat(tasaAttr[1]);
      const importe = importeAttr ? parseFloat(importeAttr[1]) : 0;
      
      let type = "IVA";
      if (impuestoCode === "001") type = "ISR";
      if (impuestoCode === "002") type = "IVA";
      if (impuestoCode === "003") type = "IEPS";
      
      const key = `${type}_${rate}_W`;
      if (!seen.has(key)) {
        seen.add(key);
        taxes.push({
          type,
          rate,
          withholding: true,
          originalBaseSum: base || (importe / (rate || 1))
        });
      } else {
        const existing = taxes.find(t => t.type === type && t.rate === rate && t.withholding);
        if (existing) {
          existing.originalBaseSum += (base || (importe / (rate || 1)));
        }
      }
    }
  }
  return taxes;
}

export async function emitirComplementoPago(facturaId, montoAbonado, formaPago, fechaPago, moneda = 'MXN', tipoCambio = 1, numOperacion = '') {
  try {
    const fac = await prisma.factura.findUnique({ 
        where: { id: facturaId },
        include: { empresa: true, cliente: true }
    });
    if (!fac || !fac.uuid) return { success: false, error: 'Factura no timbrada o inexistente.' };
    
    if (fac.metodoPago !== 'PPD') return { success: false, error: 'Solo facturas PPD admiten complementos.' }

    const activeTenantKey = (fac.empresa.cerPath && fac.empresa.facturapiLiveKey)
      ? fac.empresa.facturapiLiveKey 
      : (fac.empresa.facturapiTestKey || process.env.FACTURAPI_LIVE_KEY);

    if (activeTenantKey && !activeTenantKey.includes('PENDING_KEY')) {
      const tenantFacturapi = new facturapi.constructor(activeTenantKey);
      
      let originalInvoice = null;
      let realSatUuid = null;
      const isSatUuid = fac.uuid && fac.uuid.length === 36 && fac.uuid.includes('-');
      
      if (!isSatUuid) {
        originalInvoice = await tenantFacturapi.invoices.retrieve(fac.uuid).catch(() => null);
        if (originalInvoice) {
          realSatUuid = originalInvoice.uuid;
        }
      } else {
        realSatUuid = fac.uuid;
      }
      
      if (!realSatUuid) {
        return { success: false, error: 'No se pudo obtener el UUID del SAT para esta factura. Es posible que aún no esté timbrada.' };
      }

      // Calcular impuestos proporcionales (Requerido por SAT CFDI 4.0 al usar uuid directamente)
      const montoAbonadoFloat = parseFloat(montoAbonado);
      let taxObjectToSet = "01"; // 01 - No objeto de impuesto
      const relatedTaxes = [];
      
      if (originalInvoice && originalInvoice.items && originalInvoice.items.length > 0) {
        const invoiceTaxesMap = {};
        let totalBaseOriginal = 0;
        
        originalInvoice.items.forEach(item => {
           if (item.product && item.product.taxability !== "01" && item.product.taxes && item.product.taxes.length > 0) {
               taxObjectToSet = "02"; // 02 - Sí objeto de impuesto
               const itemBase = (item.product.price * item.quantity) - (item.discount || 0);
               totalBaseOriginal += itemBase;
               
               item.product.taxes.forEach(t => {
                   const key = `${t.type}_${t.rate}_${t.withholding ? 'W' : 'T'}`;
                   if (!invoiceTaxesMap[key]) {
                      invoiceTaxesMap[key] = {
                         type: t.type,
                         rate: t.rate,
                         withholding: t.withholding || false,
                         originalBaseSum: 0
                      };
                   }
                   invoiceTaxesMap[key].originalBaseSum += itemBase;
               });
           }
        });

        // Aplicar factor de proporción: Pago Actual / Total de la Factura
        const propFactor = originalInvoice.total > 0 ? (montoAbonadoFloat / originalInvoice.total) : 0;
        
        Object.values(invoiceTaxesMap).forEach(t => {
           relatedTaxes.push({
               type: t.type,
               rate: t.rate,
               withholding: t.withholding,
               base: parseFloat((t.originalBaseSum * propFactor).toFixed(6))
           });
        });
      } else {
        // Fallback para facturas importadas/locales (cuando originalInvoice es null en Facturapi)
        let parsedTaxes = [];
        if (fac.xmlBase64) {
          try {
            const xmlText = Buffer.from(fac.xmlBase64, 'base64').toString('utf8');
            parsedTaxes = extractTaxesFromXml(xmlText);
          } catch (xmlError) {
            console.error("Error parsing xmlBase64: ", xmlError);
          }
        }
        
        if (parsedTaxes.length > 0) {
          taxObjectToSet = "02";
          const propFactor = fac.total > 0 ? (montoAbonadoFloat / fac.total) : 0;
          parsedTaxes.forEach(t => {
            relatedTaxes.push({
              type: t.type,
              rate: t.rate,
              withholding: t.withholding,
              base: parseFloat((t.originalBaseSum * propFactor).toFixed(6))
            });
          });
        } else if (fac.totalImpuestosTrasladados > 0) {
          taxObjectToSet = "02";
          const propFactor = fac.total > 0 ? (montoAbonadoFloat / fac.total) : 0;
          relatedTaxes.push({
            type: "IVA",
            rate: 0.16,
            withholding: false,
            base: parseFloat((fac.subTotal * propFactor).toFixed(6))
          });
        }
      }

      const existingComplements = Array.isArray(fac.complementosPago) ? [...fac.complementosPago] : [];
      const previousPaymentsSum = existingComplements.reduce((sum, comp) => sum + parseFloat(comp.amount || 0), 0);
      const computedLastBalance = fac.total - previousPaymentsSum;

      const relatedDocPayload = {
        uuid: realSatUuid,
        amount: montoAbonadoFloat,
        installment: existingComplements.length + 1,
        last_balance: originalInvoice ? (originalInvoice.amount_due || originalInvoice.total || montoAbonadoFloat) : computedLastBalance
      };
      
      // Facturapi requiere declarar los impuestos desglosados (pero no el tax_object manualmente)
      if (taxObjectToSet === "02" && relatedTaxes.length > 0) {
          relatedDocPayload.taxes = relatedTaxes;
      }

      const payload = {
        type: 'P',
        customer: fac.cliente ? {
          legal_name: fac.cliente.razonSocial || 'Público General',
          tax_id: fac.cliente.rfc || 'XAXX010101000',
          tax_system: fac.cliente.regimen || '616',
          email: fac.cliente.correoDestino || '',
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
                related_documents: [relatedDocPayload]
              }
            ]
          }
        ]
      };

      let newReceipt = null;
      try {
        const tenantFacturapi = new facturapi.constructor(activeTenantKey);
        newReceipt = await tenantFacturapi.invoices.create(payload);
      } catch (pacError) {
        if (pacError.message && (pacError.message.includes('terminar de configurar') || pacError.message.includes('pending steps'))) {
          console.log("Facturapi rechazó Live por falta de CSD real. Emitiendo Complemento con Test Key...");
          const fallbackKey = fac.empresa.facturapiTestKey || process.env.FACTURAPI_TEST_KEY || process.env.FACTURAPI_LIVE_KEY;
          const testFacturapi = new facturapi.constructor(fallbackKey);
          newReceipt = await testFacturapi.invoices.create(payload);
        } else {
          const errorMsg = pacError.response?.data?.message || pacError.message || "Error desconocido";
          throw new Error(errorMsg);
        }
      }

      if (newReceipt) {
        existingComplements.push({
          id: newReceipt.id,
          uuid: newReceipt.uuid,
          amount: parseFloat(montoAbonado),
          date: new Date().toISOString()
        });
      }

      await prisma.factura.update({
        where: { id: facturaId },
        data: { 
          estatus: newReceipt && newReceipt.status === 'valid' ? 'Timbrada - Complementado Local' : 'Timbrada (Test Fallback) - Complementado',
          complementosPago: existingComplements
        }
      })
    } else {
       console.log(`[SIMULACION] Emitiendo complemento REP a factura ${fac.uuid} por $${montoAbonado} en fecha ${fechaPago || 'actual'} Moneda: ${moneda}`);
       
       const existingComplements = Array.isArray(fac.complementosPago) ? [...fac.complementosPago] : [];
       existingComplements.push({
         id: `sim_comp_${Date.now()}`,
         uuid: `sim_uuid_${Date.now()}`,
         amount: parseFloat(montoAbonado),
         date: new Date().toISOString(),
         simulated: true
       });

       await prisma.factura.update({
         where: { id: facturaId },
         data: { 
           estatus: 'Timbrada - Complementado Local',
           complementosPago: existingComplements
         }
       })
    }

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


export async function cancelarComplementoPago(facturaId, receiptId, motivo = '02') {
  try {
    const fac = await prisma.factura.findUnique({ 
        where: { id: facturaId }, 
        include: { empresa: true } 
    });
    if (!fac || !fac.complementosPago) return { success: false, error: 'Factura o complemento no encontrado.' };

    const activeTenantKey = (fac.empresa.cerPath && fac.empresa.facturapiLiveKey)
      ? fac.empresa.facturapiLiveKey 
      : (fac.empresa.facturapiTestKey || process.env.FACTURAPI_LIVE_KEY);

    if (activeTenantKey && !activeTenantKey.includes('PENDING_KEY')) {
      const payload = { motive: motivo };
      try {
        const tenantFacturapi = new facturapi.constructor(activeTenantKey);
        await tenantFacturapi.invoices.cancel(receiptId, payload);
      } catch (pacError) {
        if (pacError.message && (pacError.message.includes('terminar de configurar') || pacError.message.includes('pending steps'))) {
          console.log("Facturapi rechazó Live por falta de CSD real. Cancelando complemento con Test Key...");
          const fallbackKey = fac.empresa.facturapiTestKey || process.env.FACTURAPI_TEST_KEY || process.env.FACTURAPI_LIVE_KEY;
          const testFacturapi = new facturapi.constructor(fallbackKey);
          await testFacturapi.invoices.cancel(receiptId, payload);
        } else {
          // Si dice que ya está en proceso de cancelación, lo ignoramos y lo borramos localmente
          const errorMsg = pacError.response?.data?.message || pacError.message || "Error desconocido";
          const isSubscriptionError = errorMsg.toLowerCase().includes('suscrip') || 
                                     errorMsg.toLowerCase().includes('plan') || 
                                     errorMsg.toLowerCase().includes('suscripcion');
          if (isSubscriptionError) {
            console.log("Error de suscripción en Facturapi al cancelar complemento. Cancelando localmente en la base de datos.");
          } else if (!errorMsg.toLowerCase().includes('pending cancellation')) {
            throw new Error(errorMsg);
          }
        }
      }
    } else {
       console.log(`[SIMULACION] Cancelando complemento ${receiptId} con motivo ${motivo}`);
    }

    const updatedComplements = fac.complementosPago.filter(c => c.id !== receiptId && c.receipt_id !== receiptId);

    await prisma.factura.update({
      where: { id: facturaId },
      data: { complementosPago: updatedComplements }
    });

    return { success: true };
  } catch(error) {
    console.error("Error al cancelar complemento REP: ", error);
    return { success: false, error: error.message };
  }
}

export async function uploadFacturaPdf(facturaId, base64Str) {
  try {
    // Remove the data URI prefix if it exists
    const base64Data = base64Str.replace(/^data:application\/pdf;base64,/, '');
    
    await prisma.factura.update({
      where: { id: facturaId },
      data: { pdfBase64: base64Data }
    });
    return { success: true };
  } catch(error) {
    console.error("Error al guardar PDF manual de factura: ", error);
    return { success: false, error: error.message };
  }
}

export async function generarVistaPreviaPDFBase64(formDataRaw) {
  try {
    const { empresaId, clienteId, items, notasServicio, usoCfdi, formaPago, metodoPago } = formDataRaw;

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
      const rateVal = parseFloat(i.tasaOCuota || 0);

      if (i.impuesto === '002' && rateVal === 0.04) {
        // Splitting international flight in the PDF preview too
        const subGravado = lineSub * 0.25;
        const subNoGravado = lineSub * 0.75;
        sumTotal += lineSub;
        totalImpuestosTrasladados += (subGravado * 0.16);

        itemsTable.push([
          cantidad.toString(),
          i.claveUnidad || 'H87',
          `${i.descripcion} (Parte Gravada 25%)`,
          `$${(precio * 0.25).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `$${subGravado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ]);

        itemsTable.push([
          cantidad.toString(),
          i.claveUnidad || 'H87',
          `${i.descripcion} (Parte No Gravada 75%)`,
          `$${(precio * 0.75).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `$${subNoGravado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ]);
      } else {
        sumTotal += lineSub;
        
        const tasa = parseFloat(i.tasaOCuota || 0.16);
        if (i.impuesto === '002' || !i.impuesto) {
          totalImpuestosTrasladados += (lineSub * tasa);
        }

        itemsTable.push([
          cantidad.toString(),
          i.claveUnidad || 'H87',
          i.descripcion,
          `$${precio.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `$${lineSub.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ]);
      }
    });

    const totalCalculado = sumTotal + totalImpuestosTrasladados;

    const dummyFactura = {
      subTotal: sumTotal,
      totalImpuestosTrasladados: totalImpuestosTrasladados,
      total: totalCalculado,
      moneda: 'MXN',
      notasServicio: notasServicio,
      folioInterno: 'VISTA-PREVIA',
      usoCfdi,
      formaPago,
      metodoPago
    };

    const totals = [
        { text: `Subtotal: $${dummyFactura.subTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin: [0, 5, 0, 5], bold: true },
        { text: `Total Impuestos: $${dummyFactura.totalImpuestosTrasladados.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin: [0, 0, 0, 5] },
        { text: `TOTAL ESTIMADO: $${dummyFactura.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${dummyFactura.moneda}`, bold: true, fontSize: 14, color: empresa.colorPrimario || '#0054a6' }
    ];

    const docDefinition = buildPdfDocDefinition(dummyFactura, empresa, cliente, 'COTIZACION', itemsTable, totals, 'VISTA PREVIA - FACTURA');
    const pdfBuffer = await createPdfBuffer(docDefinition);

    return { success: true, base64: pdfBuffer.toString('base64') };
  } catch (error) {
    console.error("Error generando vista previa PDF: ", error);
    return { success: false, error: 'Error generando PDF: ' + error.message };
  }
}
