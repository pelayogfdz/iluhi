'use client'

import { useState, useEffect } from 'react'
import { obtenerSocios, crearSocio, actualizarSocio, eliminarSocio } from '../../acciones'

export default function SociosPanel({ empresaId }) {
  const [socios, setSocios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSocio, setEditingSocio] = useState(null)
  const [msg, setMsg] = useState(null)

  // Form state
  const [nombre, setNombre] = useState('')
  const [rfc, setRfc] = useState('')
  const [fielPassword, setFielPassword] = useState('')
  const [cerFile, setCerFile] = useState(null)
  const [keyFile, setKeyFile] = useState(null)
  const [saving, setSaving] = useState(false)

  const fetchSocios = async () => {
    setLoading(true)
    const res = await obtenerSocios(empresaId)
    if (res.success) setSocios(res.socios)
    setLoading(false)
  }

  useEffect(() => { fetchSocios() }, [empresaId])

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
  })

  const resetForm = () => {
    setNombre('')
    setRfc('')
    setFielPassword('')
    setCerFile(null)
    setKeyFile(null)
    setEditingSocio(null)
  }

  const openNew = () => {
    resetForm()
    setShowModal(true)
  }

  const openEdit = (socio) => {
    setEditingSocio(socio)
    setNombre(socio.nombre)
    setRfc(socio.rfc)
    setFielPassword(socio.fielPassword || '')
    setCerFile(null)
    setKeyFile(null)
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setMsg(null)
    try {
      const cerB64 = cerFile ? await toBase64(cerFile) : null
      const keyB64 = keyFile ? await toBase64(keyFile) : null

      let res
      if (editingSocio) {
        let updateData = { nombre, rfc }
        if (fielPassword) updateData.fielPassword = fielPassword
        if (cerB64) updateData.fielCerBase64 = cerB64
        if (keyB64) updateData.fielKeyBase64 = keyB64
        
        res = await actualizarSocio(editingSocio.id, updateData)
      } else {
        res = await crearSocio(empresaId, nombre, rfc, cerB64, keyB64, fielPassword)
      }

      if (res.success) {
        setMsg({ type: 'success', text: editingSocio ? 'Socio actualizado.' : 'Socio agregado.' })
        setShowModal(false)
        resetForm()
        await fetchSocios()
      } else {
        setMsg({ type: 'error', text: res.error })
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (socioId) => {
    if (!confirm('¿Eliminar este socio y su e.firma?')) return
    const res = await eliminarSocio(socioId)
    if (res.success) {
      await fetchSocios()
    } else {
      alert(res.error)
    }
  }

  return (
    <div className="glass-panel card" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '2rem' }}>👥</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Estructura Accionaria (Socios)</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Registra los socios de la empresa con su FIEL (e.firma) personal y vigencia.
            </p>
          </div>
        </div>
        <button className="btn" onClick={openNew} style={{ background: '#7c3aed' }}>
          + Agregar Socio
        </button>
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

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Cargando socios...</p>
      ) : socios.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
          No hay socios registrados para esta empresa.
        </p>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>RFC</th>
                <th>FIEL (e.firma) Cargada</th>
                <th>Vigencia FIEL (e.firma)</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {socios.map((socio) => {
                const vigencia = socio.fielVigencia ? new Date(socio.fielVigencia) : null
                const isExpired = vigencia && vigencia < new Date()
                return (
                  <tr key={socio.id}>
                    <td>{socio.nombre}</td>
                    <td><code>{socio.rfc}</code></td>
                    <td style={{ textAlign: 'center' }}>
                      {socio.fielCerBase64 ? (
                        <span style={{
                          display: 'inline-block',
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          background: isExpired ? '#ef4444' : '#10b981',
                          boxShadow: `0 0 8px ${isExpired ? '#ef4444' : '#10b981'}`
                        }}></span>
                      ) : (
                        <span style={{ opacity: 0.5 }}>❌</span>
                      )}
                    </td>
                    <td>
                      {vigencia ? (
                        <span style={{ color: isExpired ? '#ef4444' : '#10b981', fontWeight: 'bold', fontSize: '0.85rem' }}>
                          {vigencia.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                          {isExpired && ' (EXPIRADA)'}
                        </span>
                      ) : (
                        <span style={{ opacity: 0.5, fontSize: '0.85rem' }}>Sin cargar</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn" style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#0e7490' }} onClick={() => openEdit(socio)}>
                          ✏️ Editar
                        </button>
                        <button className="btn" style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#dc2626' }} onClick={() => handleDelete(socio.id)}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para Agregar/Editar Socio */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="glass-panel card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', background: '#111', margin: '1rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#7c3aed' }}>
              {editingSocio ? '✏️ Editar Socio' : '➕ Nuevo Socio'}
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>Nombre Completo del Socio</label>
              <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Juan Pérez López" />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>RFC del Socio</label>
              <input className="input" value={rfc} onChange={(e) => setRfc(e.target.value.toUpperCase())} placeholder="XAXX010101000" maxLength={13} />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '1.5rem 0' }} />
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              🔐 FIEL (e.firma) personal del socio (opcional)
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>
                  Archivo .CER {editingSocio?.fielCerBase64 && <span style={{ color: '#10b981' }}>(ya cargado)</span>}
                </label>
                <input type="file" accept=".cer" className="input" style={{ padding: '8px' }}
                  onChange={(e) => setCerFile(e.target.files[0])} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>
                  Archivo .KEY {editingSocio?.fielKeyBase64 && <span style={{ color: '#10b981' }}>(ya cargado)</span>}
                </label>
                <input type="file" accept=".key" className="input" style={{ padding: '8px' }}
                  onChange={(e) => setKeyFile(e.target.files[0])} />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Contraseña FIEL (e.firma)</label>
              <input type="password" className="input" value={fielPassword}
                onChange={(e) => setFielPassword(e.target.value)} placeholder="Contraseña de la e.firma del socio..." />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }}
                onClick={() => { setShowModal(false); resetForm() }}>Cancelar</button>
              <button className="btn" style={{ background: '#7c3aed' }} disabled={saving} onClick={handleSave}>
                {saving ? 'Guardando...' : (editingSocio ? 'Actualizar Socio' : 'Registrar Socio')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
