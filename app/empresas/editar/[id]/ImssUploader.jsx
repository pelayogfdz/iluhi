'use client'

import { useState } from 'react'
import { guardarCredencialesImss } from '../../acciones'

export default function ImssUploader({ empresa }) {
  const [imssPassword, setImssPassword] = useState(empresa.imssPassword || '')
  const [cerFile, setCerFile] = useState(null)
  const [keyFile, setKeyFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
  })

  const handleSave = async () => {
    setLoading(true)
    setMsg(null)
    try {
      const cerB64 = cerFile ? await toBase64(cerFile) : empresa.imssCerBase64
      const keyB64 = keyFile ? await toBase64(keyFile) : empresa.imssKeyBase64

      if (!cerB64 || !keyB64 || !imssPassword) {
        setMsg({ type: 'error', text: 'Debes cargar ambos archivos (.CER y .KEY) y la contraseña de los sellos del IMSS.' })
        setLoading(false)
        return
      }

      const res = await guardarCredencialesImss(empresa.id, cerB64, keyB64, imssPassword)
      if (res.success) {
        setMsg({ type: 'success', text: `Sellos IMSS guardados correctamente.` })
      } else {
        setMsg({ type: 'error', text: res.error })
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-panel card" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '2rem' }}>🏥</span>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Sellos IMSS</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Necesarios para consultar y descargar la opinión de cumplimiento del IMSS.
          </p>
        </div>
        {empresa.imssCerBase64 && (
          <div style={{
            marginLeft: 'auto',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            background: 'rgba(16,185,129,0.2)',
            color: '#10b981',
            border: '1px solid #10b981'
          }}>
            ✅ SELLOS IMSS CARGADOS
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>
            Archivo .CER (Sellos IMSS) {empresa.imssCerBase64 && <span style={{ color: '#10b981' }}>(cargado)</span>}
          </label>
          <input
            type="file"
            accept=".cer"
            className="form-control"
            onChange={(e) => setCerFile(e.target.files[0])}
            style={{ padding: '8px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>
            Archivo .KEY (Sellos IMSS) {empresa.imssKeyBase64 && <span style={{ color: '#10b981' }}>(cargado)</span>}
          </label>
          <input
            type="file"
            accept=".key"
            className="form-control"
            onChange={(e) => setKeyFile(e.target.files[0])}
            style={{ padding: '8px' }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>Contraseña de Sellos IMSS</label>
        <input
          type="password"
          className="form-control"
          placeholder="Contraseña del IMSS..."
          value={imssPassword}
          onChange={(e) => setImssPassword(e.target.value)}
        />
      </div>

      {msg && (
        <div style={{
          padding: '0.75rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          background: msg.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          color: msg.type === 'success' ? '#10b981' : '#ef4444',
          fontSize: '0.9rem'
        }}>
          {msg.text}
        </div>
      )}

      <button className="btn" onClick={handleSave} disabled={loading} style={{ background: '#059669', width: '100%' }}>
        {loading ? 'Guardando...' : '🏥 Guardar Sellos IMSS'}
      </button>
    </div>
  )
}
