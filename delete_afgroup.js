const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
   try {
       const e = await prisma.empresa.findFirst({ where: { razonSocial: { contains: 'AF GROUP', mode: 'insensitive' } } });
       if(!e) return console.log('No se encontró AF GROUP. Ya fué borrada.');
       
       const facturas = await prisma.factura.findMany({ where: { empresaId: e.id } });
       for (let f of facturas) {
           if (prisma.conceptoFactura) await prisma.conceptoFactura.deleteMany({ where: { facturaId: f.id }});
           if (prisma.pago) await prisma.pago.deleteMany({ where: { facturaId: f.id }});
       }
       if (prisma.factura) await prisma.factura.deleteMany({ where: { empresaId: e.id } });
       if (prisma.socio) await prisma.socio.deleteMany({ where: { empresaId: e.id } });
       await prisma.empresa.delete({ where: { id: e.id } });
       console.log('Borrado de AF GROUP y registros dependientes exitoso.');
   } catch(err) {
       console.error("Error: ", err.message);
   } finally {
       await prisma.$disconnect();
   }
}
run();
