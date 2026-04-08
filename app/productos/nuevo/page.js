import { PrismaClient } from '@prisma/client'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const prisma = new PrismaClient()

async function createProducto(formData) {
  'use server'
  
  const empresaId = formData.get('empresaId')
  const noIdentificacion = formData.get('noIdentificacion')
  const descripcion = formData.get('descripcion')
  const claveProdServ = formData.get('claveProdServ')
  const claveUnidad = formData.get('claveUnidad')
  const precio = parseFloat(formData.get('precio')) || 0
  const impuesto = formData.get('impuesto')
  
  await prisma.producto.create({
    data: {
      empresaId,
      noIdentificacion,
      descripcion,
      claveProdServ,
      claveUnidad,
      precio,
      impuesto
    }
  })
  
  redirect('/productos')
}

export default async function NuevoProductoPage() {
  const empresas = await prisma.empresa.findMany()

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <h1>Agregar Concepto / Servicio CFDI</h1>
         <Link href="/productos"><button className="btn btn-secondary">Regresar</button></Link>
      </div>
      
      <div className="glass-panel" style={{ marginTop: '2rem', maxWidth: '600px' }}>
        <form action={createProducto} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="form-group">
            <label htmlFor="empresaId">Pertenece a la Empresa Emisora</label>
            <select id="empresaId" name="empresaId" className="form-control" required style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <option value="">Selecciona la Empresa que factura este concepto</option>
              {empresas.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.razonSocial} ({emp.rfc})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="noIdentificacion">SKU / No. Ident.</label>
                <input type="text" id="noIdentificacion" name="noIdentificacion" className="form-control" required placeholder="Ej. SER-001" />
              </div>

              <div className="form-group">
                <label htmlFor="descripcion">Descripción</label>
                <input type="text" id="descripcion" name="descripcion" className="form-control" required placeholder="Ej. Servicio de Consultoría" />
              </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="claveProdServ">Clave Prod/Serv (SAT)</label>
                <input type="text" id="claveProdServ" name="claveProdServ" className="form-control" required placeholder="Ej. 80101500" />
              </div>

              <div className="form-group">
                <label htmlFor="claveUnidad">Clave Unidad (SAT)</label>
                <input type="text" id="claveUnidad" name="claveUnidad" className="form-control" required placeholder="Ej. E48 (Unidad de servicio)" />
              </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="precio">Precio Base (MXN)</label>
                <input type="number" step="0.01" id="precio" name="precio" className="form-control" required placeholder="0.00" />
              </div>

              <div className="form-group">
                <label htmlFor="impuesto">Impuesto aplicable</label>
                <select id="impuesto" name="impuesto" className="form-control" required style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                  <option value="IVA-16">IVA Traslado Retenido 16%</option>
                  <option value="IVA-0">IVA 0%</option>
                  <option value="EXENTO">Exento</option>
                </select>
              </div>
          </div>

          <button type="submit" className="btn">Guardar Producto</button>
        </form>
      </div>
    </div>
  )
}
