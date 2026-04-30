const { PrismaClient } = require('@prisma/client');
const facturapi = require('facturapi');
const prisma = new PrismaClient();

async function main() {
  const localId = '05757ecd-3958-42af-91ba-7975b493a465'; 
  const receiptIdToCancel = '69f259d2e301c2a804746195';

  const factura = await prisma.factura.findUnique({
    where: { id: localId },
    include: { empresa: true }
  });

  const tenant = new facturapi.constructor(factura.empresa.facturapiLiveKey);
  
  try {
    console.log("Canceling receipt on Facturapi:", receiptIdToCancel);
    await tenant.receipts.cancel(receiptIdToCancel);
    console.log("Receipt canceled on Facturapi!");
  } catch (err) {
    console.error("Facturapi cancel error:", err.message);
  }

  // Remove from DB complementosPago array
  const updatedComplements = factura.complementosPago.filter(c => c.id !== receiptIdToCancel && c.receipt_id !== receiptIdToCancel);
  
  await prisma.factura.update({
    where: { id: localId },
    data: { complementosPago: updatedComplements }
  });
  console.log("Database updated.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
