'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { actualizarEmpresa } from '../../acciones'

export default function EditForm({ empresa }) {
  const router = useRouter()
  const [cargando, setCargando] = useState(false)
  const [msg, setMsg] = useState(null)
  
  const [formData, setFormData] = useState({
    rfc: empresa.rfc || '',
    razonSocial: empresa.razonSocial || '',
    regimen: empresa.regimen || '',
    codigoPostal: empresa.codigoPostal || '',
    correo: empresa.correo || '',
    calle: empresa.calle || '',
    numExterior: empresa.numExterior || '',
    numInterior: empresa.numInterior || '',
    colonia: empresa.colonia || '',
    municipio: empresa.municipio || '',
    ciudad: empresa.ciudad || '',
    estado: empresa.estado || '',
    smtpHost: empresa.smtpHost || '',
    smtpPort: empresa.smtpPort || '',
    smtpUser: empresa.smtpUser || '',
    smtpPass: empresa.smtpPass || ''
  })

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)
    setMsg(null)

    const payload = { ...formData, smtpPort: formData.smtpPort ? parseInt(formData.smtpPort) : null }
    const result = await actualizarEmpresa(empresa.id, payload)
    
    if (result.success) {
      setMsg({ type: 'success', text: '✅ Empresa actualizada exitosamente.' })
      setTimeout(() => {
        router.push('/empresas')
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
            <label>Régimen Fiscal (Código 3 dígitos)</label>
            <input required type="text" name="regimen" value={formData.regimen} onChange={handleChange} className="form-control" placeholder="Ej. 601" maxLength="3" />
          </div>
          <div className="form-group">
            <label>Código Postal Fiscal</label>
            <input required type="text" name="codigoPostal" value={formData.codigoPostal} onChange={handleChange} className="form-control" maxLength="5" />
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />

        <h3 style={{ color: 'var(--primary)' }}>Datos de Contacto y Domicilio Adicional</h3>
        
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
            <label>Correo Electrónico Matriz</label>
            <input type="email" name="correo" value={formData.correo} onChange={handleChange} className="form-control" />
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
        <h3 style={{ color: 'var(--primary)' }}>✉️ Motor de Envíos de Correo Automático (SMTP)</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem' }}>
          <div className="form-group">
            <label>Servidor SMTP (Host)</label>
            <input type="text" name="smtpHost" value={formData.smtpHost} onChange={handleChange} className="form-control" placeholder="Ej. smtp.gmail.com" />
          </div>
          <div className="form-group">
            <label>Puerto SMTP</label>
            <input type="number" name="smtpPort" value={formData.smtpPort} onChange={handleChange} className="form-control" placeholder="Ej. 587 o 465" />
          </div>
          <div className="form-group">
            <label>Usuario (Correo Electrónico)</label>
            <input type="email" name="smtpUser" value={formData.smtpUser} onChange={handleChange} className="form-control" placeholder="ventas@empresa.com" />
          </div>
          <div className="form-group">
            <label>Contraseña de Aplicación SMTP</label>
            <input type="password" name="smtpPass" value={formData.smtpPass} onChange={handleChange} className="form-control" placeholder="*************" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
           <button type="submit" disabled={cargando} className="btn" style={{ flex: 1 }}>
             {cargando ? 'Salvando...' : 'Guardar Cambios'}
           </button>
           <Link href="/empresas" className="btn btn-secondary" style={{ flex: 1, textDecoration: 'none' }}>
             Cancelar
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
