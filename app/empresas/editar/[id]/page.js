import { PrismaClient } from '@prisma/client'
import { redirect } from 'next/navigation'
import EditForm from './EditForm'
import CsdUploader from './CsdUploader'
import LogoUploader from './LogoUploader'

const prisma = new PrismaClient()

export default async function EditarEmpresaPage({ params }) {
  const { id } = await params
  const empresa = await prisma.empresa.findUnique({
    where: { id }
  })

  if (!empresa) {
    redirect('/empresas')
  }

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Modificar Empresa Emisora</h1>
      <EditForm empresa={empresa} />
      <CsdUploader empresa={empresa} />
      <LogoUploader />
    </div>
  )
}
