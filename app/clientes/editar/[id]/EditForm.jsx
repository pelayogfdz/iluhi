'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { actualizarCliente } from '../../acciones'

export default function EditForm({ cliente }) {
  const router = useRouter()
  const [cargando, setCargando] = useState(false)
  const [msg, setMsg] = useState(null)
  
  const [formData, setFormData] = useState({
    rfc: cliente.rfc || '',
    razonSocial: cliente.razonSocial || '',
    regimen: cliente.regimen || '',
    codigoPostal: cliente.codigoPostal || '',
    usoCfdi: cliente.usoCfdi || 'G03',
    correoDestino: cliente.correoDestino || '',
    calle: cliente.calle || '',
    numExterior: cliente.numExterior || '',
    numInterior: cliente.numInterior || '',
    colonia: cliente.colonia || '',
    municipio: cliente.municipio || '',
    ciudad: cliente.ciudad || '',
    estado: cliente.estado || ''
  })

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)
    setMsg(null)

    const result = await actualizarCliente(cliente.id, formData)
    
    if (result.success) {
      setMsg({ type: 'success', text: '✅ Cliente actualizado exitosamente.' })
      setTimeout(() => {
        router.push('/clientes')
        router.refresh()
      }, 1500)
    } else {
      setMsg({ type: 'error', text: '❌ Error: ' + result.error })
      setCargando(false)
    }
  }

  return (
    <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="form-group">
            <label>RFC (Identificador Fiscal)</label>
            <input required type="text" name="rfc" value={formData.rfc} onChange={handleChange} className="form-control" />
          </div>
          <div className="form-group">
            <label>Razón Social Oficial</label>
            <input required type="text" name="razonSocial" value={formData.razonSocial} onChange={handleChange} className="form-control" />
          </div>
          <div className="form-group">
            <label>Régimen Fiscal (3 dígitos)</label>
            <input required type="text" name="regimen" value={formData.regimen} onChange={handleChange} className="form-control" maxLength="3" />
          </div>
          <div className="form-group">
            <label>Código Postal Fiscal</label>
            <input required type="text" name="codigoPostal" value={formData.codigoPostal} onChange={handleChange} className="form-control" maxLength="5" />
          </div>
          <div className="form-group">
             <label>Uso de CFDI Predefinido</label>
             <select name="usoCfdi" value={formData.usoCfdi} onChange={handleChange} className="form-control" required>
                <option value="G03">G03 - Gastos en general</option>
                <option value="G01">G01 - Adquisición de mercancias</option>
                <option value="I08">I08 - Otra maquinaria o Eq.</option>
                <option value="S01">S01 - Sin efectos fiscales</option>
             </select>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />

        <h3 style={{ color: 'var(--primary)' }}>Datos Logísticos Adicionales</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem' }}>
          <div className="form-group">
            <label>Calle</label>
            <input type="text" name="calle" value={formData.calle} onChange={handleChange} className="form-control" />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
             <div className="form-group" style={{ flex: 1 }}>
               <label>N° Exterior</label>
               <input type="text" name="numExterior" value={formData.numExterior} onChange={handleChange} className="form-control" />
             </div>
             <div className="form-group" style={{ flex: 1 }}>
               <label>N° Interior</label>
               <input type="text" name="numInterior" value={formData.numInterior} onChange={handleChange} className="form-control" />
             </div>
          </div>
          
          <div className="form-group">
            <label>Colonia / Asentamiento</label>
            <input type="text" name="colonia" value={formData.colonia} onChange={handleChange} className="form-control" />
          </div>
          <div className="form-group">
            <label>Municipio / Alcaldía</label>
            <input type="text" name="municipio" value={formData.municipio} onChange={handleChange} className="form-control" />
          </div>
          
          <div className="form-group">
            <label>Ciudad</label>
            <input type="text" name="ciudad" value={formData.ciudad} onChange={handleChange} className="form-control" />
          </div>
          <div className="form-group">
            <label>Estado</label>
            <input type="text" name="estado" value={formData.estado} onChange={handleChange} className="form-control" />
          </div>
          
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Correo Electrónico para CFDI</label>
            <input type="email" name="correoDestino" value={formData.correoDestino} onChange={handleChange} className="form-control" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
           <button type="submit" disabled={cargando} className="btn" style={{ flex: 1 }}>
             {cargando ? 'Guardando en la Nube...' : 'Confirmar Edición'}
           </button>
           <Link href="/clientes" className="btn btn-secondary" style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}>
             Cancelar y Volver
           </Link>
        </div>

        {msg && (
          <div style={{ padding: '1rem', borderRadius: '8px', color: '#fff', backgroundColor: msg.type === 'error' ? 'rgba(255,0,0,0.3)' : 'rgba(0,255,0,0.3)'}}>
             {msg.text}
          </div>
        )}
      </form>
    </div>
  )
}
