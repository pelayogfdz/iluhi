import prisma from '../../../../lib/prisma';
import { redirect } from 'next/navigation'
import EditForm from './EditForm'
import CsdUploader from './CsdUploader'
import LogoUploader from './LogoUploader'
import FielUploader from './FielUploader'
import SociosPanel from './SociosPanel'



export default async function EditarEmpresaPage({ params }) {
  const { id } = await params
  const empresa = await prisma.empresa.findUnique({
    where: { id }
  })

  if (!empresa) {
    redirect('/empresas')
  }

  // Serializar fechas para pasar a client components
  const empresaData = {
    ...empresa,
    fielVigencia: empresa.fielVigencia ? empresa.fielVigencia.toISOString() : null,
    createdAt: empresa.createdAt.toISOString(),
    updatedAt: empresa.updatedAt.toISOString()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <h1>Modificar Empresa Emisora</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <a href={`/empresas/editar/${id}/expediente`} style={{ textDecoration: 'none' }}>
             <button className="btn" style={{ background: '#10b981' }}>Expediente Corporativo</button>
          </a>
        </div>
      </div>
      <EditForm empresa={empresa} />
      <CsdUploader empresa={empresa} />
      <FielUploader empresa={empresaData} />
      <LogoUploader />
      <SociosPanel empresaId={empresa.id} />
    </div>
  )
}
