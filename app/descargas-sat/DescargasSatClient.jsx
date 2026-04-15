'use client'

import { useState } from 'react'

export default function DescargasSatClient({ empresas }) {
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [activeTab, setActiveTab] = useState('facturas')

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

  const tabs = [
    { id: 'facturas', label: '🧾 Facturas (XML)', icon: '📦' },
    { id: 'constancias', label: '📄 Constancias (CSF)', icon: '🆔' },
    { id: 'opiniones', label: '📋 Opiniones (32-D)', icon: '✅' },
    { id: 'buzon', label: '📬 Buzón Tributario', icon: '📩' },
  ]

  return (
    <div>
      {/* Controles principales */}
      <div className="glass-panel card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>⚡ Sincronizador Maestro</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Ejecuta los procesos de extracción: XMLs masivos y estado de cumplimiento. Requiere FIEL (e.firma).
            </p>
          </div>
          <button
            className="btn"
            style={{ background: '#7c3aed', fontSize: '1rem', padding: '0.75rem 1.5rem' }}
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? '🔄 Extrayendo datos del SAT...' : '🚀 Ejecutar Extracción Masiva'}
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
                <p style={{ margin: '0 0 0.5rem', fontWeight: 'bold', color: '#10b981' }}>✅ Proceso completado exitosamente</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                  <div>
                    <strong>XMLs descargados:</strong> {syncResult.results?.xmlDownloads?.success || 0} / {syncResult.results?.xmlDownloads?.total || 0}
                  </div>
                  <div>
                    <strong>Opiniones 32-D:</strong>{' '}
                    {syncResult.results?.opinionCumplimiento?.skipped
                      ? `Omitido — ${syncResult.results.opinionCumplimiento.reason}`
                      : `${syncResult.results?.opinionCumplimiento?.updated || 0} / ${syncResult.results?.opinionCumplimiento?.total || 0}`}
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, color: '#ef4444' }}>❌ Error: {syncResult.error}</p>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === tab.id ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${activeTab === tab.id ? 'var(--primary)' : 'transparent'}`,
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      <div className="glass-panel card">
        {activeTab === 'facturas' && (
          <>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem' }}>Archivos de Facturación</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Los XML generados y recibidos por las empresas se enrutan y archivan aquí cada hora.
            </p>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>RFC</th>
                    <th>Razón Social</th>
                    <th>FIEL (e.firma)</th>
                    <th style={{ textAlign: 'center' }}>XMLs Resguardados</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {empresas.map((emp) => (
                    <tr key={emp.id}>
                      <td><code>{emp.rfc}</code></td>
                      <td>{emp.razonSocial}</td>
                      <td>{emp.hasFiel ? <span style={{ color: '#10b981' }}>Cargada</span> : <span style={{ color: '#ef4444' }}>Pendiente</span>}</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--primary)' }}>{emp.xmlCount}</td>
                      <td>
                        <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} disabled={emp.xmlCount === 0}>
                          {emp.xmlCount > 0 ? 'Ver Archivos' : 'Vacío'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'opiniones' && (
          <>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem' }}>Semaforización Fiscal (32-D)</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Estado del Semáforo fiscal actualizado automáticamente los días 2 y 18 del mes vía SAT.
            </p>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>RFC</th>
                    <th>Empresa</th>
                    <th>Estado de Cumplimiento</th>
                    <th>Última Validación</th>
                  </tr>
                </thead>
                <tbody>
                  {empresas.map((emp) => {
                    const lastCheck = emp.ultimaValidacionOpinion ? new Date(emp.ultimaValidacionOpinion) : null
                    return (
                      <tr key={emp.id}>
                        <td><code>{emp.rfc}</code></td>
                        <td>{emp.razonSocial}</td>
                        <td>
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
                            {emp.opinionCumplimiento || 'Sin Opinión (Pendiente)'}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {lastCheck ? lastCheck.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Nunca validado'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'constancias' && (
          <>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem' }}>Constancias de Situación Fiscal (CSF)</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Base de datos PDF de las Constancias de cada empresa. Descarga programada 2 y 18 del mes.
            </p>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>RFC</th>
                    <th>Razón Social</th>
                    <th>Estado de CSF</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {empresas.map((emp) => (
                    <tr key={emp.id}>
                      <td><code>{emp.rfc}</code></td>
                      <td>{emp.razonSocial}</td>
                      <td><span style={{ color: '#94a3b8' }}>Pendiente de extracción (Scraper SAT)</span></td>
                      <td>
                        <button className="btn" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} disabled>
                          Descargar PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'buzon' && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <span style={{ fontSize: '3rem' }}>📫</span>
            <h2 style={{ margin: '1rem 0 0.5rem' }}>Buzón Tributario</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto' }}>
              Módulo receptor de notificaciones, mensajes y requerimientos oficiales del SAT. Es necesario inicializar el recolector de web scraping con la FIEL (e.firma) para obtener estos documentos.
            </p>
            <button className="btn" style={{ marginTop: '1.5rem', background: '#3b82f6' }} disabled>
              Integración de Recolección en Progreso...
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
