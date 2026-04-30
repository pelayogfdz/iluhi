require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const Facturapi = require('facturapi').default || require('facturapi');

const prisma = new PrismaClient();

async function main() {
  const itemsToRestore = [
    { dbId: "b53dbe63-f14d-4cfd-9f32-7a360a032de0", facturapiId: "69f25d9e242e0af47a51ced8", empresaName: "ALAMBRES APACHE" },
    { dbId: "05757ecd-3958-42af-91ba-7975b493a465", facturapiId: "69f25661e301c2a80472f961", empresaName: "ALAMBRES APACHE" },
    { dbId: "008e8c11-f95c-4ad1-996f-f2914468a11f", facturapiId: "69f25514242e0af47a4e57b2", empresaName: "MEXICO VACACIONES" }
  ];

  for (const item of itemsToRestore) {
    try {
      console.log(`Processing Facturapi ID: ${item.facturapiId}`);
      const empresas = await prisma.empresa.findMany();
      const empresa = empresas.find(e => e.razonSocial.includes(item.empresaName));

      if (!empresa) {
        console.log(`Could not find local empresa for ${item.facturapiId}`);
        continue;
      }
      
      const tenantKey = empresa.facturapiLiveKey || empresa.facturapiTestKey;
      if (!tenantKey || tenantKey.includes('PENDING')) {
        console.log(`No valid key for empresa ${empresa.razonSocial}`);
        continue;
      }
      
      const tenantFacturapi = new Facturapi(tenantKey);
      
      console.log(`Fetching from Facturapi: ${item.facturapiId} with key for ${empresa.razonSocial}`);
      const satInvoice = await tenantFacturapi.invoices.retrieve(item.facturapiId);
      
      if (!satInvoice) {
        console.log(`Could not find in Facturapi: ${item.facturapiId}`);
        continue;
      }

      const clientes = await prisma.cliente.findMany();
      const cliente = clientes.find(c => c.razonSocial.includes("DISTRIBUIDORA OC"));

      if (!cliente) {
        console.log(`Could not find local cliente for ${item.facturapiId}`);
        continue;
      }

      const paymentMethod = satInvoice.payment_method || 'PUE';
      const useCfdi = satInvoice.use || 'G03';

      // Restore receipts if they exist
      const receiptsList = await tenantFacturapi.receipts.list({ invoice_id: satInvoice.id });
      let complementosPago = [];
      if (receiptsList && receiptsList.data && receiptsList.data.length > 0) {
        complementosPago = receiptsList.data.map(r => ({
          id: r.id,
          uuid: r.uuid,
          amount: r.total,
          date: r.created_at
        }));
      }

      await prisma.factura.create({
        data: {
          id: item.dbId,
          empresaId: empresa.id,
          clienteId: cliente.id,
          fechaEmision: new Date(satInvoice.created_at),
          total: satInvoice.total,
          uuid: satInvoice.id, // we store facturapi ID in uuid field based on current logic
          estatus: complementosPago.length > 0 ? 'Timbrada - Complementado Local' : 'Timbrada',
          metodoPago: paymentMethod,
          usoCfdi: useCfdi,
          complementosPago: complementosPago
        }
      });
      console.log(`Restored ${item.facturapiId} successfully as ${item.dbId}!`);
      
    } catch (err) {
      console.error(`Error restoring ${item.facturapiId}:`, err.message);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
