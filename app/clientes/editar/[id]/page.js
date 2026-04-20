import prisma from '../../../../lib/prisma';
import { redirect } from 'next/navigation'
import EditForm from './EditForm'



import MaterialidadPanel from './MaterialidadPanel'

export default async function EditarClientePage({ params }) {
  const { id } = await params
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      archivos: {
        orderBy: { fechaSubida: 'desc' }
      }
    }
  })

  if (!cliente) {
    redirect('/clientes')
  }

  return (
    <div>
      <h1 style={{ marginBottom: '1rem' }}>Modificar Cliente / Receptor</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Identificador Interno: {cliente.id}
      </p>
      <EditForm cliente={cliente} />
      
      <MaterialidadPanel clienteId={cliente.id} archivos={cliente.archivos} />
    </div>
  )
}
