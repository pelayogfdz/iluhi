import prisma from '../../../lib/prisma'
import { getSessionUser } from '../../../lib/auth'
import ComplementosClient from './ComplementosClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ComplementosPage({ searchParams }) {
  const user = await getSessionUser()
  if (!user || !user.permisoFacturas) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#ff4444' }}>No autorizado.</div>
  }

  const [ppdFacturas, empresas, clientes] = await Promise.all([
    // Cargar facturas PPD
    prisma.factura.findMany({
      where: {
        metodoPago: 'PPD',
        estatus: { not: 'Cancelada' },
        empresa: user?.empresasIds?.length > 0 ? { id: { in: user.empresasIds } } : {}
      },
      include: {
        empresa: true,
        cliente: true
      },
      orderBy: { fechaEmision: 'desc' }
    }),
    prisma.empresa.findMany({
      where: user?.empresasIds?.length > 0 ? { id: { in: user.empresasIds } } : {},
      select: { id: true, razonSocial: true },
      orderBy: { razonSocial: 'asc' }
    }),
    prisma.cliente.findMany({
      select: { id: true, razonSocial: true },
      orderBy: { razonSocial: 'asc' }
    })
  ])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1>Módulo de Complementos de Pago (REP)</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Genera y administra complementos para facturas timbradas en PPD.</p>
        </div>
        <Link href="/facturas">
          <button className="btn btn-secondary">Regresar a Facturas</button>
        </Link>
      </div>
      
      <ComplementosClient 
        ppdFacturas={ppdFacturas}
        empresas={empresas}
        clientes={clientes}
      />
    </div>
  )
}
