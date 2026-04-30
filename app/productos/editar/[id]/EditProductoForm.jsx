'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { actualizarProducto, eliminarProducto } from '../../acciones'
import SatAutocomplete from '../../../components/SatAutocomplete'

export default function EditProductoForm({ producto, empresas }) {
  const router = useRouter()
  const [cargando, setCargando] = useState(false)
  const [msg, setMsg] = useState(null)
  
  const [formData, setFormData] = useState({
    empresaId: producto.empresaId || '',
    noIdentificacion: producto.noIdentificacion || '',
    descripcion: producto.descripcion || '',
    precio: producto.precio || 0,
    impuesto: producto.impuesto || '002',
    objetoImp: producto.objetoImp || '02',
    tipoFactor: producto.tipoFactor || 'Tasa',
    tasaOCuota: producto.tasaOCuota || 0.160000
  })

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)
    setMsg(null)

    try {
      // Form data gives us native form objects since it includes the Autocomplete hiddens
      const data = new FormData(e.target)
      
      // We assemble the unified payload
      const payload = {
        empresaId: formData.empresaId,
        noIdentificacion: formData.noIdentificacion,
        descripcion: formData.descripcion,
        claveProdServ: (data.get('claveProdServ') || '').toString().split(' - ')[0].trim(), // From the SatAutocomplete hidden input
        claveUnidad: (data.get('claveUnidad') || '').toString().split(' - ')[0].trim(),   // From the SatAutocomplete hidden input
        precio: parseFloat(formData.precio) || 0,
        impuesto: formData.impuesto,
        objetoImp: formData.objetoImp,
        tipoFactor: formData.tipoFactor,
        tasaOCuota: parseFloat(formData.tasaOCuota) || 0
      }
      
      console.log("Submitting payload:", payload)
      
      const result = await actualizarProducto(producto.id, payload)
      
      console.log("Result:", result)
      
      if (result.success) {
        setMsg({ type: 'success', text: '✅ Producto actualizado exitosamente.' })
        setTimeout(() => {
          router.push('/productos')
          router.refresh()
        }, 1500)
      } else {
        setMsg({ type: 'error', text: '❌ Error: ' + result.error })
        setCargando(false)
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error)
      setMsg({ type: 'error', text: '❌ Error inesperado: ' + error.message })
      setCargando(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return
    setCargando(true)
    const result = await eliminarProducto(producto.id)
    if (result.success) {
      router.push('/productos')
      router.refresh()
    } else {
      setMsg({ type: 'error', text: '❌ Error: ' + result.error })
      setCargando(false)
    }
  }

  return (
    <div className="glass-panel" style={{ maxWidth: '800px' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div className="form-group">
          <label>Pertenece a la Empresa Emisora</label>
          <select name="empresaId" value={formData.empresaId} onChange={handleChange} className="form-control" required style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <option value="">Selecciona la Empresa</option>
            {empresas.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.razonSocial}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div className="form-group">
              <label>SKU / No. Ident.</label>
              <input type="text" name="noIdentificacion" value={formData.noIdentificacion} onChange={handleChange} className="form-control" required />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <input type="text" name="descripcion" value={formData.descripcion} onChange={handleChange} className="form-control" required />
            </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Clave Prod/Serv (Predictivo SAT)</label>
              <SatAutocomplete 
                 type="producto" 
                 name="claveProdServ" 
                 initialValue={producto.claveProdServ}
                 initialDisplay={producto.claveProdServ}
                 placeholder="Ej. Computadora..."
              />
            </div>

            <div className="form-group">
              <label>Clave Unidad (Predictivo SAT)</label>
              <SatAutocomplete 
                 type="unidad" 
                 name="claveUnidad" 
                 initialValue={producto.claveUnidad}
                 initialDisplay={producto.claveUnidad}
                 placeholder="Ej. Pieza u Hora..."
              />
            </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Precio Base (MXN)</label>
              <input type="number" step="0.01" name="precio" value={formData.precio} onChange={handleChange} className="form-control" required />
            </div>

            <div className="form-group">
              <label>Objeto de Impuesto (SAT)</label>
              <select name="objetoImp" value={formData.objetoImp} onChange={handleChange} className="form-control" required style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <option value="01">01 - No objeto de impuesto</option>
                <option value="02">02 - Sí objeto de impuesto</option>
                <option value="03">03 - Sí objeto del impuesto y no obligado al desglose</option>
              </select>
            </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Tipo Impuesto</label>
              <select name="impuesto" value={formData.impuesto} onChange={handleChange} className="form-control" required style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <option value="002">002 - IVA</option>
                <option value="003">003 - IEPS</option>
                <option value="001">001 - ISR</option>
              </select>
            </div>

            <div className="form-group">
              <label>Tipo Factor</label>
              <select name="tipoFactor" value={formData.tipoFactor} onChange={handleChange} className="form-control" required style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <option value="Tasa">Tasa</option>
                <option value="Cuota">Cuota</option>
                <option value="Exento">Exento</option>
              </select>
            </div>

            <div className="form-group">
              <label>Tasa o Cuota (Ej. 0.16)</label>
              <input type="number" step="0.000001" name="tasaOCuota" value={formData.tasaOCuota} onChange={handleChange} className="form-control" required />
            </div>
        </div>

        {msg && (
          <div style={{ padding: '0.8rem', background: msg.type === 'error' ? 'rgba(255,0,0,0.2)' : 'rgba(0,255,0,0.2)', borderRadius: '4px' }}>
            {msg.text}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" disabled={cargando} className="btn" style={{ flex: 2 }}>{cargando ? 'Guardando...' : 'Guardar Cambios'}</button>
          <button type="button" onClick={handleDelete} disabled={cargando} className="btn" style={{ flex: 1, background: '#d32f2f' }}>Eliminar</button>
        </div>
      </form>
    </div>
  )
}
