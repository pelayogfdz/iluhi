require('dotenv').config({ path: '.env' });
const FacturapiClient = require('facturapi').default;

async function main() {
  const facturapi = new FacturapiClient(process.env.FACTURAPI_USER_KEY);
  try {
    // Facturapi docs for series say: you don't need a group. You can just set the series globally?
    // Let's retrieve all series groups to see the format.
    const groups = await facturapi.organizations.listSeriesGroup('69e66616f459c74a4af0b90d');
    console.log("Groups:", JSON.stringify(groups, null, 2));
    
    // Test creating a Receipt Settings to set next_folio? Wait, series group is for prefixes.
  } catch (e) {
    console.error("Error:", e.status, e.message, e.details);
  }
}

main().catch(console.error);
