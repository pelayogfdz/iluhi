import { PrismaClient } from '@prisma/client'
import Link from 'next/link'
import SearchBar from '../components/SearchBar'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export default async function FacturaHubPage({ searchParams }) {
  const resolvedParams = await searchParams
  const q = resolvedParams?.q || ""

  const facturas = await prisma.factura.findMany({
    include: {
       empresa: true,
       cliente: true
    },
    where: q ? {
       OR: [
         { uuid: { contains: q, mode: 'insensitive' } },
         { estatus: { contains: q, mode: 'insensitive' } },
         { empresa: { razonSocial: { contains: q, mode: 'insensitive' } } },
         { cliente: { razonSocial: { contains: q, mode: 'insensitive' } } }
       ]
    } : {},
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>Facturas (CFDI 4.0)</h1>
        <Link href="/facturas/nuevo">
          <button className="btn">⭐ Emitir Nueva Factura</button>
        </Link>
      </div>
      
      <SearchBar placeholder="Buscar por UUID, Estatus o Empresas..." />

      <div>
        <table className="table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--primary)' }}>
              <th>ID Interno / UUID</th>
              <th>Emisor</th>
              <th>Receptor</th>
              <th>Total</th>
              <th>Estatus</th>
            </tr>
          </thead>
          <tbody>
            {facturas.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center' }}>No existen facturas timbradas aún.</td></tr>
            ) : facturas.map(fac => (
              <tr key={fac.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem 0' }}>{fac.uuid || 'En Proceso...'}</td>
                <td>{fac.empresa.razonSocial}</td>
                <td>{fac.cliente.razonSocial}</td>
                <td>${fac.total.toFixed(2)}</td>
                <td>
                  <span style={{ 
                     padding: '4px 8px', borderRadius: '4px', fontSize: '12px',
                     background: fac.estatus.includes('Timbrada') ? 'rgba(0,255,0,0.2)' : 'rgba(255,255,0,0.2)',
                     color: fac.estatus.includes('Timbrada') ? 'lightgreen' : 'yellow'
                  }}>{fac.estatus}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
