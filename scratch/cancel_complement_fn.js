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
        await tenantFacturapi.receipts.cancel(receiptId, payload);
      } catch (pacError) {
        if (pacError.message && (pacError.message.includes('terminar de configurar') || pacError.message.includes('pending steps'))) {
          console.log("Facturapi rechazó Live por falta de CSD real. Cancelando complemento con Test Key...");
          const fallbackKey = fac.empresa.facturapiTestKey || process.env.FACTURAPI_TEST_KEY || process.env.FACTURAPI_LIVE_KEY;
          const testFacturapi = new facturapi.constructor(fallbackKey);
          await testFacturapi.receipts.cancel(receiptId, payload);
        } else {
          // Si dice que ya está en proceso de cancelación, lo ignoramos y lo borramos localmente
          const errorMsg = pacError.response?.data?.message || pacError.message || "Error desconocido";
          if (!errorMsg.toLowerCase().includes('pending cancellation')) {
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
