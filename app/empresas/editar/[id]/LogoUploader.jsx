'use client'

import { useState } from 'react'
import { subirLogo } from '../../acciones'
import { useRouter } from 'next/navigation'

export default function LogoUploader() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    
    const formData = new FormData(e.target)
    
    try {
      const res = await subirLogo(formData)
      if (res.success) {
        setMessage('✅ Logotipo subido correctamente a Facturapi')
        e.target.reset()
        router.refresh()
      } else {
        setMessage('❌ Error: ' + res.error)
      }
    } catch (err) {
      setMessage('❌ Error interno')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-panel" style={{ marginTop: '2rem', maxWidth: '600px' }}>
      <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
        🖼️ Logotipo del Emisor
      </h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Sube el logotipo de la empresa. Este logotipo se incrustará automáticamente en la cabecera de los archivos PDF (Facturas) generados.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="form-group">
          <label htmlFor="logoFile">Archivo de Imagen (PNG, JPG)</label>
          <input type="file" id="logoFile" name="logoFile" accept=".png,.jpg,.jpeg" className="form-control" required style={{ background: 'rgba(0,0,0,0.2)' }} />
        </div>

        <button type="submit" className="btn" disabled={loading} style={{ background: 'var(--primary)', color: 'white' }}>
          {loading ? 'Subiendo Logo al PAC...' : 'Guardar Logotipo'}
        </button>

        {message && (
          <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '4px', background: message.includes('✅') ? 'rgba(46, 213, 115, 0.2)' : 'rgba(255, 71, 87, 0.2)' }}>
            {message}
          </div>
        )}
      </form>
    </div>
  )
}
