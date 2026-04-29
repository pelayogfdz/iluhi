import { redirect } from 'next/navigation'
import Link from 'next/link'
import prisma from '../../../lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '../../../lib/auth';
import SearchableSelect from '../../components/SearchableSelect'

async function createCliente(formData) {
  'use server'

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  let currentUser = undefined;
  if (sessionToken) {
    currentUser = await decrypt(sessionToken);
  }

  const rfc = formData.get('rfc')
  const razonSocial = formData.get('razonSocial')
  const regimen = formData.get('regimen')
  const codigoPostal = formData.get('codigoPostal')
  const usoCfdi = formData.get('usoCfdi')
  const correoDestino = formData.get('correoDestino')
  const correoDestino2 = formData.get('correoDestino2')
  const correoDestino3 = formData.get('correoDestino3')

  const contactoPrincipal = formData.get('contactoPrincipal')
  const telefono = formData.get('telefono')
  const condicionesPago = formData.get('condicionesPago')
  const cuentaBancaria = formData.get('cuentaBancaria')
  
  const calle = formData.get('calle')
  const numExterior = formData.get('numExterior')
  const numInterior = formData.get('numInterior')
  const colonia = formData.get('colonia')
  const municipio = formData.get('municipio')
  const ciudad = formData.get('ciudad')
  const estado = formData.get('estado')

  // Find users with assignment permissions
  const admins = await prisma.usuario.findMany({
    where: { permisoAsignacionClientes: true },
    select: { id: true }
  });

  const idsToConnect = admins.map(a => a.id);
  // Add the current user if not already in the list
  if (currentUser && currentUser.id && !idsToConnect.includes(currentUser.id)) {
    idsToConnect.push(currentUser.id);
  }

  let success = false;
  let errorMsg = 'Error_del_servidor';
  try {
    await prisma.cliente.create({
      data: {
        rfc,
        razonSocial,
        regimen,
        codigoPostal,
        usoCfdi,
        correoDestino,
        correoDestino2,
        correoDestino3,
        contactoPrincipal,
        telefono,
        condicionesPago,
        cuentaBancaria,
        calle,
        numExterior,
        numInterior,
        colonia,
        municipio,
        ciudad,
        estado,
        usuariosAsignados: idsToConnect.length > 0 
          ? { connect: idsToConnect.map(id => ({ id })) } 
          : undefined
      }
    });
    success = true;
  } catch (error) {
    console.error("Error creating client:", error);
    if (error.code === 'P2002') errorMsg = 'RFC_Duplicado';
  }
  
  if (success) {
    redirect('/clientes')
  } else {
    redirect(`/clientes/nuevo?error=${errorMsg}`)
  }
}

export default async function NuevoClientePage({ searchParams }) {
  const resolvedParams = await searchParams || {};
  const { error } = resolvedParams;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <h1>Alta de Cliente CFDI 4.0</h1>
         <Link href="/clientes"><button className="btn btn-secondary">Regresar</button></Link>
      </div>
      
      {error && (
        <div style={{ background: '#ff4444', color: 'white', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
          <strong>Error: </strong> 
          {error === 'RFC_Duplicado' 
            ? 'Ya existe un cliente registrado con ese RFC.' 
            : 'Ocurrió un error inesperado al intentar guardar el cliente.'}
        </div>
      )}

      <div className="glass-panel" style={{ marginTop: '2rem', maxWidth: '600px' }}>
        <form action={createCliente} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          <div className="form-group">
            <label htmlFor="rfc">RFC del Cliente</label>
            <input type="text" id="rfc" name="rfc" className="form-control" required placeholder="Ej. XAXX010101000" />
            <small style={{ color: 'var(--text-secondary)' }}>Debe tener 12 o 13 caracteres.</small>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid var(--primary)', marginBottom: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <strong>Nota de Privacidad:</strong> Este cliente se asignará automáticamente a tu usuario para que puedas gestionarlo, y también a los administradores con el permiso de Asignación Global.
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="razonSocial">Razón Social (idéntica a Constancia Fiscal)</label>
            <input type="text" id="razonSocial" name="razonSocial" className="form-control" required placeholder="Ej. PUBLICO EN GENERAL" />
            <small style={{ color: 'var(--text-secondary)' }}>Sin régimen societario (S.A. de C.V.) para CFDI 4.0</small>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="regimen">Régimen Fiscal Receptor</label>
                <SearchableSelect 
                  name="regimen"
                  options={[
                    { value: "601", label: "601 - General de Ley Personas Morales" },
                    { value: "603", label: "603 - Personas Morales con Fines no Lucrativos" },
                    { value: "605", label: "605 - Sueldos y Salarios e Ingresos Asimilados a Salarios" },
                    { value: "606", label: "606 - Arrendamiento" },
                    { value: "607", label: "607 - Régimen de Enajenación o Adquisición de Bienes" },
                    { value: "608", label: "608 - Demás ingresos" },
                    { value: "610", label: "610 - Residentes en el Extranjero sin E.P. en México" },
                    { value: "611", label: "611 - Ingresos por Dividendos (socios y accionistas)" },
                    { value: "612", label: "612 - Personas Físicas con Actividades Empresariales y Profesionales" },
                    { value: "614", label: "614 - Ingresos por intereses" },
                    { value: "615", label: "615 - Régimen de los ingresos por obtención de premios" },
                    { value: "616", label: "616 - Sin obligaciones fiscales" },
                    { value: "620", label: "620 - Sociedades Cooperativas de Producción" },
                    { value: "621", label: "621 - Incorporación Fiscal" },
                    { value: "622", label: "622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras" },
                    { value: "623", label: "623 - Opcional para Grupos de Sociedades" },
                    { value: "624", label: "624 - Coordinados" },
                    { value: "625", label: "625 - Régimen de las Actividades Emp. Plataformas Tecnológicas" },
                    { value: "626", label: "626 - Régimen Simplificado de Confianza (RESICO)" },
                    { value: "628", label: "628 - Hidrocarburos" },
                    { value: "629", label: "629 - De los Regímenes Fiscales Preferentes y de las Empresas Multinacionales" },
                    { value: "630", label: "630 - Enajenación de acciones en bolsa de valores" }
                  ]}
                  placeholder="-- Seleccionar Régimen --"
                  required={true}
                />
              </div>

              <div className="form-group">
                <label htmlFor="codigoPostal">Domicilio Fiscal (C.P.)</label>
                <input type="text" id="codigoPostal" name="codigoPostal" className="form-control" required placeholder="Ej. 11000" />
              </div>
          </div>

          <div className="form-group">
            <label htmlFor="usoCfdi">Uso de CFDI por defecto</label>
            <SearchableSelect 
              name="usoCfdi"
              options={[
                { value: "G01", label: "G01 - Adquisición de mercancías" },
                { value: "G02", label: "G02 - Devoluciones, descuentos o bonificaciones" },
                { value: "G03", label: "G03 - Gastos en general" },
                { value: "I01", label: "I01 - Construcciones" },
                { value: "I02", label: "I02 - Mobiliario y equipo de oficina por inversiones" },
                { value: "I03", label: "I03 - Equipo de transporte" },
                { value: "I04", label: "I04 - Equipo de computo y accesorios" },
                { value: "I05", label: "I05 - Dados, troqueles, moldes, matrices y herramental" },
                { value: "I06", label: "I06 - Comunicaciones telefónicas" },
                { value: "I07", label: "I07 - Comunicaciones satelitales" },
                { value: "I08", label: "I08 - Otra maquinaria y equipo" },
                { value: "D01", label: "D01 - Honorarios médicos, dentales y hospitalarios" },
                { value: "D02", label: "D02 - Gastos médicos por incapacidad o discapacidad" },
                { value: "D03", label: "D03 - Gastos funerales" },
                { value: "D04", label: "D04 - Donativos" },
                { value: "D05", label: "D05 - Intereses reales efectivamente pagados por créditos hipotecarios" },
                { value: "D06", label: "D06 - Aportaciones voluntarias al SAR" },
                { value: "D07", label: "D07 - Primas por seguros de gastos médicos" },
                { value: "D08", label: "D08 - Gastos de transportación escolar obligatoria" },
                { value: "D09", label: "D09 - Depósitos en cuentas para el ahorro, planes de pensiones" },
                { value: "D10", label: "D10 - Pagos por servicios educativos (colegiaturas)" },
                { value: "P01", label: "P01 - Por definir (Solo comprobante de Pagos y Retenciones)" },
                { value: "S01", label: "S01 - Sin efectos fiscales" },
                { value: "CP01", label: "CP01 - Pagos" },
                { value: "CN01", label: "CN01 - Nómina" }
              ]}
              placeholder="-- Seleccionar Uso CFDI --"
              required={true}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="correoDestino">Correo Facturación 1</label>
              <input type="email" id="correoDestino" name="correoDestino" className="form-control" placeholder="admin@empresa.com" />
            </div>
            <div className="form-group">
              <label htmlFor="correoDestino2">Correo Facturación 2</label>
              <input type="email" id="correoDestino2" name="correoDestino2" className="form-control" placeholder="pagos@empresa.com" />
            </div>
            <div className="form-group">
              <label htmlFor="correoDestino3">Correo Facturación 3</label>
              <input type="email" id="correoDestino3" name="correoDestino3" className="form-control" placeholder="adicional@empresa.com" />
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />

          <h3 style={{ color: 'var(--primary)' }}>Contacto y Comercial (CRM)</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem' }}>
            <div className="form-group">
              <label>Contacto Principal</label>
              <input type="text" name="contactoPrincipal" className="form-control" />
            </div>
            <div className="form-group">
              <label>Teléfono Principal</label>
              <input type="tel" name="telefono" className="form-control" />
            </div>
            <div className="form-group">
              <label>Condiciones de Pago (Días)</label>
              <SearchableSelect 
                name="condicionesPago"
                options={[
                  { value: "Contado", label: "Contado" },
                  { value: "15 Días", label: "15 Días" },
                  { value: "30 Días", label: "30 Días" },
                  { value: "45 Días", label: "45 Días" },
                  { value: "60 Días", label: "60 Días" },
                  { value: "90 Días", label: "90 Días" }
                ]}
                placeholder="-- Seleccionar --"
              />
            </div>
            <div className="form-group">
              <label>Cuenta Bancaria principal (Opcional)</label>
              <input type="text" name="cuentaBancaria" className="form-control" />
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />

          <h3 style={{ color: 'var(--primary)' }}>Datos Logísticos Adicionales</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem' }}>
            <div className="form-group">
              <label>Calle</label>
              <input type="text" name="calle" className="form-control" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem' }}>
               <div className="form-group">
                 <label>N° Exterior</label>
                 <input type="text" name="numExterior" className="form-control" />
               </div>
               <div className="form-group">
                 <label>N° Interior</label>
                 <input type="text" name="numInterior" className="form-control" />
               </div>
            </div>
            
            <div className="form-group">
              <label>Colonia / Asentamiento</label>
              <input type="text" name="colonia" className="form-control" />
            </div>
            <div className="form-group">
              <label>Municipio / Alcaldía</label>
              <input type="text" name="municipio" className="form-control" />
            </div>
            
            <div className="form-group">
              <label>Ciudad</label>
              <input type="text" name="ciudad" className="form-control" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Estado</label>
              <input type="text" name="estado" className="form-control" />
            </div>
          </div>

          <button type="submit" className="btn">Guardar Cliente</button>
        </form>
      </div>
    </div>
  )
}
