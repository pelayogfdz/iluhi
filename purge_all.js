const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function purgeAll() {
  console.log("Iniciando purga total...");
  
  // Borrar en orden para respetar las Constraints de las llaves foráneas (Foreign Keys)
  await prisma.factura.deleteMany();
  await prisma.producto.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.empresa.deleteMany();
  
  console.log("¡Todo el ecosistema ha sido purgado! Tablas de Empresa, Cliente, Producto y Facturas limpias.");
}

purgeAll()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
