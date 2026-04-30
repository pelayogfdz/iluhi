const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const c = await prisma.cliente.findFirst({ where: { razonSocial: { contains: 'DISTRIBUIDORA OC' } } });
  console.log('Correo:', c.correoDestino);
}
main().finally(() => prisma.$disconnect());
