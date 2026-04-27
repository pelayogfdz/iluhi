const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tasks = await prisma.emailTask.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      factura: {
        include: { empresa: true, cliente: true }
      }
    }
  });
  console.log(JSON.stringify(tasks.map(t => ({ id: t.id, status: t.status, error: t.error, type: t.type, scheduledFor: t.scheduledFor, empresaId: t.factura?.empresaId, smtpUser: t.factura?.empresa?.smtpUser })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
