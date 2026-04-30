const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const localId = '05757ecd-3958-42af-91ba-7975b493a465'; 

  await prisma.factura.update({
    where: { id: localId },
    data: {
      estatus: 'Timbrada - Complementado'
    }
  });
  console.log('Local database estatus updated to "Timbrada - Complementado"');
}

main().catch(console.error).finally(() => prisma.$disconnect());
