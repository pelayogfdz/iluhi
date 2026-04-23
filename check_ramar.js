const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const empresas = await prisma.empresa.findMany({
            where: {
                razonSocial: {
                    contains: 'RAMAR',
                    mode: 'insensitive'
                }
            }
        });

        if (empresas.length === 0) {
            console.log("No se encontró la empresa RAMAR.");
            return;
        }

        const ramar = empresas[0];
        console.log(`Encontrada empresa: ${ramar.razonSocial} (ID: ${ramar.id}, RFC: ${ramar.rfc})`);

        // Count facturas for 2026
        const facturasEmitidas = await prisma.facturaEmitida.count({
            where: {
                empresaId: ramar.id,
                fechaEmision: {
                    gte: new Date('2026-01-01T00:00:00.000Z')
                }
            }
        });

        const facturasRecibidas = await prisma.facturaRecibida.count({
            where: {
                empresaId: ramar.id,
                fechaEmision: {
                    gte: new Date('2026-01-01T00:00:00.000Z')
                }
            }
        });

        console.log(`Facturas Emitidas en 2026: ${facturasEmitidas}`);
        console.log(`Facturas Recibidas en 2026: ${facturasRecibidas}`);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
