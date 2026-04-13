import prisma from '../../lib/prisma';
import Link from 'next/link'
import ClientTableActions from './ClientTableActions'
import SearchBar from '../components/SearchBar'

export const dynamic = 'force-dynamic'



export default async function EmpresasPage({ searchParams }) {
  const resolvedParams = await searchParams
  const q = resolvedParams?.q || ""

  const empresas = await prisma.empresa.findMany({
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
         <h1>Configuración de Empresas (Emisores)</h1>
         <Link href="/empresas/nuevo"><button className="btn">Agregar Empresa</button></Link>
      </div>

      <SearchBar placeholder="Buscar por Razón Social, RFC o C.P..." />
      
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>RFC</th>
              <th>Razón Social</th>
              <th>Régimen</th>
              <th>CSD Cargado</th>
              <th>Mail</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empresas.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                  No hay empresas configuradas. Agrega una para comenzar a facturar.
                </td>
              </tr>
            ) : empresas.map((emp) => (
              <tr key={emp.id}>
                <td>{emp.rfc}</td>
                <td>{emp.razonSocial}</td>
                <td>{emp.regimen}</td>
                <td>{emp.cerPath ? '✅' : '❌'}</td>
                <td>{emp.smtpHost && emp.smtpUser && emp.smtpPass ? '✅' : '❌'}</td>
                <td>
                  <ClientTableActions empresaId={emp.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
