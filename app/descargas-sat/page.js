import prisma from '../../lib/prisma';
import Link from 'next/link'
import DescargasSatClient from './DescargasSatClient'

export const dynamic = 'force-dynamic'

export default async function DescargasSatPage() {
  const empresas = await prisma.empresa.findMany({
    select: {
      id: true,
      rfc: true,
      razonSocial: true,
      fielCerBase64: true,
      fielVigencia: true,
      opinionCumplimiento: true,
      ultimaValidacionOpinion: true,
      _count: {
        select: {
          facturas: {
            where: { xmlBase64: { not: null } }
          }
        }
      }
    },
    orderBy: { razonSocial: 'asc' }
  })

  const serialized = empresas.map(emp => ({
    ...emp,
    fielVigencia: emp.fielVigencia?.toISOString() || null,
    ultimaValidacionOpinion: emp.ultimaValidacionOpinion?.toISOString() || null,
    hasFiel: !!emp.fielCerBase64,
    xmlCount: emp._count.facturas
  }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>📥 Descargas SAT</h1>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Centro de descargas masivas de XML, opinión de cumplimiento y buzón tributario para todas las empresas registradas.
      </p>
      <DescargasSatClient empresas={serialized} />
    </div>
  )
}
