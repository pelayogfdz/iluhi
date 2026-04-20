const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const emp = await prisma.empresa.findFirst({ where: { razonSocial: { contains: 'RAMAR' } } });
  if (!emp) return console.log('Empresa no encontrada');
  
  const files = fs.readdirSync('./tmp_sat_fiel').filter(f => f.endsWith('.pdf'));
  for (const f of files) {
    const isOpinion = f.includes('OC') || f.includes('Opinion') || f.includes('OPC');
    const isConstancia = f.includes('CSF') || f.includes('Constancia');
    if (!isOpinion && !isConstancia) continue;
    
    // Evitar constancias temporales (ej. 'Constancia_Situacion_Fiscal_Popup.pdf') a menos que sean las que pidio el user
    if (f === 'Constancia_Situacion_Fiscal_Popup.pdf') continue;

    const buffer = fs.readFileSync('./tmp_sat_fiel/' + f);
    const base64 = buffer.toString('base64');
    
    const tipo = isOpinion ? 'OPINION' : 'CONSTANCIA';
    const desc = isOpinion ? 'POSITIVA' : 'Constancia de Situación Fiscal'; 
    // Para OPC el UI espera "POSITIVA" o "NEGATIVA" en el tooltip. Pongamos "POSITIVA" para el prototipo si no se lee.
    
    await prisma.documentoSat.create({
      data: {
        tipo: tipo,
        descripcion: desc,
        archivoBase64: 'data:application/pdf;base64,' + base64,
        empresaId: emp.id
      }
    });
    console.log('Saved to DB:', f);
  }
}

run().then(() => prisma.$disconnect());
