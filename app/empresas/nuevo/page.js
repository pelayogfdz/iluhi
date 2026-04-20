import { redirect } from 'next/navigation'
import Link from 'next/link'
import prisma from '../../../lib/prisma';

import facturapi from '../../../lib/facturapi';

async function createEmpresa(formData) {
  'use server'

  const rfc = formData.get('rfc')
  const razonSocial = formData.get('razonSocial')
  const regimen = formData.get('regimen')
  const codigoPostal = formData.get('codigoPostal')
  
  // Create organization in Facturapi using the User Key
  let facturapiId = null;
  let facturapiLiveKey = null;
  let facturapiTestKey = null;

  try {
    const org = await facturapi.organizations.create({ name: razonSocial });
    facturapiId = org.id;
    facturapiLiveKey = org.liveApiKey;
    facturapiTestKey = org.testApiKey;
    console.log("Organización Creada en Facturapi:", org.id);

    // Completamos la información Legal (Crucial para timbrar al 100%)
    await facturapi.organizations.updateLegal(org.id, {
      name: razonSocial,
      tax_id: rfc,
      tax_system: regimen.split(' ')[0], // Facturapi espera el número (ej. "601")
      zip: codigoPostal
    });
    console.log("Configuración Legal sincronizada con Facturapi.");

  } catch (error) {
    console.error("Error al crear Organización en Facturapi:", error);
    // You could throw an error here to prevent company creation if Facturapi fails
    // throw new Error("No se pudo registrar la empresa en el facturador.");
  }
  
  await prisma.empresa.create({
    data: {
      rfc,
      razonSocial,
      regimen,
      codigoPostal,
      facturapiId,
      facturapiLiveKey,
      facturapiTestKey
    }
  })
  
  redirect('/empresas')
}

export default function NuevaEmpresaPage() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <h1>Alta de Empresa Emisora</h1>
         <Link href="/empresas"><button className="btn btn-secondary">Regresar</button></Link>
      </div>
      
      <div className="glass-panel" style={{ marginTop: '2rem', maxWidth: '600px' }}>
        <form action={createEmpresa} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="form-group">
            <label htmlFor="rfc">RFC de la Empresa</label>
            <input type="text" id="rfc" name="rfc" className="form-control" required placeholder="Ej. ABC123456T8" />
          </div>

          <div className="form-group">
            <label htmlFor="razonSocial">Razón Social</label>
            <input type="text" id="razonSocial" name="razonSocial" className="form-control" required placeholder="Ej. Corporativo Ejemplo S.A. de C.V." />
          </div>

          <div className="form-group">
            <label htmlFor="regimen">Régimen Fiscal (Clave SAT)</label>
            <input type="text" id="regimen" name="regimen" className="form-control" required placeholder="Ej. 601 (General de Ley Personas Morales)" />
          </div>

          <div className="form-group">
            <label htmlFor="codigoPostal">Código Postal</label>
            <input type="text" id="codigoPostal" name="codigoPostal" className="form-control" required placeholder="Ej. 11000" />
          </div>

          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginTop: '1rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Los archivos de Sello Digital (.cer, .key) y la contraseña se configuran por separado en la interfaz de seguridad una vez que la empresa esté dada de alta.
            </p>
          </div>

          <button type="submit" className="btn">Guardar Empresa</button>
        </form>
      </div>
    </div>
  )
}
