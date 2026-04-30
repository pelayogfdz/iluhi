import { PrismaClient } from '@prisma/client'
import facturapi from '../lib/facturapi.js'

const prisma = new PrismaClient()

async function main() {
  const idsToRestore = [
    "b53dbe63-f14d-4cfd-9f32-7a360a032de0",
    "05757ecd-3958-42af-91ba-7975b493a465",
    "008e8c11-f95c-4ad1-996f-f2914468a11f"
  ];

  for (const id of idsToRestore) {
    try {
      console.log(`Fetching from Facturapi: ${id}`);
      const satInvoice = await facturapi.invoices.retrieve(id);
      
      if (!satInvoice) {
        console.log(`Could not find in Facturapi: ${id}`);
        continue;
      }

      // Try to find the local empresa and cliente based on names or RFC
      // Emitido por:
      const empresaRfc = satInvoice.tax_id; // Wait, actually we can find by rfc? Facturapi doesn't give issuer RFC directly if using organization keys, but wait! We can look up the empresa by name if we know it. 
      // Emisores: "ALAMBRES APACHE" and "MEXICO VACACIONES"
      
      // Let's just find the first match by name for simplicity
      const empresas = await prisma.empresa.findMany();
      let empresa;
      if (id === "008e8c11-f95c-4ad1-996f-f2914468a11f") {
        empresa = empresas.find(e => e.razonSocial.includes("MEXICO VACACIONES"));
      } else {
        empresa = empresas.find(e => e.razonSocial.includes("ALAMBRES APACHE"));
      }

      const clientes = await prisma.cliente.findMany();
      // El cliente es DISTRIBUIDORA OC MEXICO
      const cliente = clientes.find(c => c.razonSocial.includes("DISTRIBUIDORA OC"));

      if (!empresa || !cliente) {
        console.log(`Could not find local empresa or cliente for ${id}`);
        continue;
      }

      const paymentMethod = satInvoice.payment_method || 'PUE';
      const useCfdi = satInvoice.use || 'G03';

      await prisma.factura.create({
        data: {
          id: satInvoice.id,
          empresaId: empresa.id,
          clienteId: cliente.id,
          fechaEmision: new Date(satInvoice.created_at),
          total: satInvoice.total,
          uuid: satInvoice.uuid,
          estatus: 'Timbrada',
          metodoPago: paymentMethod,
          usoCfdi: useCfdi,
          // Si tenían complementos, los podríamos rescatar pero el usuario quiere que los dejemos limpios o los volvamos a generar si los tenían en satInvoice?
          // SAT invoice object will have receipts if there are any.
        }
      });
      console.log(`Restored ${id} successfully!`);
      
    } catch (err) {
      console.error(`Error restoring ${id}:`, err.message);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
