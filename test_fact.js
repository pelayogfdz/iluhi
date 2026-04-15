const Facturapi = require('facturapi').default;
const fs = require('fs');

async function test() {
  try {
    const facturapi = new Facturapi('sk_test_FBr4Hd3aZj4bRP9HhyknscLZNJYSaCGd2zUP1xDUyw');
    const org = await facturapi.organizations.me();
    console.log("Org ID:", org.id);

    // Create a dummy image file
    const fs = require('fs');
    fs.writeFileSync('dummy.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNiAAAABgADNjd8qAAAAABJRU5ErkJggg==', 'base64'));

    const fileBuffer = fs.readFileSync('dummy.png');
    
    // Note: Node.js 18 File or Blob might be required, but facturapi supports buffer?
    // Let's pass a blob
    const blob = new Blob([fileBuffer], { type: 'image/png' });
    
    await facturapi.organizations.uploadLogo(org.id, blob);
    console.log("Uploaded successfully!");
  } catch (e) {
    console.error("Failed:", e.message || e);
  }
}

test();
