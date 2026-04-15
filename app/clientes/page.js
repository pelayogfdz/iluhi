import prisma from '../../lib/prisma';
import Link from 'next/link'
import ClientTableActions from './ClientTableActions'
import SearchBar from '../components/SearchBar'
import { cookies } from 'next/headers';
import { decrypt } from '../../lib/auth';

export const dynamic = 'force-dynamic'



export default async function ClientesPage({ searchParams }) {
  const resolvedParams = await searchParams
  const q = resolvedParams?.q || ""

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  let currentUser = undefined;
  if (sessionToken) {
    currentUser = await decrypt(sessionToken);
  }

  // Si tiene el permiso global, ve todos; si no, solo los que tiene asignados (o fue creador)
  const accessFilter = {};
  if (currentUser && !currentUser.permisoAsignacionClientes) {
    accessFilter.usuariosAsignados = { some: { id: currentUser.id } };
  }

  const clientes = await prisma.cliente.findMany({ 
    where: q ? {
      ...accessFilter,
      OR: [
        { razonSocial: { contains: q, mode: 'insensitive' } },
        { rfc: { contains: q, mode: 'insensitive' } },
        { codigoPostal: { contains: q } }
      ]
    } : { ...accessFilter },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
         <h1>Directorio de Clientes</h1>
         <Link href="/clientes/nuevo"><button className="btn">Nuevo Cliente</button></Link>
      </div>

      <SearchBar placeholder="Buscar por Razón Social, RFC o C.P..." />
      
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>RFC Cliente</th>
              <th>Razón Social</th>
              <th>C.P.</th>
              <th>Régimen</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                  No hay clientes registrados.
                </td>
              </tr>
            ) : clientes.map((c) => (
              <tr key={c.id}>
                <td>{c.rfc}</td>
                <td>{c.razonSocial}</td>
                <td>{c.codigoPostal}</td>
                <td>{c.regimen}</td>
                <td>
                  <ClientTableActions clienteId={c.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
