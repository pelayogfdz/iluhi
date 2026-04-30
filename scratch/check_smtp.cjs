const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const empresas = await prisma.empresa.findMany({
    select: { razonSocial: true, smtpHost: true, smtpUser: true, smtpPass: true }
  });
  console.log(empresas.map(e => ({ ...e, smtpPass: e.smtpPass ? 'SET' : 'MISSING' })));
}
main().finally(() => prisma.$disconnect());
