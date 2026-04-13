import prisma from '../../lib/prisma';
import Link from 'next/link'
import SearchBar from '../components/SearchBar'

export const dynamic = 'force-dynamic'



import { getSessionUser } from '../../lib/auth';

export default async function ProductosPage({ searchParams }) {
  const resolvedParams = await searchParams
  const q = resolvedParams?.q || ""
  const user = await getSessionUser()

  const whereClauses = []
  if (q) {
      whereClauses.push({
        OR: [
          { descripcion: { contains: q, mode: 'insensitive' } },
          { noIdentificacion: { contains: q, mode: 'insensitive' } },
          { claveProdServ: { contains: q } }
        ]
      })
  }
  if (user?.empresasIds?.length > 0) {
      whereClauses.push({ empresaId: { in: user.empresasIds } })
  }
  const finalWhere = whereClauses.length > 0 ? { AND: whereClauses } : {}

  const productos = await prisma.producto.findMany({ 
    include: { empresa: true },
    where: finalWhere,
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
         <h1>Catálogo de Productos y Servicios</h1>
         <Link href="/productos/nuevo"><button className="btn">Nuevo Concepto</button></Link>
      </div>
      
      <SearchBar placeholder="Buscar por Nombre, No. de Identificación o Clave SAT..." />

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>No. Identificación</th>
              <th>Descripción</th>
              <th>Clave SAT</th>
              <th>Unidad SAT</th>
              <th>Precio Venta</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                  No hay productos registrados. Agrega los servicios y conceptos ligados a una empresa.
                </td>
              </tr>
            ) : productos.map((p) => (
              <tr key={p.id}>
                <td>{p.empresa.razonSocial}</td>
                <td>{p.noIdentificacion}</td>
                <td>{p.descripcion}</td>
                <td>{p.claveProdServ}</td>
                <td>{p.claveUnidad}</td>
                <td>${p.precio.toFixed(2)}</td>
                <td>
                  <Link href={`/productos/editar/${p.id}`}>
                    <button className="btn" style={{padding: '0.4rem 1rem'}}>Editar</button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
