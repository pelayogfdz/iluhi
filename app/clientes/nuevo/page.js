export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import prisma from '../../../lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '../../../lib/auth';
import ClienteForm from './ClienteForm';

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

  // 1. Find users with assignment permissions (Admin global access)
  const admins = await prisma.usuario.findMany({
    where: { permisoAsignacionClientes: true },
    select: { id: true }
  });

  // 2. Find users who currently have ALL clients assigned to them
  const totalClientes = await prisma.cliente.count();
  const allUsersWithCounts = await prisma.usuario.findMany({
    select: { id: true, _count: { select: { clientesAsignados: true } } }
  });
  const usersWithAllClients = allUsersWithCounts.filter(u => u._count.clientesAsignados === totalClientes);

  const idsToConnectSet = new Set([
    ...admins.map(a => a.id),
    ...usersWithAllClients.map(u => u.id)
  ]);

  // 3. Add the current user if not already in the list
  if (currentUser && currentUser.id) {
    idsToConnectSet.add(currentUser.id);
  }

  const idsToConnect = Array.from(idsToConnectSet);

  let success = false;
  let errorMsg = 'Error_del_servidor';
  try {
    const existing = await prisma.cliente.findUnique({
      where: { rfc }
    });

    if (existing) {
      // If client exists (e.g., imported from invoices), update details and connect current user
      await prisma.cliente.update({
        where: { id: existing.id },
        data: {
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
    } else {
      // Otherwise, create a new one normally
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
    }
    success = true;
  } catch (error) {
    console.error("Error creating/updating client:", error);
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
        <ClienteForm createClienteAction={createCliente} />
      </div>
    </div>
  )
}

