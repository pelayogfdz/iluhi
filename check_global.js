const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const Emitidas = await prisma.facturaEmitida.count({
            where: {
                fechaEmision: {
                    gte: new Date('2026-01-01T00:00:00.000Z')
                }
            }
        });

        const Recibidas = await prisma.facturaRecibida.count({
            where: {
                fechaEmision: {
                    gte: new Date('2026-01-01T00:00:00.000Z')
                }
            }
        });

        console.log(`Global Facturas Emitidas (2026): ${Emitidas}`);
        console.log(`Global Facturas Recibidas (2026): ${Recibidas}`);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
