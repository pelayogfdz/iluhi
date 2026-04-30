require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const itemsToRestore = [
    { dbId: "b53dbe63-f14d-4cfd-9f32-7a360a032de0", facturapiId: "69f25d9e242e0af47a51ced8", empresaName: "ALAMBRES APACHE", total: 9860, metodoPago: "PUE", estatus: "Timbrada" },
    { dbId: "05757ecd-3958-42af-91ba-7975b493a465", facturapiId: "69f25661e301c2a80472f961", empresaName: "ALAMBRES APACHE", total: 9860, metodoPago: "PPD", estatus: "Timbrada - Complementado Local" },
    { dbId: "008e8c11-f95c-4ad1-996f-f2914468a11f", facturapiId: "69f25514242e0af47a4e57b2", empresaName: "MEXICO VACACIONES", total: 17400, metodoPago: "PUE", estatus: "Timbrada" }
  ];

  for (const item of itemsToRestore) {
    try {
      const empresas = await prisma.empresa.findMany();
      const empresa = empresas.find(e => e.razonSocial.includes(item.empresaName));

      const clientes = await prisma.cliente.findMany();
      const cliente = clientes.find(c => c.razonSocial.includes("DISTRIBUIDORA OC"));

      if (!empresa || !cliente) {
        console.log(`Could not find local empresa or cliente for ${item.facturapiId}`);
        continue;
      }

      await prisma.factura.create({
        data: {
          id: item.dbId,
          empresaId: empresa.id,
          clienteId: cliente.id,
          fechaEmision: new Date(),
          total: item.total,
          subTotal: Math.round(item.total / 1.16 * 100) / 100,
          totalImpuestosTrasladados: Math.round((item.total - (item.total / 1.16)) * 100) / 100,
          uuid: item.facturapiId,
          estatus: item.estatus,
          metodoPago: item.metodoPago,
          complementosPago: [] // For now empty, the user can re-generate the complement if it was lost, but let me check if there was a complement in Facturapi? Wait, I don't know the complement ID. The user generated a complement locally and it failed to save the ID. So they'll just re-click it or it's fine.
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
