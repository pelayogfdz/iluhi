import { redirect } from 'next/navigation'
import Link from 'next/link'
import prisma from '../../../lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '../../../lib/auth';

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
                <label htmlFor="codigoPostal">Domicilio Fiscal (C.P.)</label>
                <input type="text" id="codigoPostal" name="codigoPostal" className="form-control" required placeholder="Ej. 11000" />
              </div>
          </div>

          <div className="form-group">
            <label htmlFor="usoCfdi">Uso de CFDI por defecto</label>
            <select id="usoCfdi" name="usoCfdi" className="form-control" required style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <option value="">-- Seleccionar Uso CFDI --</option>
              <option value="G01">G01 - Adquisición de mercancías</option>
              <option value="G02">G02 - Devoluciones, descuentos o bonificaciones</option>
              <option value="G03">G03 - Gastos en general</option>
              <option value="I01">I01 - Construcciones</option>
              <option value="I02">I02 - Mobiliario y equipo de oficina por inversiones</option>
              <option value="I03">I03 - Equipo de transporte</option>
              <option value="I04">I04 - Equipo de computo y accesorios</option>
              <option value="I05">I05 - Dados, troqueles, moldes, matrices y herramental</option>
              <option value="I06">I06 - Comunicaciones telefónicas</option>
              <option value="I07">I07 - Comunicaciones satelitales</option>
              <option value="I08">I08 - Otra maquinaria y equipo</option>
              <option value="D01">D01 - Honorarios médicos, dentales y hospitalarios</option>
              <option value="D02">D02 - Gastos médicos por incapacidad o discapacidad</option>
              <option value="D03">D03 - Gastos funerales</option>
              <option value="D04">D04 - Donativos</option>
              <option value="D05">D05 - Intereses reales efectivamente pagados por créditos hipotecarios</option>
              <option value="D06">D06 - Aportaciones voluntarias al SAR</option>
              <option value="D07">D07 - Primas por seguros de gastos médicos</option>
              <option value="D08">D08 - Gastos de transportación escolar obligatoria</option>
              <option value="D09">D09 - Depósitos en cuentas para el ahorro, planes de pensiones</option>
              <option value="D10">D10 - Pagos por servicios educativos (colegiaturas)</option>
              <option value="P01">P01 - Por definir (Solo comprobante de Pagos y Retenciones)</option>
              <option value="S01">S01 - Sin efectos fiscales</option>
              <option value="CP01">CP01 - Pagos</option>
              <option value="CN01">CN01 - Nómina</option>
            </select>
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
              <select name="condicionesPago" className="form-control" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <option value="">-- Seleccionar --</option>
                <option value="Contado">Contado</option>
                <option value="15 Días">15 Días</option>
                <option value="30 Días">30 Días</option>
                <option value="45 Días">45 Días</option>
                <option value="60 Días">60 Días</option>
                <option value="90 Días">90 Días</option>
              </select>
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
