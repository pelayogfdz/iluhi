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

  console.log(`Fetching invoice from Facturapi: ${factura.uuid}`);
  const facturapiInvoice = await tenantClient.invoices.retrieve(factura.uuid);
  
  console.log('Invoice details:', JSON.stringify(facturapiInvoice, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
