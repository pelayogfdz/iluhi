import prisma from '../../../lib/prisma';
import Link from 'next/link'
import InvoiceForm from './InvoiceForm'
import { getSessionUser } from '../../../lib/auth'


export default async function NuevaFacturaPage() {
  const user = await getSessionUser();
  const rlsFilter = user?.empresasIds?.length > 0 ? { empresaId: { in: user.empresasIds } } : {};
  const rpEmpresa = user?.empresasIds?.length > 0 ? { id: { in: user.empresasIds } } : {};

  const empresas = await prisma.empresa.findMany({ where: rpEmpresa })
  const clientes = await prisma.cliente.findMany()
  const productos = await prisma.producto.findMany({ where: rlsFilter })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
         <h1>Emitir Comprobante (CFDI 4.0)</h1>
         <Link href="/facturas"><button className="btn btn-secondary">Regresar al Historial</button></Link>
      </div>

      <InvoiceForm 
         empresas={empresas} 
         clientes={clientes} 
         catalogoProductos={productos} 
      />
    </div>
  )
}
