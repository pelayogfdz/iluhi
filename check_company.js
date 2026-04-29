const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const empresa = await prisma.empresa.findUnique({
    where: { id: "33bd6482-3a20-40ea-8c14-e588ebd65ae1" }
  });
  console.log({
    razonSocial: empresa.razonSocial,
    facturapiLiveKey: empresa.facturapiLiveKey ? "SET" : "NOT SET",
    facturapiTestKey: empresa.facturapiTestKey ? "SET" : "NOT SET",
    cerPath: empresa.cerPath ? "SET" : "NOT SET",
    keyPath: empresa.keyPath ? "SET" : "NOT SET"
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
