import { PrismaClient } from '@prisma/client'
import Link from 'next/link'
import InvoiceForm from './InvoiceForm'

const prisma = new PrismaClient()

export default async function NuevaFacturaPage() {
  const empresas = await prisma.empresa.findMany()
  const clientes = await prisma.cliente.findMany()
  const productos = await prisma.producto.findMany()

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
