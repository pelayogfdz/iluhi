const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getFirst() {
  const empresa = await prisma.empresa.findFirst({
    where: { NOT: { facturapiId: null } }
  });
  console.log(empresa.facturapiId);
}

getFirst().then(() => process.exit(0)).catch(console.error);
