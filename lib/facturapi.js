import Facturapi from 'facturapi';

// Engine para operaciones administrativas (Crear organizaciones SaaS)
// OBLIGATORIO: FACTURAPI_USER_KEY en .env
const facturapiUser = new Facturapi(process.env.FACTURAPI_USER_KEY || 'sk_user_dummy');

// Si tenemos una llave Live global/maestra (Fallback de emergencia o uso interno centralizado)
export const facturapiLive = process.env.FACTURAPI_LIVE_KEY 
  ? new Facturapi(process.env.FACTURAPI_LIVE_KEY) 
  : facturapiUser; // Fallback al User Key para catálogos públicos

export default facturapiUser;
