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
                <input type="text" id="regimen" name="regimen" className="form-control" required placeholder="Ej. 616" />
              </div>

              <div className="form-group">
                <label htmlFor="codigoPostal">Domicilio Fiscal (C.P.)</label>
                <input type="text" id="codigoPostal" name="codigoPostal" className="form-control" required placeholder="Ej. 11000" />
              </div>
          </div>

          <div className="form-group">
            <label htmlFor="usoCfdi">Uso de CFDI por defecto</label>
            <select id="usoCfdi" name="usoCfdi" className="form-control" required style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <option value="G03">G03 - Gastos en general</option>
              <option value="S01">S01 - Sin efectos fiscales</option>
              <option value="P01">P01 - Por definir</option>
              <option value="D01">D01 - Honorarios médicos, dentales y hospitalarios</option>
              <option value="I08">I08 - Otra maquinaria y equipo</option>
            </select>
          </div>

          <button type="submit" className="btn">Guardar Cliente</button>
        </form>
      </div>
    </div>
  )
}

