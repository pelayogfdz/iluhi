require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const FacturapiClient = require('facturapi').default;

async function main() {
  const facturapi = new FacturapiClient(process.env.FACTURAPI_USER_KEY);
  
  const empresas = await prisma.empresa.findMany();
  console.log(`Found ${empresas.length} empresas to process.`);

  for (const empresa of empresas) {
    if (!empresa.facturapiId) {
      console.log(`Skipping ${empresa.razonSocial}: No facturapiId`);
      continue;
    }

    console.log(`Processing: ${empresa.razonSocial} (${empresa.facturapiId})`);
    
    // 1. Update Legal Profile
    try {
      const legalData = {
        name: empresa.razonSocial,
        legal_name: empresa.razonSocial,
        tax_system: empresa.regimen.split(' ')[0],
        address: {
          zip: empresa.codigoPostal,
          street: empresa.calle || undefined,
          exterior: empresa.numExterior || undefined,
          interior: empresa.numInterior || undefined,
          neighborhood: empresa.colonia || undefined,
          city: empresa.ciudad || undefined,
          municipality: empresa.municipio || undefined,
          state: empresa.estado || undefined
        }
      };
      
      await facturapi.organizations.updateLegal(empresa.facturapiId, legalData);
      console.log(`  - Legal profile updated`);
    } catch (e) {
      console.error(`  ! Error updating legal profile:`, e.message);
    }

    // 2. Set Series Starting Folios to 5000 (only if they haven't been modified yet)
    try {
      // In Facturapi, updateSeriesGroup updates the series next_folio safely.
      await facturapi.organizations.updateSeriesGroup(empresa.facturapiId, 'F', { next_folio: 5000, next_folio_test: 5000 });
      await facturapi.organizations.updateSeriesGroup(empresa.facturapiId, 'NC', { next_folio: 5000, next_folio_test: 5000 });
      await facturapi.organizations.updateSeriesGroup(empresa.facturapiId, 'P', { next_folio: 5000, next_folio_test: 5000 });
      console.log(`  - Series F, NC, P initialized to 5000`);
    } catch (e) {
      console.error(`  ! Error updating series:`, e.message);
    }
  }

  console.log("Migration complete.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
