'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { actualizarEmpresa, testSmtp } from '../../acciones'

export default function EditForm({ empresa }) {
  const router = useRouter()
  const [cargando, setCargando] = useState(false)
  const [msg, setMsg] = useState(null)
  const [showPass, setShowPass] = useState(false)
  const [probarStatus, setProbarStatus] = useState(null)
  
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
    smtpPass: empresa.smtpPass || '',
    plantillaCotizacion: empresa.plantillaCotizacion || '',
    plantillaOrdenServicio: empresa.plantillaOrdenServicio || '',
    plantillaFactura: empresa.plantillaFactura || ''
  })

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handlePruebaSmtp = async () => {
    setProbarStatus({ type: 'loading', text: 'Probando conexión...' })
    const result = await testSmtp(formData.smtpHost, formData.smtpPort, formData.smtpUser, formData.smtpPass)
    if (result.success) {
      setProbarStatus({ type: 'success', text: '✅ ¡Conexión exitosa!' })
    } else {
      setProbarStatus({ type: 'error', text: '❌ Falló: ' + result.error })
    }
  }

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
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem' }}>
             <div className="form-group">
               <label>N° Exterior</label>
               <input type="text" name="numExterior" value={formData.numExterior} onChange={handleChange} className="form-control" />
             </div>
             <div className="form-group">
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
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '2rem 0' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '2rem' }}>✉️</span>
          <div>
            <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.3rem' }}>Motor de Envíos Automáticos (SMTP)</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
               Configura el correo desde el que CAANMA enviará las facturas y cotizaciones de esta empresa.
            </p>
          </div>
          {(empresa.smtpHost && empresa.smtpUser && empresa.smtpPass) && (
            <div style={{
              marginLeft: 'auto',
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              background: 'rgba(16,185,129,0.2)',
              color: '#10b981',
              border: '1px solid #10b981',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              ✅ CORREO ELECTRÓNICO CARGADO
            </div>
          )}
        </div>
        
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
            <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '4px' }}>
              <input type={showPass ? 'text' : 'password'} name="smtpPass" value={formData.smtpPass} onChange={handleChange} className="form-control" placeholder="*************" style={{ border: 'none', borderRight: '1px solid rgba(255,255,255,0.2)', width: '100%', borderRadius: '4px 0 0 4px', backgroundColor: 'transparent' }} />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.5rem 1rem' }} title="Toggle Password">
                {showPass ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button type="button" onClick={handlePruebaSmtp} className="btn" style={{ background: '#0054a6', border: '1px solid rgba(255,255,255,0.2)' }}>Probar Configuración Express</button>
            {probarStatus && (
               <div style={{ fontSize: '0.9rem', padding: '0.5rem', borderRadius: '4px', background: probarStatus.type === 'error' ? 'rgba(255,0,0,0.2)' : probarStatus.type === 'success' ? 'rgba(0,255,0,0.2)' : 'rgba(255,255,255,0.1)' }}>
                 {probarStatus.text}
               </div>
            )}
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
        <h3 style={{ color: 'var(--primary)' }}>📝 Plantillas de Correo Electrónico Automático</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Usa <strong>{`{{cliente}}`}</strong>, <strong>{`{{total}}`}</strong> para insertar datos reales. El PDF se adjuntará automáticamente.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-group">
            <label>Correo 1: Cotización (T+0 min)</label>
            <textarea name="plantillaCotizacion" value={formData.plantillaCotizacion} onChange={handleChange} className="form-control" rows="4" placeholder="Ej. Hola {{cliente}}, adjunto enviamos la cotización solicitada..." />
          </div>
          <div className="form-group">
            <label>Correo 2: Orden de Servicio (T+10 min)</label>
            <textarea name="plantillaOrdenServicio" value={formData.plantillaOrdenServicio} onChange={handleChange} className="form-control" rows="4" placeholder="Ej. Hemos comenzado la orden de servicio..." />
          </div>
          <div className="form-group">
            <label>Correo 3: Factura (T+15 min)</label>
            <textarea name="plantillaFactura" value={formData.plantillaFactura} onChange={handleChange} className="form-control" rows="4" placeholder="Ej. Adjuntamos el XML y PDF de la factura vigente..." />
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
