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
      <h1 style={{ marginBottom: '2rem' }}>Modificar Empresa Emisora</h1>
      <EditForm empresa={empresa} />
      <CsdUploader empresa={empresa} />
      <FielUploader empresa={empresaData} />
      <LogoUploader />
      <SociosPanel empresaId={empresa.id} />
    </div>
  )
}
