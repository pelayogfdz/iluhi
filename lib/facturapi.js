import Facturapi from 'facturapi';

// Inicializa el motor de timbrado con la llave maestra del SaaS
// FACTURAPI_KEY debe ir en tu archivo .env
const facturapi = new Facturapi(process.env.FACTURAPI_KEY || 'sk_test_DUMMY_PENDING');

export default facturapi;
