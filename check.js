const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  await prisma.empresa.updateMany({where:{razonSocial:{contains:'RAMAR'}},data:{opinionCumplimiento:'POSITIVA'}});
  console.log('Update done');
} 
run().then(() => prisma.$disconnect());
