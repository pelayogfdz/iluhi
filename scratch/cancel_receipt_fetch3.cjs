const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');
const prisma = new PrismaClient();

async function main() {
  const localId = '05757ecd-3958-42af-91ba-7975b493a465'; 
  const receiptIdToCancel = '69f259d2e301c2a804746195';

  const factura = await prisma.factura.findUnique({
    where: { id: localId },
    include: { empresa: true }
  });

  const apiKey = factura.empresa.facturapiLiveKey;
  
  try {
    const res = await fetch(`https://www.facturapi.io/v2/invoices/${receiptIdToCancel}?motive=02`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    const json = await res.json();
    console.log("Response:", json);

    if (json.id || json.status === 'canceled') {
      const updatedComplements = factura.complementosPago.filter(c => c.id !== receiptIdToCancel && c.receipt_id !== receiptIdToCancel);
      await prisma.factura.update({
        where: { id: localId },
        data: { complementosPago: updatedComplements }
      });
      console.log("Database updated.");
    }
  } catch (err) {
    console.error("Fetch error:", err.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
