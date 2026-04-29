const FacturapiClient = require('facturapi').default;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const empresa = await prisma.empresa.findUnique({
    where: { id: "33bd6482-3a20-40ea-8c14-e588ebd65ae1" }
  });
  
  const facturapi = new FacturapiClient(empresa.facturapiLiveKey);
  try {
     const payload = {
      customer: {
        legal_name: "Prueba Cliente",
        tax_id: "XAXX010101000",
        tax_system: "616",
        email: "test@example.com",
        address: { zip: "00000" }
      },
      items: [
        {
          product: {
            description: "Test",
            product_key: "84111506",
            price: 100,
            tax_included: false,
            taxes: [ { type: "IVA", rate: 0.16 } ],
            unit_key: "H87"
          },
          quantity: 1
        }
      ],
      use: "G03",
      payment_form: "01",
      payment_method: "PUE"
    };
    console.log("Attempting to create live invoice...");
    const invoice = await facturapi.invoices.create(payload);
    console.log("Success! Invoice ID:", invoice.id);
  } catch (e) {
    console.log("Error details:");
    console.log("Status:", e.status);
    console.log("Message:", e.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
