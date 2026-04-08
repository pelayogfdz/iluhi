import { PrismaClient } from '@prisma/client'
import Link from 'next/link'

const prisma = new PrismaClient()

export default async function EmpresasPage() {
  const empresas = await prisma.empresa.findMany()

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <h1>Configuración de Empresas (Emisores)</h1>
         <Link href="/empresas/nuevo"><button className="btn">Agregar Empresa</button></Link>
      </div>
      
      <div className="glass-panel" style={{ marginTop: '2rem' }}>
        <table className="table-glass">
          <thead>
            <tr>
              <th>RFC</th>
              <th>Razón Social</th>
              <th>Régimen</th>
              <th>CSD Cargado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empresas.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                  No hay empresas configuradas. Agrega una para comenzar a facturar.
                </td>
              </tr>
            ) : empresas.map((emp) => (
              <tr key={emp.id}>
                <td>{emp.rfc}</td>
                <td>{emp.razonSocial}</td>
                <td>{emp.regimen}</td>
                <td>{emp.cerPath ? '✅' : '❌'}</td>
                <td><button className="btn" style={{padding: '0.4rem 1rem'}}>Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
