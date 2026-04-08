import { PrismaClient } from '@prisma/client'
import Link from 'next/link'

const prisma = new PrismaClient()

export default async function ClientesPage() {
  const clientes = await prisma.cliente.findMany({ include: { empresa: true } })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <h1>Directorio de Clientes</h1>
         <Link href="/clientes/nuevo"><button className="btn">Nuevo Cliente</button></Link>
      </div>
      
      <div className="glass-panel" style={{ marginTop: '2rem' }}>
        <table className="table-glass">
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
                <td><button className="btn" style={{padding: '0.4rem 1rem'}}>Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
