const { PrismaClient } = require('@prisma/client');
const facturapi = require('facturapi');
const prisma = new PrismaClient();

async function main() {
  const localId = '05757ecd-3958-42af-91ba-7975b493a465'; 
  const factura = await prisma.factura.findUnique({
    where: { id: localId },
    include: { empresa: true }
  });
  console.log("Local Invoice:", factura.uuid, "Complementos:", JSON.stringify(factura.complementosPago, null, 2));

  const tenant = new facturapi.constructor(factura.empresa.facturapiLiveKey);
  const receipts = await tenant.receipts.list({ invoice_id: factura.uuid });
  console.log("Facturapi Receipts:", receipts.data.map(r => ({ id: r.id, status: r.status, date: r.date, total: r.total })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
