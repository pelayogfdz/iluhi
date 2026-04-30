const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const FacturapiClient = require('facturapi').default || require('facturapi');

async function main() {
  const localId = '05757ecd-3958-42af-91ba-7975b493a465'; 
  
  const factura = await prisma.factura.findUnique({
    where: { id: localId },
    include: { empresa: true }
  });

  const activeKey = factura.empresa.facturapiLiveKey || process.env.FACTURAPI_LIVE_KEY;
  const tenantClient = new FacturapiClient(activeKey);

  const receiptIds = [
    "69f259d2e301c2a804746195",
    "69f25cd2e301c2a804757460"
  ];
  
  const complements = [];

  for (const rid of receiptIds) {
    console.log(`Fetching invoice from Facturapi: ${rid}`);
    try {
      const receipt = await tenantClient.invoices.retrieve(rid);
      complements.push({
        id: receipt.id,
        receipt_id: receipt.id,
        monto: receipt.total_payment_amount || receipt.total || 0,
        fechaPago: receipt.date,
        uuid: receipt.uuid
      });
      console.log('Successfully fetched receipt invoice:', receipt.id);
    } catch (e) {
      console.log('Error fetching invoice:', e.message);
    }
  }
  
  console.log('Mapped Complements:', complements);

  if (complements.length > 0) {
    await prisma.factura.update({
      where: { id: localId },
      data: {
        estatus: 'Complementado Local', 
        complementosPago: complements
      }
    });
    console.log('Local database updated successfully.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
