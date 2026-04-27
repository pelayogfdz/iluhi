import { PrismaClient } from '@prisma/client';
import facturapiPkg from 'facturapi';
const Facturapi = facturapiPkg.default;
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();
const facturapi = new Facturapi(process.env.FACTURAPI_USER_KEY);

async function migrateKeys() {
  const empresas = await prisma.empresa.findMany({
    where: { 
      NOT: { facturapiId: null },
      facturapiLiveKey: null
    }
  });

  console.log(`Encontradas ${empresas.length} empresas sin llaves API persistidas. Iniciando sincronización...`);

  let count = 0;
  for (const empresa of empresas) {
    console.log(`\nProcesando [${empresa.razonSocial}] (Facturapi ID: ${empresa.facturapiId})...`);
    try {
      const liveKey = await facturapi.organizations.renewLiveApiKey(empresa.facturapiId);
      const testKey = await facturapi.organizations.renewTestApiKey(empresa.facturapiId);

      await prisma.empresa.update({
        where: { id: empresa.id },
        data: {
          facturapiLiveKey: liveKey,
          facturapiTestKey: testKey
        }
      });
      console.log(`✅ Llaves sincronizadas para: ${empresa.razonSocial}`);
      count++;
    } catch (e) {
      console.error(`❌ Error sincronizando ${empresa.razonSocial}:`, e.message);
    }
  }

  console.log(`\nMigración completada. ${count}/${empresas.length} empresas actualizadas con éxito.`);
  process.exit(0);
}

migrateKeys().catch(console.error);
