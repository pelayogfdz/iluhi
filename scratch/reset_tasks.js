const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.emailTask.updateMany({
    where: { status: 'FAILED' },
    data: { status: 'PENDING', error: null, scheduledFor: new Date() }
  });
  console.log(`Reseteadas ${result.count} tareas de correo.`);
}

main().catch(console.error).finally(()=>prisma.$disconnect());
