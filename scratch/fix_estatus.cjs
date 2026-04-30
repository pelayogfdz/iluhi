const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.factura.update({
    where: { id: '05757ecd-3958-42af-91ba-7975b493a465' },
    data: { estatus: 'Timbrada' }
  });
  console.log('Fixed estatus');
}

main().finally(() => prisma.$disconnect());
