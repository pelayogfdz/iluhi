import { redirect } from 'next/navigation'
import Link from 'next/link'
import ExcelUploader from '../ExcelUploader'
import prisma from '../../../lib/prisma';
import SatAutocomplete from '../../components/SatAutocomplete'



async function createProducto(formData) {
  'use server'



  
  const empresaId = formData.get('empresaId')
  const noIdentificacion = formData.get('noIdentificacion')
  const descripcion = formData.get('descripcion')
  
  // Si viene "43201601 - Computadoras...", extraemos "43201601"
  const rawProd = formData.get('claveProdServ') || ''
  const claveProdServ = rawProd.split(' - ')[0].trim()
  
  const rawUnidad = formData.get('claveUnidad') || ''
  const claveUnidad = rawUnidad.split(' - ')[0].trim()

  const precio = parseFloat(formData.get('precio')) || 0
  const impuesto = formData.get('impuesto')
  const objetoImp = formData.get('objetoImp')
  const tipoFactor = formData.get('tipoFactor')
  const tasaOCuota = parseFloat(formData.get('tasaOCuota')) || 0
  
  await prisma.producto.create({
    data: {
      empresaId,
      noIdentificacion,
      descripcion,
      claveProdServ,
      claveUnidad,
      precio,
      impuesto,
      objetoImp,
      tipoFactor,
      tasaOCuota
    }
  })
  
  redirect('/productos')
}

import { getSessionUser } from '../../../lib/auth'
import SearchableSelect from '../../components/SearchableSelect'

export default async function NuevoProductoPage() {
  const user = await getSessionUser();
  const rpEmpresa = user?.empresasIds?.length > 0 ? { id: { in: user.empresasIds } } : {};
  const empresas = await prisma.empresa.findMany({ 
    where: rpEmpresa,
    orderBy: { razonSocial: 'asc' }
  });

  const empresasOptions = empresas.map(emp => ({
    value: emp.id,
    label: `${emp.razonSocial} (${emp.rfc})`
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <h1>Agregar Productos y Servicios CFDI</h1>
         <Link href="/productos"><button className="btn btn-secondary">Regresar</button></Link>
      </div>
      
      {/* Importador Masivo de Excel */}
      <div style={{ marginTop: '2rem', maxWidth: '800px' }}>
          <ExcelUploader empresas={empresas} />
      </div>

      <h3 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>O captura manual individual:</h3>
      <div className="glass-panel" style={{ maxWidth: '800px' }}>
        <form action={createProducto} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="form-group">
            <label htmlFor="empresaId">Pertenece a la Empresa Emisora</label>
            <SearchableSelect 
              name="empresaId"
              options={empresasOptions}
              placeholder="Selecciona la Empresa que factura este concepto"
              required={true}
            />
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
                <label htmlFor="claveProdServ">Clave Prod/Serv (Predictivo SAT)</label>
                <SatAutocomplete type="producto" name="claveProdServ" placeholder="Ej. Computadoras..." />
              </div>

              <div className="form-group">
                <label htmlFor="claveUnidad">Clave Unidad (Predictivo SAT)</label>
                <SatAutocomplete type="unidad" name="claveUnidad" placeholder="Ej. Pieza u Hora..." />
              </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="precio">Precio Base (MXN)</label>
                <input type="number" step="0.01" id="precio" name="precio" className="form-control" required placeholder="0.00" />
              </div>

              <div className="form-group">
                <label htmlFor="objetoImp">Objeto de Impuesto (SAT)</label>
                <select id="objetoImp" name="objetoImp" className="form-control" required style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                  <option value="01">01 - No objeto de impuesto</option>
                  <option value="02">02 - Sí objeto de impuesto</option>
                  <option value="03">03 - Sí objeto del impuesto y no obligado al desglose</option>
                </select>
              </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="impuesto">Tipo Impuesto</label>
                <select id="impuesto" name="impuesto" className="form-control" required style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                  <option value="002">002 - IVA</option>
                  <option value="003">003 - IEPS</option>
                  <option value="001">001 - ISR</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="tipoFactor">Tipo Factor</label>
                <select id="tipoFactor" name="tipoFactor" className="form-control" required style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                  <option value="Tasa">Tasa</option>
                  <option value="Cuota">Cuota</option>
                  <option value="Exento">Exento</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="tasaOCuota">Tasa o Cuota (Ej. 0.16)</label>
                <input type="number" step="0.000001" id="tasaOCuota" name="tasaOCuota" className="form-control" required defaultValue="0.160000" />
              </div>
          </div>

          <button type="submit" className="btn">Guardar Producto</button>
        </form>
      </div>
    </div>
  )
}
