import Facturapi from 'facturapi';

// Engine para operaciones administrativas (Crear organizaciones SaaS)
// OBLIGATORIO: FACTURAPI_USER_KEY en .env
const facturapiUser = new Facturapi(process.env.FACTURAPI_USER_KEY || 'sk_user_dummy');

// Si tenemos una llave Live global/maestra (Fallback de emergencia o uso interno centralizado)
// Usamos una llave de Test genérica si no hay Live Key, porque facturapiUser (SaaS) NO TIENE PERMISOS para consultar catálogos.
export const facturapiLive = process.env.FACTURAPI_LIVE_KEY 
  ? new Facturapi(process.env.FACTURAPI_LIVE_KEY) 
  : new Facturapi('sk_test_yBv7e6Y3P40Z8L2m2o8KpmxWbwzN1KjRDEd5VAXxog'); 

export default facturapiUser;
