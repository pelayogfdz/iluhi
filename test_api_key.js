const Facturapi = require('facturapi').default || require('facturapi');
const facturapi = new Facturapi('sk_test_FBr4Hd3aZj4bRP9HhyknscLZNJYSaCGd2zUP1xDUyw');

async function testKey() {
  try {
    console.log("Testeando llave de Facturapi...");
    const products = await facturapi.products.list();
    console.log("Llave válida! Productos conectados:", products.data.length);
    
    // Test creating a dummy invoice to verify CFDI 4.0 payload acceptance
    const receipt = await facturapi.invoices.create({
      customer: {
        legal_name: 'PUBLICO EN GENERAL',
        tax_id: 'XAXX010101000',
        tax_system: '616',
        address: { zip: '00000' }
      },
      items: [{
        product: {
          description: 'Servicio de prueba',
          product_key: '01010101',
          price: 100,
          taxes: [{ type: 'IVA', rate: 0.16 }]
        },
        quantity: 1
      }],
      use: 'S01',
      payment_form: '01',
      payment_method: 'PUE'
    });
    console.log("Factura 4.0 de prueba creada correctamente. ID de Factura (Facturapi UUID):", receipt.id);
    console.log("Estatus SAT:", receipt.status);

  } catch (error) {
    console.error("Error validando la llave:");
    console.error(error);
  }
}

testKey();
