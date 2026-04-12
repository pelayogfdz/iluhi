import { PrismaClient } from '@prisma/client'
import { redirect } from 'next/navigation'
import EditForm from './EditForm'

const prisma = new PrismaClient()

export default async function EditarClientePage({ params }) {
  const { id } = await params
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: { empresa: true }
  })

  if (!cliente) {
    redirect('/clientes')
  }

  return (
    <div>
      <h1 style={{ marginBottom: '1rem' }}>Modificar Cliente / Receptor</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Este cliente pertenece al ecosistema de la Empresa Matriz: <br/> 
        <strong>{cliente.empresa.razonSocial} (RFC: {cliente.empresa.rfc})</strong>
      </p>
      <EditForm cliente={cliente} />
    </div>
  )
}
