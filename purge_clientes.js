const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function purge() {
  await prisma.cliente.deleteMany({});
  console.log("Todos los clientes han sido eliminados.");
  
  // Opcional: También borrar la "Empresa Matriz" dummy que usé para anclarlos si ya no se necesita.
  // Pero la dejaré por si acaso.
}

purge()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
