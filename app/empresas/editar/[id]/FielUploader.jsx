'use client'

import { useState } from 'react'
import { guardarFiel } from '../../acciones'

export default function FielUploader({ empresa }) {
  const [fielPassword, setFielPassword] = useState(empresa.fielPassword || '')
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
      const cerB64 = cerFile ? await toBase64(cerFile) : empresa.fielCerBase64
      const keyB64 = keyFile ? await toBase64(keyFile) : empresa.fielKeyBase64

      if (!cerB64 || !keyB64 || !fielPassword) {
        setMsg({ type: 'error', text: 'Debes cargar ambos archivos (.CER y .KEY) y la contraseña de la FIEL (e.firma).' })
        setLoading(false)
        return
      }

      const res = await guardarFiel(empresa.id, cerB64, keyB64, fielPassword)
      if (res.success) {
        setMsg({ type: 'success', text: `FIEL (e.firma) guardada correctamente.${res.fielVigencia ? ' Vigencia: ' + new Date(res.fielVigencia).toLocaleDateString('es-MX') : ''}` })
      } else {
        setMsg({ type: 'error', text: res.error })
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const vigenciaDate = empresa.fielVigencia ? new Date(empresa.fielVigencia) : null
  const isExpired = vigenciaDate && vigenciaDate < new Date()

  return (
    <div className="glass-panel card" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '2rem' }}>🔐</span>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem' }}>FIEL (e.firma) del SAT</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Necesaria para descargas masivas de XML, opinión de cumplimiento y buzón tributario.
          </p>
        </div>
        {empresa.fielCerBase64 && (
          <div style={{
            marginLeft: 'auto',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            background: isExpired ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
            color: isExpired ? '#ef4444' : '#10b981',
            border: `1px solid ${isExpired ? '#ef4444' : '#10b981'}`
          }}>
            {isExpired ? '⚠️ FIEL (e.firma) EXPIRADA' : '✅ FIEL (e.firma) CARGADA'}
          </div>
        )}
      </div>

      {vigenciaDate && (
        <div style={{
          background: isExpired ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontSize: '0.9rem',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>📅 Vigencia de la FIEL (e.firma):</span>
          <strong style={{ color: isExpired ? '#ef4444' : '#10b981' }}>
            {vigenciaDate.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
          </strong>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>
            Archivo .CER de la FIEL (e.firma) {empresa.fielCerBase64 && <span style={{ color: '#10b981' }}>(cargado)</span>}
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
            Archivo .KEY de la FIEL (e.firma) {empresa.fielKeyBase64 && <span style={{ color: '#10b981' }}>(cargado)</span>}
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
        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>Contraseña de la FIEL (e.firma)</label>
        <input
          type="password"
          className="form-control"
          placeholder="Contraseña de la e.firma..."
          value={fielPassword}
          onChange={(e) => setFielPassword(e.target.value)}
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

      <button className="btn" onClick={handleSave} disabled={loading} style={{ background: '#7c3aed', width: '100%' }}>
        {loading ? 'Guardando...' : '🔐 Guardar FIEL (e.firma)'}
      </button>
    </div>
  )
}
