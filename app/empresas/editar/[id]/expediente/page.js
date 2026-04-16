import prisma from '../../../../../lib/prisma'
import { redirect } from 'next/navigation'
import ExpedienteClient from './ExpedienteClient'
import Link from 'next/link'

export default async function ExpedienteCorporativoPage({ params }) {
  const { id } = await params
  
  const empresa = await prisma.empresa.findUnique({
    where: { id },
    include: {
      archivosEmpresa: {
        orderBy: { fechaSubida: 'desc' }
      }
    }
  })

  if (!empresa) {
    redirect('/empresas')
  }

  // Serializamos datos
  const archivosSeguros = empresa.archivosEmpresa.map(a => ({
    id: a.id,
    categoria: a.categoria,
    tipoDocumento: a.tipoDocumento,
    nombreArchivo: a.nombreArchivo,
    archivoBase64: a.archivoBase64,
    fechaSubida: a.fechaSubida.toISOString()
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
           <h1 style={{ marginBottom: '0.5rem' }}>Expediente Corporativo</h1>
           <p>Modificando expediente de: <strong style={{ color: 'var(--primary)' }}>{empresa.razonSocial}</strong></p>
        </div>
        <Link href={`/empresas/editar/${id}`}>
          <button className="btn btn-secondary">Regresar a Empresa</button>
        </Link>
      </div>
      
      <ExpedienteClient 
        empresaId={id} 
        objetoSocial={empresa.objetoSocial || ''} 
        actividadEconomica={empresa.actividadEconomica || ''} 
        archivos={archivosSeguros}
      />
    </div>
  )
}
