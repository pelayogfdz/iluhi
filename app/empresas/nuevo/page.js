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
    console.log("Organización Creada en Facturapi:", org.id);

    // En Facturapi API v2, las llaves no se devuelven en la creación de la organización por seguridad.
    // Debemos renovarlas explícitamente para obtener el secreto inicial y guardarlo.
    try {
      const liveKeyStr = await facturapi.organizations.renewLiveApiKey(org.id);
      const testKeyStr = await facturapi.organizations.renewTestApiKey(org.id);
      facturapiLiveKey = liveKeyStr;
      facturapiTestKey = testKeyStr;
      console.log("Llaves API renovadas exitosamente para el nuevo tenant.");
    } catch (keyErr) {
      console.error("Error renovando llaves API del tenant:", keyErr);
    }

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
            <label htmlFor="regimen">Régimen Fiscal Emisor (Clave SAT)</label>
            <select id="regimen" name="regimen" className="form-control" required style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                  <option value="">-- Seleccionar Régimen --</option>
                  <option value="601">601 - General de Ley Personas Morales</option>
                  <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
                  <option value="605">605 - Sueldos y Salarios e Ingresos Asimilados a Salarios</option>
                  <option value="606">606 - Arrendamiento</option>
                  <option value="607">607 - Régimen de Enajenación o Adquisición de Bienes</option>
                  <option value="608">608 - Demás ingresos</option>
                  <option value="610">610 - Residentes en el Extranjero sin E.P. en México</option>
                  <option value="611">611 - Ingresos por Dividendos (socios y accionistas)</option>
                  <option value="612">612 - Personas Físicas con Actividades Empresariales y Profesionales</option>
                  <option value="614">614 - Ingresos por intereses</option>
                  <option value="615">615 - Régimen de los ingresos por obtención de premios</option>
                  <option value="616">616 - Sin obligaciones fiscales</option>
                  <option value="620">620 - Sociedades Cooperativas de Producción</option>
                  <option value="621">621 - Incorporación Fiscal</option>
                  <option value="622">622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras</option>
                  <option value="623">623 - Opcional para Grupos de Sociedades</option>
                  <option value="624">624 - Coordinados</option>
                  <option value="625">625 - Régimen de las Actividades Emp. Plataformas Tecnológicas</option>
                  <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
                  <option value="628">628 - Hidrocarburos</option>
                  <option value="629">629 - De los Regímenes Fiscales Preferentes y de las Empresas Multinacionales</option>
                  <option value="630">630 - Enajenación de acciones en bolsa de valores</option>
            </select>
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
