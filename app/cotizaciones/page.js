import prisma from '../../lib/prisma';
import Link from 'next/link'
import SearchBar from '../components/SearchBar'
import CotizacionesClient from './CotizacionesClient'

export const dynamic = 'force-dynamic'

import { getSessionUser } from '../../lib/auth';

export default async function CotizacionesHubPage({ searchParams }) {
  const resolvedParams = await searchParams
  const q = resolvedParams?.q || ""
  const empresaId = resolvedParams?.empresa || ""
  const fechaInicio = resolvedParams?.fechaInicio || ""
  const fechaFin = resolvedParams?.fechaFin || ""
  const orden = resolvedParams?.orden || "desc"

  const user = await getSessionUser();

  // Construir clausulas WHERE
  const andClauses = []
  
  if (q) {
    andClauses.push({
      OR: [
        { id: { contains: q, mode: 'insensitive' } },
        { estatus: { contains: q, mode: 'insensitive' } },
        { empresa: { razonSocial: { contains: q, mode: 'insensitive' } } },
        { cliente: { razonSocial: { contains: q, mode: 'insensitive' } } }
      ]
    })
  }

  if (empresaId) {
    if (user?.empresasIds?.length > 0 && !user.empresasIds.includes(empresaId)) {
      andClauses.push({ empresaId: 'restricted_forbidden' });
    } else {
      andClauses.push({ empresaId: empresaId })
    }
  } else if (user?.empresasIds?.length > 0) {
    andClauses.push({ empresaId: { in: user.empresasIds } });
  }

  if (fechaInicio || fechaFin) {
    const dates = {}
    if (fechaInicio) dates.gte = new Date(`${fechaInicio}T00:00:00.000Z`)
    if (fechaFin) dates.lte = new Date(`${fechaFin}T23:59:59.999Z`)
    andClauses.push({ fechaEmision: dates })
  }

  const whereClause = andClauses.length > 0 ? { AND: andClauses } : {}

  const [cotizaciones, empresas] = await Promise.all([
    prisma.cotizacion.findMany({
      include: {
         empresa: true,
         cliente: true
      },
      where: whereClause,
      orderBy: { fechaEmision: orden === 'asc' ? 'asc' : 'desc' }
    }),
    prisma.empresa.findMany({
      where: user?.empresasIds?.length > 0 ? { id: { in: user.empresasIds } } : {},
      select: { id: true, razonSocial: true },
      orderBy: { razonSocial: 'asc' }
    })
  ])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>Historial de Cotizaciones</h1>
        <Link href="/cotizaciones/nuevo">
          <button className="btn">⭐ Crear Nueva Cotización</button>
        </Link>
      </div>
      
      <SearchBar placeholder="Búsqueda libre por Cotización o Nombre de Empresa..." />
      <br/>

      <CotizacionesClient cotizacionesInitial={cotizaciones} empresas={empresas} />
    </div>
  )
}
