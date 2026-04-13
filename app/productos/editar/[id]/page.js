import prisma from '../../../../lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EditProductoForm from './EditProductoForm'

import { getSessionUser } from '../../../../lib/auth'

export default async function EditarProductoPage({ params }) {
  const resolvedParams = await params
  const { id } = resolvedParams
  const user = await getSessionUser();
  
  const producto = await prisma.producto.findUnique({
    where: { id }
  })
  
  if (!producto) return notFound()
  
  const rpEmpresa = user?.empresasIds?.length > 0 ? { id: { in: user.empresasIds } } : {};
  const empresas = await prisma.empresa.findMany({ where: rpEmpresa })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <h1>Editar Producto / Servicio</h1>
         <Link href="/productos"><button className="btn btn-secondary">Regresar</button></Link>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <EditProductoForm producto={producto} empresas={empresas} />
      </div>
    </div>
  )
}
