require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const FacturapiClient = require('facturapi').default;

async function main() {
  const facturapi = new FacturapiClient(process.env.FACTURAPI_USER_KEY);
  const empresa = await prisma.empresa.findUnique({where: {id: '33bd6482-3a20-40ea-8c14-e588ebd65ae1'}});
  console.log("Org ID:", empresa.facturapiId);
  const org = await facturapi.organizations.retrieve(empresa.facturapiId);
  console.log(JSON.stringify(org.pending_steps, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
