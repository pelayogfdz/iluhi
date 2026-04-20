const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const emp = await prisma.empresa.findFirst({ where: { razonSocial: { contains: 'AF GROUP', mode: 'insensitive' } }});
  if (emp) {
    console.log('RFC:', emp.rfc);
    console.log('Has CER:', !!emp.fielCerBase64);
    console.log('Has KEY:', !!emp.fielKeyBase64);
    console.log('Has PWD:', !!emp.fielPassword);
    require('fs').writeFileSync('afgroup_pwd.txt', emp.fielPassword);

  } else {
    console.log('AF Group not found in DB');
  }
}
check().finally(() => prisma.$disconnect());
