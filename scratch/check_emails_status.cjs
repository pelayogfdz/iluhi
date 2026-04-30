const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tasks = await prisma.emailTask.findMany({
    orderBy: { scheduledFor: 'desc' },
    take: 10,
    include: { factura: { select: { uuid: true } } }
  });
  console.log(tasks);
}
main().finally(() => prisma.$disconnect());
