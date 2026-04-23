const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Emitidas:', await prisma.facturaEmitida.count());
  console.log('Recibidas:', await prisma.facturaRecibida.count());
  console.log('Constancias:', await prisma.constanciaSat.count());
  console.log('Opiniones:', await prisma.opinionCumplimiento.count());
}

main().finally(() => {
  prisma.$disconnect();
});
