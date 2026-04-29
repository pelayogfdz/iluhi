require('dotenv').config({ path: '.env' });
const FacturapiClient = require('facturapi').default;

async function main() {
  const facturapi = new FacturapiClient(process.env.FACTURAPI_USER_KEY);
  try {
    const res = await facturapi.organizations.createSeriesGroup('69e66616f459c74a4af0b90d', {
      name: "Principal",
      series: [
        { type: "invoice", series: "F", next_folio: 5000 },
        { type: "credit_note", series: "NC", next_folio: 5000 }
      ]
    });
    console.log("Success:", JSON.stringify(res, null, 2));
  } catch (e) {
    console.error("Error:", e.status, e.message, e.details);
  }
}

main().catch(console.error);
