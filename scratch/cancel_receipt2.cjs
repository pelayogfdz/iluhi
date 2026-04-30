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
    console.log("Canceling receipt using invoices.cancel:", receiptIdToCancel);
    await tenant.invoices.cancel(receiptIdToCancel);
    console.log("Receipt canceled on Facturapi!");
  } catch (err) {
    console.error("Facturapi cancel error:", err.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
