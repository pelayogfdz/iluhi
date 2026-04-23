const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const doc = await prisma.documentoSat.findFirst({
        where: { tipo: 'CONSTANCIA' },
        orderBy: { createdAt: 'desc' }
    });
    console.log("Single doc schema verification:", {
        id: doc.id,
        tipo: doc.tipo,
        fechaDocumento: doc.fechaDocumento,
        hasUrl: !!doc.archivoUrl,
        url: doc.archivoUrl,
        hasBase64: !!doc.archivoBase64,
        base64Length: doc.archivoBase64 ? doc.archivoBase64.length : 0
    });
}
run();
