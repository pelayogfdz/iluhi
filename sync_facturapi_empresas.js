require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const FacturapiClient = require('facturapi').default;
const fs = require('fs');

const prisma = new PrismaClient();

async function syncOrphanedCompanies() {
    if (!process.env.FACTURAPI_USER_KEY) {
        console.error("Falta FACTURAPI_USER_KEY en .env");
        return;
    }
    const facturapiAdmin = new FacturapiClient(process.env.FACTURAPI_USER_KEY);
    
    try {
        const empresas = await prisma.empresa.findMany({
            where: {
                facturapiId: null
            }
        });

        if (empresas.length === 0) {
            console.log("No hay empresas pendientes por sincronizar en Facturapi.");
            return;
        }

        console.log(`Encontradas ${empresas.length} empresa(s) sin Facturapi ID. Iniciando sincronización...`);

        for (const emp of empresas) {
            console.log(`Sincronizando: ${emp.razonSocial}...`);
            try {
                // 1. Crear Organización
                const org = await facturapiAdmin.organizations.create({ name: emp.razonSocial });
                
                // 2. Llenar info Legal
                if (emp.rfc && emp.regimen && emp.codigoPostal) {
                    await facturapiAdmin.organizations.updateLegal(org.id, {
                        tax_id: emp.rfc,
                        tax_system: emp.regimen.split(' ')[0], 
                        zip: emp.codigoPostal
                    }).catch(err => console.error("Error updateLegal:", err.message));
                }

                // 3. Subir CSD si ya lo tenían precargado en sistema
                if (emp.cerPath && emp.keyPath && emp.passwordCsd) {
                    if (fs.existsSync(emp.cerPath) && fs.existsSync(emp.keyPath)) {
                        const cerBuffer = fs.readFileSync(emp.cerPath);
                        const keyBuffer = fs.readFileSync(emp.keyPath);
                        await facturapiAdmin.organizations.uploadCertificate(org.id, cerBuffer, keyBuffer, emp.passwordCsd)
                            .then(() => console.log(`CSD subido correctamente para ${emp.razonSocial}`))
                            .catch(err => console.error("Error subiendo CSD preexistente:", err.message));
                    }
                }

                // 4. Guardar llaves en base de datos
                await prisma.empresa.update({
                    where: { id: emp.id },
                    data: {
                        facturapiId: org.id,
                        facturapiLiveKey: org.liveApiKey,
                        facturapiTestKey: org.testApiKey
                    }
                });
                
                console.log(`✅ [ÉXITO] ${emp.razonSocial} migrada y conectada (${org.id})`);
            } catch (innerError) {
                console.error(`❌ [ERROR] Falló migración para ${emp.razonSocial}:`, innerError.message);
            }
        }
    } catch(e) {
        console.error("Error crítico: ", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

syncOrphanedCompanies();
