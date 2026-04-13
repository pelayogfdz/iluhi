const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const empresa = await prisma.empresa.findFirst();
    if (!empresa) throw new Error("No hay empresas");
    
    const producto = await prisma.producto.create({
      data: {
        descripcion: 'Servicio de consultoria',
        claveProdServ: '80101500', 
        claveUnidad: 'E48', 
        precio: 1500.00,
        impuesto: '002', 
        tasaOCuota: 0.16,
        noIdentificacion: 'CONS-01',
        empresaId: empresa.id
      }
    });
    console.log('Producto creado con éxito:', producto);
  } catch (err) {
    console.error('Error al crear el producto:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
