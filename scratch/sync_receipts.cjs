const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const FacturapiClient = require('facturapi').default || require('facturapi');

async function main() {
  const localId = '05757ecd-3958-42af-91ba-7975b493a465'; // The invoice the user is pointing to
  
  const factura = await prisma.factura.findUnique({
    where: { id: localId },
    include: { empresa: true }
  });

  if (!factura) {
    console.log('Factura not found');
    return;
  }

  const activeKey = factura.empresa.facturapiLiveKey || process.env.FACTURAPI_LIVE_KEY;
  const tenantClient = new FacturapiClient(activeKey);

  console.log(`Checking receipts for invoice UUID: ${factura.uuid}`);
  
  // Search for receipts related to this invoice
  const searchResult = await tenantClient.receipts.list({
    invoice_id: factura.uuid
  });

  console.log(`Found ${searchResult.data.length} receipts.`);
  
  if (searchResult.data.length > 0) {
    const receipts = searchResult.data;
    
    // Save to local database
    const mappedComplements = receipts.map(r => ({
      id: r.id,
      receipt_id: r.id,
      monto: r.total,
      fechaPago: r.date,
      uuid: r.uuid
    }));

    await prisma.factura.update({
      where: { id: localId },
      data: {
        estatus: 'Complementado', // Set to Complementado or leave as Timbrada depending on if fully paid
        complementosPago: mappedComplements
      }
    });
    
    console.log('Local database updated with receipts: ', JSON.stringify(mappedComplements, null, 2));
  } else {
    console.log('No receipts found in Facturapi for this invoice.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
