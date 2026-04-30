const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const facturas = [
    'b53dbe63-f14d-4cfd-9f32-7a360a032de0',
    '05757ecd-3958-42af-91ba-7975b493a465',
    '008e8c11-f95c-4ad1-996f-f2914468a11f'
  ];
  
  const now = new Date();
  for (const id of facturas) {
    await prisma.emailTask.createMany({
      data: [
        { facturaId: id, type: 'COTIZACION', scheduledFor: now, status: 'PENDING' },
        { facturaId: id, type: 'ORDEN_SERVICIO', scheduledFor: now, status: 'PENDING' },
        { facturaId: id, type: 'FACTURA', scheduledFor: now, status: 'PENDING' }
      ]
    });
    console.log('Created tasks for', id);
  }
}

main().finally(() => prisma.$disconnect());
