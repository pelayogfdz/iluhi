'use client'

import { useState } from 'react'

export default function DescargasSatClient({ empresas }) {
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/sat-sync')
      const data = await res.json()
      setSyncResult(data)
    } catch (err) {
      setSyncResult({ success: false, error: err.message })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div>
      {/* Controles principales */}
      <div className="glass-panel card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>⚡ Sincronización SAT</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Descarga XMLs de facturas timbradas y actualiza opiniones de cumplimiento.
            </p>
          </div>
          <button
            className="btn"
            style={{ background: '#7c3aed', fontSize: '1rem', padding: '0.75rem 1.5rem' }}
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? '🔄 Sincronizando...' : '🚀 Ejecutar Sincronización Ahora'}
          </button>
        </div>

        {syncResult && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            borderRadius: '8px',
            background: syncResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${syncResult.success ? '#10b981' : '#ef4444'}`,
            fontSize: '0.9rem'
          }}>
            {syncResult.success ? (
              <div>
                <p style={{ margin: '0 0 0.5rem', fontWeight: 'bold', color: '#10b981' }}>✅ Sincronización completada</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <strong>XMLs descargados:</strong> {syncResult.results?.xmlDownloads?.success || 0} / {syncResult.results?.xmlDownloads?.total || 0}
                  </div>
                  <div>
                    <strong>Opiniones actualizadas:</strong>{' '}
                    {syncResult.results?.opinionCumplimiento?.skipped
                      ? `Omitido — ${syncResult.results.opinionCumplimiento.reason}`
                      : `${syncResult.results?.opinionCumplimiento?.updated || 0} / ${syncResult.results?.opinionCumplimiento?.total || 0}`}
                  </div>
                </div>
                {syncResult.results?.xmlDownloads?.errors?.length > 0 && (
                  <div style={{ marginTop: '0.5rem', color: '#ef4444' }}>
                    <strong>Errores XML:</strong>
                    {syncResult.results.xmlDownloads.errors.map((e, i) => (
                      <p key={i} style={{ margin: '2px 0', fontSize: '0.8rem' }}>{e.uuid || ''}: {e.error}</p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ margin: 0, color: '#ef4444' }}>❌ Error: {syncResult.error}</p>
            )}
          </div>
        )}
      </div>

      {/* Info boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="glass-panel card" style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '2.5rem' }}>📄</span>
          <h3 style={{ margin: '0.5rem 0 0.25rem' }}>Descarga Masiva XML</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Cada hora se descargan los XML de facturas timbradas recientes vía Facturapi.
          </p>
        </div>
        <div className="glass-panel card" style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '2.5rem' }}>📋</span>
          <h3 style={{ margin: '0.5rem 0 0.25rem' }}>Opinión de Cumplimiento</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Los días 2 y 18 de cada mes se valida el RFC de cada empresa con FIEL cargada.
          </p>
        </div>
        <div className="glass-panel card" style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '2.5rem' }}>📬</span>
          <h3 style={{ margin: '0.5rem 0 0.25rem' }}>Buzón Tributario</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Próximamente: Consulta automática de notificaciones y comunicados del SAT.
          </p>
        </div>
      </div>

      {/* Tabla de empresas */}
      <div className="glass-panel card">
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.2rem' }}>Empresas Registradas</h2>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>RFC</th>
                <th>Razón Social</th>
                <th>FIEL</th>
                <th>Vigencia FIEL</th>
                <th>Opinión SAT</th>
                <th>Última Validación</th>
                <th>XMLs Guardados</th>
              </tr>
            </thead>
            <tbody>
              {empresas.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                    No hay empresas registradas.
                  </td>
                </tr>
              ) : empresas.map((emp) => {
                const vigencia = emp.fielVigencia ? new Date(emp.fielVigencia) : null
                const isExpired = vigencia && vigencia < new Date()
                const lastCheck = emp.ultimaValidacionOpinion ? new Date(emp.ultimaValidacionOpinion) : null

                return (
                  <tr key={emp.id}>
                    <td><code>{emp.rfc}</code></td>
                    <td>{emp.razonSocial}</td>
                    <td style={{ textAlign: 'center' }}>
                      {emp.hasFiel ? (
                        <span style={{
                          display: 'inline-block', width: '14px', height: '14px', borderRadius: '50%',
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
                    <td style={{ textAlign: 'center' }}>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '3px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold',
                        background: emp.opinionCumplimiento === 'POSITIVA' ? 'rgba(16,185,129,0.2)' :
                                    emp.opinionCumplimiento === 'NEGATIVA' ? 'rgba(239,68,68,0.2)' : 'rgba(107,114,128,0.2)',
                        color: emp.opinionCumplimiento === 'POSITIVA' ? '#10b981' :
                               emp.opinionCumplimiento === 'NEGATIVA' ? '#ef4444' : '#6b7280'
                      }}>
                        <div style={{
                          width: '10px', height: '10px', borderRadius: '50%',
                          background: emp.opinionCumplimiento === 'POSITIVA' ? '#10b981' :
                                      emp.opinionCumplimiento === 'NEGATIVA' ? '#ef4444' : '#6b7280'
                        }}></div>
                        {emp.opinionCumplimiento || 'Pendiente'}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {lastCheck
                        ? lastCheck.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : 'Nunca'}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                      {emp.xmlCount}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
