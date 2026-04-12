const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const empresas = await prisma.empresa.findMany({ select: { id: true, razonSocial: true } });
  console.log("Current Empresas in DB:");
  console.dir(empresas);
}
main().finally(() => prisma.$disconnect());
