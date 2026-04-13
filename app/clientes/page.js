import prisma from '../../lib/prisma';
import Link from 'next/link'
import ClientTableActions from './ClientTableActions'
import SearchBar from '../components/SearchBar'

export const dynamic = 'force-dynamic'



export default async function ClientesPage({ searchParams }) {
  const resolvedParams = await searchParams
  const q = resolvedParams?.q || ""

  const clientes = await prisma.cliente.findMany({ 
    include: { empresa: true },
    where: q ? {
      OR: [
        { razonSocial: { contains: q, mode: 'insensitive' } },
        { rfc: { contains: q, mode: 'insensitive' } },
        { codigoPostal: { contains: q } }
      ]
    } : {},
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
              <th>Empresa Origen</th>
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
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                  No hay clientes registrados. (Recuerda que cada cliente pertenece a una Empresa Emisora concreta).
                </td>
              </tr>
            ) : clientes.map((c) => (
              <tr key={c.id}>
                <td>{c.empresa.razonSocial}</td>
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
