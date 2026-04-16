'use client'

import { useState, useEffect } from 'react'
import { fetchDocumentosSATHistory, getEmpresasSelector } from './acciones'

export default function DescargasSatClient({ empresas }) {
  // === Sync Controls ===
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)

  // === Filtering Controls ===
  const [activeTab, setActiveTab] = useState('facturas')
  const [filtroEmpresaId, setFiltroEmpresaId] = useState('ALL')
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('')
  const [filtroFechaFin, setFiltroFechaFin] = useState('')
  
  // === Data Handling ===
  const [items, setItems] = useState([])
  const [loadingData, setLoadingData] = useState(false)
  const [errorData, setErrorData] = useState('')

  // Efecto principal para refrescar la lista
  const fetchData = async () => {
    setLoadingData(true)
    setErrorData('')
    const payload = {
      tab: activeTab,
      empresaId: filtroEmpresaId,
      fechaInicio: filtroFechaInicio,
      fechaFin: filtroFechaFin
    }
    const res = await fetchDocumentosSATHistory(payload)
    if (res.success) {
      setItems(res.data)
    } else {
      setErrorData(res.error || 'Ocurrió un error cargando el historial.')
    }
    setLoadingData(false)
  }

  // Refrescar al montar o cuando cambie de pestaña
  useEffect(() => {
    fetchData()
  }, [activeTab])

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/sat-sync')
      const data = await res.json()
      setSyncResult(data)
      // Actualizamos listado luego de sincronizar
      await fetchData()
    } catch (err) {
      setSyncResult({ success: false, error: err.message })
    } finally {
      setSyncing(false)
    }
  }

  const handleClearFilters = () => {
    setFiltroEmpresaId('ALL')
    setFiltroFechaInicio('')
    setFiltroFechaFin('')
    // Al limpiar no hace el fetch de inmediato en el DOM, es mejor hacerlo de manual al clickear Filtrar o por useEffect
  }

  const tabs = [
    { id: 'facturas', label: '🧾 Facturas (XML)', icon: '📦' },
    { id: 'facturas_recibidas', label: '📥 Facturas que me emiten', icon: '🛒' },
    { id: 'constancias', label: '📄 Constancias (CSF)', icon: '🆔' },
    { id: 'opiniones', label: '📋 Opiniones (32-D)', icon: '✅' },
    { id: 'buzon', label: '📬 Buzón Tributario', icon: '📩' },
  ]

  return (
    <div>
      {/* Sincronizador Backend */}
      <div className="glass-panel card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>⚡ Sincronizador Maestro</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Ejecuta los procesos de extracción: XMLs masivos y estado de cumplimiento. Requiere FIEL (e.firma).
            </p>
          </div>
          <button className="btn" style={{ background: '#7c3aed', fontSize: '1rem', padding: '0.75rem 1.5rem' }} onClick={handleSync} disabled={syncing}>
            {syncing ? '🔄 Extrayendo datos del SAT...' : '🚀 Ejecutar Extracción Masiva'}
          </button>
        </div>

        {syncResult && (
          <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '8px', background: syncResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${syncResult.success ? '#10b981' : '#ef4444'}`, fontSize: '0.9rem' }}>
            {syncResult.success ? (
              <div>
                <p style={{ margin: '0 0 0.5rem', fontWeight: 'bold', color: '#10b981' }}>✅ Proceso completado exitosamente</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                  <div><strong>XMLs descargados:</strong> {syncResult.results?.xmlDownloads?.success || 0} / {syncResult.results?.xmlDownloads?.total || 0}</div>
                  <div><strong>Opiniones 32-D:</strong> {syncResult.results?.opinionCumplimiento?.skipped ? `Omitido — ${syncResult.results.opinionCumplimiento.reason}` : `${syncResult.results?.opinionCumplimiento?.updated || 0} / ${syncResult.results?.opinionCumplimiento?.total || 0}`}</div>
                  <div><strong>Facturas Recibidas:</strong> {syncResult.results?.facturasRecibidas?.success || 0} revisadas</div>
                </div>
              </div>
            ) : (<p style={{ margin: 0, color: '#ef4444' }}>❌ Error: {syncResult.error}</p>)}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.5rem', background: activeTab === tab.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              borderBottom: `2px solid ${activeTab === tab.id ? 'var(--primary)' : 'transparent'}`, color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', transition: 'all 0.2s', borderTop: 'none', borderLeft: 'none', borderRight: 'none'
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      <div className="glass-panel card">
        {/* Barra Global de Filtros */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Filtro de Empresa</label>
            <select className="form-control" value={filtroEmpresaId} onChange={e => setFiltroEmpresaId(e.target.value)}>
              <option value="ALL">🏢 Todas las Empresas</option>
              {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.razonSocial}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Desde</label>
            <input type="date" className="form-control" value={filtroFechaInicio} onChange={e => setFiltroFechaInicio(e.target.value)} />
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Hasta</label>
            <input type="date" className="form-control" value={filtroFechaFin} onChange={e => setFiltroFechaFin(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flex: '1 1 200px' }}>
            <button className="btn" style={{ background: '#3b82f6', flex: 1 }} onClick={fetchData} disabled={loadingData}>
              🔍 Filtrar
            </button>
            <button className="btn btn-secondary" onClick={() => { handleClearFilters(); setTimeout(fetchData, 0) }} disabled={loadingData}>
              Limpiar
            </button>
          </div>
        </div>

        {/* Carga y Errores */}
        {loadingData && <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--primary)' }}>Cargando historial de base de datos... ⚙️</div>}
        {errorData && <div style={{ color: '#ef4444', padding: '1rem', textAlign: 'center' }}>Error: {errorData}</div>}

        {/* Tablas de Resultados (Sólo Mostrar si no hay carga y no hay error) */}
        {!loadingData && !errorData && (
          <div className="table-container">
            <table className="table">
              
              {/* === FACTURAS === */}
              {activeTab === 'facturas' && (
                <>
                  <thead>
                    <tr>
                      <th>Fecha Emisión</th>
                      <th>Folio / UUID</th>
                      <th>Empresa Emisora</th>
                      <th>Total</th>
                      <th>Estatus</th>
                      <th>Archivos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? <tr><td colSpan="6" style={{ textAlign: 'center' }}>No existen facturas XML descargadas para los criterios seleccionados.</td></tr> : items.map((f) => (
                      <tr key={f.id}>
                        <td>{new Date(f.fechaEmision).toLocaleDateString()}</td>
                        <td>{f.folio || 'N/A'}<br/><span style={{fontSize: '0.75rem', color: '#666'}}>{f.uuid}</span></td>
                        <td>{f.empresa?.razonSocial}</td>
                        <td style={{ fontWeight: 'bold' }}>${f.total?.toFixed(2)}</td>
                        <td>
                           <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', background: f.estatus==='Timbrada'?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.2)', color: f.estatus==='Timbrada'?'#10b981':'#ef4444' }}>
                             {f.estatus}
                           </span>
                        </td>
                        <td>
                          <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => alert('Próximamente: Abre visor XML embebido')}>Ver XML</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* === FACTURAS RECIBIDAS === */}
              {activeTab === 'facturas_recibidas' && (
                <>
                  <thead>
                    <tr>
                      <th>Fecha Emisión</th>
                      <th>UUID Fiscal</th>
                      <th>Datos del Emisor (Proveedor)</th>
                      <th>Empresa Receptora</th>
                      <th>Total Facturado</th>
                      <th>Estatus</th>
                      <th>Archivos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? <tr><td colSpan="7" style={{ textAlign: 'center' }}>No existen facturas de proveedores descargadas para los criterios seleccionados.</td></tr> : items.map((f) => (
                      <tr key={f.id}>
                        <td>{new Date(f.fechaEmision).toLocaleDateString()}</td>
                        <td><span style={{fontSize: '0.85rem', color: '#333', fontFamily: 'monospace'}}>{f.uuid}</span></td>
                        <td>{f.emisorNombre}<br/><span style={{fontSize: '0.75rem', color: '#666'}}>{f.emisorRfc}</span></td>
                        <td>{f.empresa?.razonSocial}</td>
                        <td style={{ fontWeight: 'bold' }}>${f.total?.toFixed(2)}</td>
                        <td>
                           <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', background: f.estatus==='Vigente'?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.2)', color: f.estatus==='Vigente'?'#10b981':'#ef4444' }}>
                             {f.estatus}
                           </span>
                        </td>
                        <td>
                          <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} disabled={!f.xmlBase64}>Ver XML</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* === CONSTANCIAS === */}
              {activeTab === 'constancias' && (
                <>
                  <thead>
                    <tr>
                      <th>Fecha Descarga</th>
                      <th>Empresa</th>
                      <th>Tipo Documento</th>
                      <th>Archivos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? <tr><td colSpan="4" style={{ textAlign: 'center' }}>No existen constancias descargadas en este rango.</td></tr> : items.map((c) => (
                      <tr key={c.id}>
                        <td>{new Date(c.fechaDocumento).toLocaleString()}</td>
                        <td>{c.empresa?.razonSocial}</td>
                        <td>{c.descripcion || 'Constancia de Situación Fiscal (CSF)'}</td>
                        <td>
                          <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} disabled={!c.archivoBase64}>Ver PDF</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* === OPINIONES === */}
              {activeTab === 'opiniones' && (
                <>
                  <thead>
                    <tr>
                      <th>Fecha de Validación</th>
                      <th>Empresa Emisora</th>
                      <th>Estatus 32-D</th>
                      <th>Archivos PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? <tr><td colSpan="4" style={{ textAlign: 'center' }}>No existen opiniones de cumplimiento descargadas en este rango.</td></tr> : items.map((o) => (
                      <tr key={o.id}>
                        <td>{new Date(o.fechaDocumento).toLocaleString()}</td>
                        <td>{o.empresa?.razonSocial}</td>
                        <td>
                          <span style={{ fontWeight: 'bold', fontSize: '0.8rem', padding: '3px 8px', borderRadius: '12px', background: o.descripcion === 'POSITIVA' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: o.descripcion === 'POSITIVA' ? '#10b981' : '#ef4444' }}>
                            {o.descripcion}
                          </span>
                        </td>
                        <td>
                          <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} disabled={!o.archivoBase64}>Ver PDF</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* === BUZON TRIBUTARIO === */}
              {activeTab === 'buzon' && (
                <>
                  <thead>
                    <tr>
                      <th>Fecha de Notificación</th>
                      <th>Empresa Receptora</th>
                      <th>Concepto / Asunto</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? <tr><td colSpan="4" style={{ textAlign: 'center' }}>No existen notificaciones extraídas del buzón en este rango.</td></tr> : items.map((b) => (
                      <tr key={b.id}>
                        <td>{new Date(b.fechaDocumento).toLocaleString()}</td>
                        <td>{b.empresa?.razonSocial}</td>
                        <td>{b.descripcion}</td>
                        <td>
                          <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: '#3b82f6' }}>Revisar e-documento</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

            </table>
          </div>
        )}
      </div>

    </div>
  )
}
