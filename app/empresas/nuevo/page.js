export const dynamic = 'force-dynamic'

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
  const calle = formData.get('calle') || ''
  const numExterior = formData.get('numExterior') || ''
  const numInterior = formData.get('numInterior') || ''
  const colonia = formData.get('colonia') || ''
  const municipio = formData.get('municipio') || ''
  const ciudad = formData.get('ciudad') || ''
  const estado = formData.get('estado') || ''
  const tipoEmpresa = formData.get('tipoEmpresa') || null
  const numeroRepse = formData.get('numeroRepse') || null
  const representanteLegal = formData.get('representanteLegal') || null
  const apoderado = formData.get('apoderado') || null
  const objetoSocial = formData.get('objetoSocial') || null
  const actividadEconomica = formData.get('actividadEconomica') || null

  const telefono = formData.get('telefono') || null
  const paginaWeb = formData.get('paginaWeb') || null
  const redSocialFacebook = formData.get('redSocialFacebook') || null
  const redSocialInstagram = formData.get('redSocialInstagram') || null
  const redSocialLinkedin = formData.get('redSocialLinkedin') || null
  const redSocialX = formData.get('redSocialX') || null
  const googleMapsUrl = formData.get('googleMapsUrl') || null
  
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
      legal_name: razonSocial,
      tax_id: rfc,
      tax_system: regimen.split(' ')[0], // Facturapi espera el número (ej. "601")
      address: {
        zip: codigoPostal,
        street: calle || undefined,
        exterior: numExterior || undefined,
        interior: numInterior || undefined,
        neighborhood: colonia || undefined,
        city: ciudad || undefined,
        municipality: municipio || undefined,
        state: estado || undefined
      }
    });
    console.log("Configuración Legal sincronizada con Facturapi.");

    // Configurar automáticamente las series para que empiecen en el folio 5000
    try {
      await facturapi.organizations.updateSeriesGroup(org.id, 'F', { next_folio: 5000, next_folio_test: 5000 });
      await facturapi.organizations.updateSeriesGroup(org.id, 'NC', { next_folio: 5000, next_folio_test: 5000 });
      await facturapi.organizations.updateSeriesGroup(org.id, 'P', { next_folio: 5000, next_folio_test: 5000 });
      console.log("Series (F, NC, P) configuradas para iniciar en el folio 5000.");
    } catch (seriesErr) {
      console.error("Error al configurar series a 5000:", seriesErr);
    }

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
      calle,
      numExterior,
      numInterior,
      colonia,
      municipio,
      ciudad,
      estado,
      facturapiId,
      facturapiLiveKey,
      facturapiTestKey,
      tipoEmpresa,
      numeroRepse,
      representanteLegal,
      apoderado,
      objetoSocial,
      actividadEconomica,
      telefono,
      paginaWeb,
      redSocialFacebook,
      redSocialInstagram,
      redSocialLinkedin,
      redSocialX,
      googleMapsUrl
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

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="tipoEmpresa">Tipo de Empresa</label>
              <select id="tipoEmpresa" name="tipoEmpresa" className="form-control" required style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <option value="">-- Seleccionar Tipo --</option>
                <option value="RECEPTORA">RECEPTORA</option>
                <option value="INTERMEDIARIA">INTERMEDIARIA</option>
                <option value="PAGADORA">PAGADORA</option>
                <option value="RECEPTORA ESPECIAL">RECEPTORA ESPECIAL</option>
                <option value="INTERMEDIARIA ESPECIAL">INTERMEDIARIA ESPECIAL</option>
                <option value="CLIENTE">CLIENTE</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="numeroRepse">Nº REPSE (Opcional)</label>
              <input type="text" id="numeroRepse" name="numeroRepse" className="form-control" placeholder="Ej. AR123456" />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="razonSocial">Razón Social</label>
            <input type="text" id="razonSocial" name="razonSocial" className="form-control" required placeholder="Ej. Corporativo Ejemplo S.A. de C.V." />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="representanteLegal">Representante Legal (Opcional)</label>
              <input type="text" id="representanteLegal" name="representanteLegal" className="form-control" placeholder="Nombre completo del representante" />
            </div>
            <div className="form-group">
              <label htmlFor="apoderado">Apoderado Legal (Opcional)</label>
              <input type="text" id="apoderado" name="apoderado" className="form-control" placeholder="Nombre completo del apoderado" />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="objetoSocial">Actividad / Objeto Social (Opcional)</label>
            <textarea id="objetoSocial" name="objetoSocial" className="form-control" placeholder="Describe la actividad social de la empresa..." rows="3"></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="actividadEconomica">Actividad Económica (Se actualizará con la CSF automáticamente)</label>
            <textarea id="actividadEconomica" name="actividadEconomica" className="form-control" placeholder="Se extraerá de la Constancia de Situación Fiscal..." rows="3" disabled style={{ opacity: 0.7 }}></textarea>
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

          <div className="form-grid-3">
            <div className="form-group">
              <label htmlFor="calle">Calle</label>
              <input type="text" id="calle" name="calle" className="form-control" placeholder="Ej. Av. Reforma" />
            </div>
            <div className="form-group">
              <label htmlFor="numExterior">Núm. Exterior</label>
              <input type="text" id="numExterior" name="numExterior" className="form-control" placeholder="Ej. 222" />
            </div>
            <div className="form-group">
              <label htmlFor="numInterior">Núm. Interior</label>
              <input type="text" id="numInterior" name="numInterior" className="form-control" placeholder="Ej. Int. 4" />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="colonia">Colonia</label>
              <input type="text" id="colonia" name="colonia" className="form-control" placeholder="Ej. Juárez" />
            </div>
            <div className="form-group">
              <label htmlFor="municipio">Municipio/Alcaldía</label>
              <input type="text" id="municipio" name="municipio" className="form-control" placeholder="Ej. Cuauhtémoc" />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="ciudad">Ciudad</label>
              <input type="text" id="ciudad" name="ciudad" className="form-control" placeholder="Ej. Ciudad de México" />
            </div>
            <div className="form-group">
              <label htmlFor="estado">Estado</label>
              <input type="text" id="estado" name="estado" className="form-control" placeholder="Ej. Ciudad de México" />
            </div>
          </div>

        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header">
            <h3>Redes Sociales, Contacto y Presencia Digital</h3>
          </div>
          <div className="card-body">
            <div className="grid-2">
              <div className="form-group">
                <label htmlFor="telefono">Teléfono Principal</label>
                <input type="text" id="telefono" name="telefono" className="form-control" placeholder="Ej. 55 1234 5678" />
              </div>
              <div className="form-group">
                <label htmlFor="paginaWeb">Página Web</label>
                <input type="url" id="paginaWeb" name="paginaWeb" className="form-control" placeholder="Ej. https://www.miempresa.com" />
              </div>
              <div className="form-group">
                <label htmlFor="googleMapsUrl">Google Maps (URL Perfil)</label>
                <input type="url" id="googleMapsUrl" name="googleMapsUrl" className="form-control" placeholder="Link de Google Maps" />
              </div>
              <div className="form-group">
                <label htmlFor="redSocialFacebook">Facebook (Usuario o URL)</label>
                <input type="text" id="redSocialFacebook" name="redSocialFacebook" className="form-control" placeholder="Ej. miempresa.oficial" />
              </div>
              <div className="form-group">
                <label htmlFor="redSocialInstagram">Instagram (Usuario)</label>
                <input type="text" id="redSocialInstagram" name="redSocialInstagram" className="form-control" placeholder="Ej. @miempresa" />
              </div>
              <div className="form-group">
                <label htmlFor="redSocialLinkedin">LinkedIn (Usuario o URL)</label>
                <input type="text" id="redSocialLinkedin" name="redSocialLinkedin" className="form-control" placeholder="Ej. miempresa" />
              </div>
              <div className="form-group">
                <label htmlFor="redSocialX">X / Twitter (Usuario)</label>
                <input type="text" id="redSocialX" name="redSocialX" className="form-control" placeholder="Ej. @miempresa" />
              </div>
            </div>
          </div>
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
