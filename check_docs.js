const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const docs = await prisma.documentoSat.findMany({
        select: { id: true, tipo: true, descripcion: true, empresaId: true }
    });
    console.log(JSON.stringify(docs, null, 2));
}
main().finally(() => prisma.$disconnect());
