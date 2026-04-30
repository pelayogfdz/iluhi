const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const localId = '05757ecd-3958-42af-91ba-7975b493a465'; 
  const receiptIdToCancel = '69f259d2e301c2a804746195';

  const factura = await prisma.factura.findUnique({
    where: { id: localId }
  });

  const updatedComplements = factura.complementosPago.filter(c => c.id !== receiptIdToCancel && c.receipt_id !== receiptIdToCancel);
  
  await prisma.factura.update({
    where: { id: localId },
    data: { complementosPago: updatedComplements }
  });
  console.log("Database updated.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
