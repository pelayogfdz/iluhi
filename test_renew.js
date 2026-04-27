import facturapi from './lib/facturapi.js';
import prisma from './lib/prisma.js';

async function testRenewKey() {
  const empresas = await prisma.empresa.findMany({ where: { NOT: { facturapiId: null } }, take: 1 });
  if (empresas.length > 0) {
    const empresa = empresas[0];
    console.log("Renovando llave para empresa:", empresa.razonSocial);
    try {
        const result = await facturapi.organizations.renewLiveApiKey(empresa.facturapiId);
        console.log("Result:", result);
    } catch (e) {
        console.error("Error:", e);
    }
  }
}

testRenewKey();
