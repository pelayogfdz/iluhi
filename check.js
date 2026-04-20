const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const docs = await prisma.documentoSat.findMany(); 
  console.log(docs.map(d => ({ tipo: d.tipo, descripcion: d.descripcion, id: d.id, base64: d.archivoBase64.substring(0, 30) })));
} 
run().then(() => prisma.$disconnect());
