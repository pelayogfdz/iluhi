const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.emailTask.count();
  console.log('Total EmailTask count:', count);
  const tasks = await prisma.emailTask.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('Last 5 tasks:', tasks);
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
