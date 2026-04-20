const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

(async () => {
  const emp = await prisma.empresa.findFirst({ where: { razonSocial: { contains: 'AF GROUP', mode: 'insensitive' } } });
  if (!emp) return console.log('Empresa AF GROUP no encontrada en DB');
  
  const destDir = path.join(__dirname, 'FIEL_AF_GROUP');
  if(!fs.existsSync(destDir)) fs.mkdirSync(destDir);
  
  const cerBase64 = emp.fielCerBase64.replace(/^data:(.*);base64,/, '');
  const keyBase64 = emp.fielKeyBase64.replace(/^data:(.*);base64,/, '');
  
  fs.writeFileSync(path.join(destDir, 'fiel.cer'), Buffer.from(cerBase64, 'base64'));
  fs.writeFileSync(path.join(destDir, 'fiel.key'), Buffer.from(keyBase64, 'base64'));
  fs.writeFileSync(path.join(destDir, 'password.txt'), emp.fielPassword);
  
  console.log('Documentos extraídos exitosamente a: ' + destDir);
  execSync('explorer.exe ' + destDir);
  await prisma.$disconnect();
})();
