import prisma from '../../../lib/prisma';
import Link from 'next/link'
import CotizacionForm from './CotizacionForm'
import { getSessionUser } from '../../../lib/auth'

export const dynamic = 'force-dynamic'

export default async function NuevaCotizacionPage() {
  const user = await getSessionUser();
  const rlsFilter = user?.empresasIds?.length > 0 ? { empresaId: { in: user.empresasIds } } : {};
  const rpEmpresa = user?.empresasIds?.length > 0 ? { id: { in: user.empresasIds } } : {};

  const empresas = await prisma.empresa.findMany({ where: rpEmpresa })
  const clientes = await prisma.cliente.findMany()
  const productos = await prisma.producto.findMany({ where: rlsFilter })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
         <h1>Emitir Nueva Cotización</h1>
         <Link href="/cotizaciones"><button className="btn btn-secondary">Regresar al Historial</button></Link>
      </div>

      <CotizacionForm 
         empresas={empresas} 
         clientes={clientes} 
         catalogoProductos={productos} 
      />
    </div>
  )
}
export const maxDuration = 60; 
