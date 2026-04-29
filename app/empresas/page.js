import prisma from '../../lib/prisma';
import Link from 'next/link'
import ClientTableActions from './ClientTableActions'
import SearchBar from '../components/SearchBar'

export const dynamic = 'force-dynamic'



import { getSessionUser } from '../../lib/auth';

export default async function EmpresasPage({ searchParams }) {
  const resolvedParams = await searchParams
  const q = resolvedParams?.q || ""
  const user = await getSessionUser()

  const whereClauses = []
  if (q) {
      whereClauses.push({
        OR: [
          { razonSocial: { contains: q, mode: 'insensitive' } },
          { rfc: { contains: q, mode: 'insensitive' } },
          { codigoPostal: { contains: q } }
        ]
      })
  }

  if (user?.empresasIds?.length > 0) {
      whereClauses.push({ id: { in: user.empresasIds } })
  }

  const finalWhere = whereClauses.length > 0 ? { AND: whereClauses } : {}

  const empresas = await prisma.empresa.findMany({
    where: finalWhere,
    orderBy: { razonSocial: 'asc' }
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
              <th>FIEL (e.firma)</th>
              <th>Mail</th>
              <th>Estatus SAT</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empresas.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                  No hay empresas configuradas. Agrega una para comenzar a facturar.
                </td>
              </tr>
            ) : empresas.map((emp) => (
              <tr key={emp.id}>
                <td>{emp.rfc}</td>
                <td>{emp.razonSocial}</td>
                <td>{emp.regimen}</td>
                <td>{emp.cerPath ? '✅' : '❌'}</td>
                <td>{emp.fielCerBase64 ? '✅' : '❌'}</td>
                <td>{emp.smtpHost && emp.smtpUser && emp.smtpPass ? '✅' : '❌'}</td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: emp.opinionCumplimiento === 'POSITIVA' ? '#10b981' : 
                                emp.opinionCumplimiento === 'NEGATIVA' ? '#ef4444' : '#6b7280',
                    boxShadow: emp.opinionCumplimiento === 'POSITIVA' ? '0 0 8px #10b981' : 
                               emp.opinionCumplimiento === 'NEGATIVA' ? '0 0 8px #ef4444' : 'none'
                  }} title={emp.opinionCumplimiento || 'Pendiente'}></div>
                </td>
                <td>
                  <ClientTableActions empresaId={emp.id} canDelete={user?.permisoEliminarEmpresas} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
