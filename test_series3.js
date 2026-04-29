require('dotenv').config({ path: '.env' });
const FacturapiClient = require('facturapi').default;

async function main() {
  const facturapi = new FacturapiClient(process.env.FACTURAPI_USER_KEY);
  try {
    const res = await facturapi.organizations.updateSeriesGroup('69e66616f459c74a4af0b90d', 'F', {
      next_folio: 5000,
      next_folio_test: 5000
    });
    console.log("Success F:", JSON.stringify(res, null, 2));

    await facturapi.organizations.updateSeriesGroup('69e66616f459c74a4af0b90d', 'NC', {
      next_folio: 5000,
      next_folio_test: 5000
    });
    console.log("Success NC");
    
    await facturapi.organizations.updateSeriesGroup('69e66616f459c74a4af0b90d', 'P', {
      next_folio: 5000,
      next_folio_test: 5000
    });
    console.log("Success P");
  } catch (e) {
    console.error("Error:", e.status, e.message, e.details);
  }
}

main().catch(console.error);
