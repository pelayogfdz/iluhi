const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const localId = '05757ecd-3958-42af-91ba-7975b493a465'; 
  
  const complements = [
    {
      id: '69f259d2e301c2a804746195',
      receipt_id: '69f259d2e301c2a804746195',
      amount: 9860,
      date: '2026-04-29T19:19:46.681Z',
      uuid: 'E286EF96-7BD0-4360-AC4E-DE513E526628'
    },
    {
      id: '69f25cd2e301c2a804757460',
      receipt_id: '69f25cd2e301c2a804757460',
      amount: 9860,
      date: '2026-04-29T19:32:34.406Z',
      uuid: 'B9F20A54-FD8F-437E-961E-50A229B30FD6'
    }
  ];

  await prisma.factura.update({
    where: { id: localId },
    data: {
      estatus: 'Timbrada', 
      complementosPago: complements
    }
  });
  console.log('Local database updated successfully with amount and date.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
