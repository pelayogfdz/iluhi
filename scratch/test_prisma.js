const prisma = require('../lib/prisma').default;

async function test() {
  try {
    const empresas = await prisma.empresa.findMany();
    if (empresas.length === 0) return console.log('No empresas');

    const id = empresas[0].id;
    console.log('Testing update 1...');
    await prisma.empresa.update({ where: { id }, data: { passwordCsd: 'test1' }});
    console.log('Testing update 2...');
    await prisma.empresa.update({ where: { id }, data: { passwordCsd: 'test2' }});
    console.log('Testing update 3...');
    await prisma.empresa.update({ where: { id }, data: { passwordCsd: 'test3' }});
    console.log('Testing update 4...');
    await prisma.empresa.update({ where: { id }, data: { passwordCsd: 'test4' }});
    console.log('All updates successful.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
