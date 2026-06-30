'use client'

import { useState, useEffect } from 'react'
import { fetchDocumentosSATHistory, getEmpresasSelector, fetchBase64Documento, subirOpinionManual } from './acciones'
import SearchableSelect from '../components/SearchableSelect'
import { formatDateDDMMYYYY } from '../../lib/date'

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

  const handleSync = async (mode = 'cfdi') => {
    if (mode === 'cfdi' && (!filtroFechaInicio || !filtroFechaFin)) {
      alert("⚠️ Debes seleccionar un rango de fechas (Desde y Hasta) para realizar la Extracción Masiva de CFDI.");
      return;
    }
    if ((mode === 'opinion' || mode === 'csf') && (!filtroEmpresaId || filtroEmpresaId === 'ALL')) {
      alert("⚠️ Debes seleccionar una Empresa específica en el filtro superior para extraer este documento.");
      return;
    }
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch(`/api/sat-sync?startDate=${filtroFechaInicio}&endDate=${filtroFechaFin}&empresaId=${filtroEmpresaId}&mode=${mode}`)
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

  const [loadingPdf, setLoadingPdf] = useState(false)

  const handleClearFilters = () => {
    setFiltroEmpresaId('ALL')
    setFiltroFechaInicio('')
    setFiltroFechaFin('')
    // Al limpiar no hace el fetch de inmediato en el DOM, es mejor hacerlo de manual al clickear Filtrar o por useEffect
  }

  const handleViewPDF = async (id, title) => {
    setLoadingPdf(true)
    try {
      const res = await fetchBase64Documento(id, activeTab)
      if (!res.success || !res.base64) {
        alert('No se pudo cargar el archivo o no existe.')
        return
      }

      const base64String = res.base64
      const isPdf = activeTab === 'constancias' || activeTab === 'opiniones' || activeTab === 'buzon'
      
      let finalSrc = base64String
      if (isPdf && !base64String.startsWith('data:application/pdf')) {
        finalSrc = `data:application/pdf;base64,${base64String}`
      } else if (!isPdf && !base64String.startsWith('data:text/xml') && !base64String.startsWith('data:application/xml')) {
        // En caso de XML, se puede descargar o mostrar
        finalSrc = `data:application/xml;base64,${base64String}`
      }
      
      if (isPdf) {
        const w = window.open('', '_blank');
        if (w) {
          w.document.title = title || 'Visor PDF';
          w.document.body.style.margin = '0';
          const iframe = w.document.createElement('iframe');
          iframe.src = finalSrc;
          iframe.style.width = '100vw';
          iframe.style.height = '100vh';
          iframe.style.border = 'none';
          w.document.body.appendChild(iframe);
        } else {
          const a = document.createElement('a');
          a.href = finalSrc;
          a.download = `${title}.pdf`;
          a.click();
        }
      } else {
         // Descargar XML automáticamente
         const a = document.createElement('a');
         a.href = finalSrc;
         a.download = `${title}.xml`;
         a.click();
      }
    } catch (e) {
      alert('Error cargando documento.')
    } finally {
      setLoadingPdf(false)
    }
  }

  const handleManualUpload = async (e, tipoDocumento) => {
    const file = e.target.files[0]
    if (!file) return
    if (filtroEmpresaId === 'ALL') {
      alert('⚠️ Primero debes seleccionar una Empresa específica en el filtro superior para poder asignar este documento.')
      e.target.value = ''
      return
    }

    setLoadingPdf(true)
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64Data = reader.result
        const res = await subirOpinionManual(filtroEmpresaId, base64Data, tipoDocumento)
        if (res.success) {
          alert('✅ Documento subido y asignado correctamente.')
          await fetchData()
        } else {
          alert('❌ Error al subir el documento: ' + res.error)
        }
        setLoadingPdf(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      alert('Error local leyendo archivo.')
      setLoadingPdf(false)
    }
  }

  const handleMassUpload = async (e, tipo) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (filtroEmpresaId === 'ALL') {
      alert('⚠️ Primero debes seleccionar una Empresa específica en el filtro superior para asignar estas facturas.');
      e.target.value = '';
      return;
    }
    
    alert(`Has seleccionado ${files.length} archivos para carga masiva de facturas ${tipo}. La lógica de subida y procesamiento en el backend se implementará en la siguiente fase.`);
    e.target.value = ''; // Reset
  }

  const tabs = [
    { id: 'facturas', label: '🧾 Facturas (XML)', icon: '📦' },
    { id: 'facturas_recibidas', label: '📥 Facturas que me emiten', icon: '🛒' },
    { id: 'constancias', label: '📄 Constancias (CSF)', icon: '🆔' },
    { id: 'opiniones', label: '📋 Opiniones (32-D)', icon: '✅' },
    { id: 'imss', label: '🏥 Opinión IMSS', icon: '🏥' },
    { id: 'infonavit', label: '🏠 Opinión INFONAVIT', icon: '🏠' },
    { id: 'isn', label: '🏛️ Opinión ISN', icon: '🏛️' },
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
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input type="file" id="upload-emitidas" multiple accept=".xml,.zip" style={{ display: 'none' }} onChange={(e) => handleMassUpload(e, 'emitidas')} />
            <label htmlFor="upload-emitidas" className="btn" style={{ background: '#7c3aed', fontSize: '0.95rem', padding: '0.6rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', margin: 0 }}>
              🚀 Carga Masiva Emitidas
            </label>

            <input type="file" id="upload-recibidas" multiple accept=".xml,.zip" style={{ display: 'none' }} onChange={(e) => handleMassUpload(e, 'recibidas')} />
            <label htmlFor="upload-recibidas" className="btn" style={{ background: '#f59e0b', fontSize: '0.95rem', padding: '0.6rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', margin: 0 }}>
              📥 Carga Masiva Recibidas
            </label>

          </div>
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
          <div className="filter-card">
            <label>Filtrar por Empresa</label>
            <SearchableSelect 
              value={filtroEmpresaId}
              onChange={setFiltroEmpresaId}
              options={[
                { value: '', label: 'Todas las Empresas' },
                ...empresas.map(e => ({ value: e.id, label: e.razonSocial }))
              ]}
              placeholder="Todas las Empresas"
            />
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
                      <th>Datos del Receptor (Cliente)</th>
                      <th>Empresa Emisora</th>
                      <th>Total</th>
                      <th>Estatus</th>
                      <th>Archivos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? <tr><td colSpan="6" style={{ textAlign: 'center' }}>No existen facturas XML descargadas para los criterios seleccionados.</td></tr> : items.map((f) => (
                      <tr key={f.id}>
                        <td>{formatDateDDMMYYYY(f.fechaEmision)}</td>
                        <td><span style={{fontSize: '0.85rem', color: '#333', fontFamily: 'monospace'}}>{f.uuid}</span></td>
                        <td>{f.receptorNombre || 'N/A'}<br/><span style={{fontSize: '0.75rem', color: '#666'}}>{f.receptorRfc}</span></td>
                        <td>{f.empresa?.razonSocial}</td>
                        <td style={{ fontWeight: 'bold' }}>${f.total?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>
                           <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', background: f.estatus==='Vigente'?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.2)', color: f.estatus==='Vigente'?'#10b981':'#ef4444' }}>
                             {f.estatus}
                           </span>
                        </td>
                        <td>
                          <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} disabled={!f.hasFile || loadingPdf} onClick={() => handleViewPDF(f.id, `XML_Emitida_${f.uuid}`)}>
                            {loadingPdf ? 'Cargando...' : 'Ver XML'}
                          </button>
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
                        <td>{formatDateDDMMYYYY(f.fechaEmision)}</td>
                        <td><span style={{fontSize: '0.85rem', color: '#333', fontFamily: 'monospace'}}>{f.uuid}</span></td>
                        <td>{f.emisorNombre}<br/><span style={{fontSize: '0.75rem', color: '#666'}}>{f.emisorRfc}</span></td>
                        <td>{f.empresa?.razonSocial}</td>
                        <td style={{ fontWeight: 'bold' }}>${f.total?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>
                           <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', background: f.estatus==='Vigente'?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.2)', color: f.estatus==='Vigente'?'#10b981':'#ef4444' }}>
                             {f.estatus}
                           </span>
                        </td>
                        <td>
                          <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} disabled={!f.hasFile || loadingPdf} onClick={() => handleViewPDF(f.id, `XML_Recibida_${f.uuid}`)}>
                            {loadingPdf ? 'Cargando...' : 'Ver XML'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* === CONSTANCIAS === */}
              {activeTab === 'constancias' && (
                <>
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 mb-8 border border-blue-100 shadow-sm">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-blue-100 text-blue-500 text-2xl">
                          📄
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-blue-900 mb-1">Carga y Extracción de Constancias (CSF)</h4>
                          <p className="text-sm text-blue-700 leading-relaxed">
                            Extrae la constancia directamente del SAT o sube el PDF de forma manual.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center gap-2 min-w-[250px]">
                        <button className="w-full btn flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5" onClick={() => handleSync('csf')} disabled={syncing}>
                          {syncing ? '⏳ Extrayendo...' : '📄 Extraer CSF del SAT'}
                        </button>

                        <input type="file" id="csf-upload" accept="application/pdf" className="hidden" onChange={(e) => handleManualUpload(e, 'CONSTANCIA')} disabled={loadingPdf} />
                        <label htmlFor="csf-upload" className="w-full flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-xl cursor-pointer transition-all shadow-md mt-2 text-sm">
                          {loadingPdf ? '⏳ Subiendo...' : '📤 Subir Manualmente'}
                        </label>
                        <span className="text-xs text-blue-400 font-medium text-center">
                          Asegúrate de seleccionar la empresa en el filtro
                        </span>
                      </div>
                    </div>
                  </div>
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
                          <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} disabled={!c.hasFile || loadingPdf} onClick={() => handleViewPDF(c.id, `CSF_${c.empresa?.razonSocial}`)}>
                            {loadingPdf ? 'Cargando...' : 'Ver PDF'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* === OPINIONES SAT === */}
              {activeTab === 'opiniones' && (
                <>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8 border border-indigo-100 shadow-sm">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-indigo-100 text-indigo-500 text-2xl">
                          🛡️
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-indigo-900 mb-1">Carga Manual de Opinión del SAT</h4>
                          <p className="text-sm text-indigo-700 leading-relaxed">
                            Debido a bloqueos de seguridad del SAT, sube el PDF de la Opinión de Cumplimiento (32-D) de forma manual.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center gap-2 min-w-[250px]">
                        <button className="w-full btn flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5" onClick={() => handleSync('opinion')} disabled={syncing}>
                          {syncing ? '⏳ Extrayendo...' : '✅ Extraer 32-D del SAT'}
                        </button>
                        
                        <input type="file" id="opinion-upload" accept="application/pdf" className="hidden" onChange={(e) => handleManualUpload(e, 'OPINION')} disabled={loadingPdf} />
                        <label htmlFor="opinion-upload" className="w-full flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-xl cursor-pointer transition-all shadow-md mt-2 text-sm">
                          {loadingPdf ? (
                            <span className="animate-pulse">⏳ Subiendo...</span>
                          ) : (
                            <>
                              <span className="text-xl">📤</span> 
                              <span>Subir PDF Manualmente</span>
                            </>
                          )}
                        </label>
                        <span className="text-xs text-indigo-400 font-medium text-center">
                          Asegúrate de seleccionar la empresa en el filtro
                        </span>
                      </div>
                    </div>
                  </div>
                  <thead>
                    <tr>
                      <th>Fecha de Validación</th>
                      <th>Empresa Emisora</th>
                      <th>Tipo</th>
                      <th>Archivos PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? <tr><td colSpan="4" style={{ textAlign: 'center' }}>No existen opiniones de cumplimiento SAT descargadas.</td></tr> : items.map((o) => (
                      <tr key={o.id}>
                        <td>{new Date(o.fechaDocumento).toLocaleString()}</td>
                        <td>{o.empresa?.razonSocial}</td>
                        <td>
                          <span style={{ fontWeight: 'bold', fontSize: '0.8rem', padding: '3px 8px', borderRadius: '12px', background: 'rgba(59,130,246,0.2)', color: '#3b82f6' }}>
                            SAT
                          </span>
                        </td>
                        <td>
                          <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} disabled={!o.hasFile || loadingPdf} onClick={() => handleViewPDF(o.id, `Opinion_SAT_${o.empresa?.razonSocial}`)}>
                            {loadingPdf ? 'Cargando...' : 'Ver PDF'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* === OPINIONES IMSS === */}
              {activeTab === 'imss' && (
                <>
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 mb-8 border border-emerald-100 shadow-sm">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-emerald-100 text-emerald-500 text-2xl">
                          🏥
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-emerald-900 mb-1">Carga de Opinión del IMSS</h4>
                          <p className="text-sm text-emerald-700 leading-relaxed">
                            Sube el PDF de la Opinión de Cumplimiento del IMSS de forma manual.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center gap-2 min-w-[250px]">
                        <input type="file" id="opinion-imss-upload" accept="application/pdf" className="hidden" onChange={(e) => handleManualUpload(e, 'OPINION_IMSS')} disabled={loadingPdf} />
                        <label htmlFor="opinion-imss-upload" className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl cursor-pointer transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                          {loadingPdf ? (
                            <span className="animate-pulse">⏳ Subiendo...</span>
                          ) : (
                            <>
                              <span className="text-xl">📤</span> 
                              <span>Subir PDF Manualmente</span>
                            </>
                          )}
                        </label>
                        <span className="text-xs text-emerald-500 font-medium text-center">
                          Asegúrate de seleccionar la empresa en el filtro
                        </span>
                      </div>
                    </div>
                  </div>
                  <thead>
                    <tr>
                      <th>Fecha de Validación</th>
                      <th>Empresa Emisora</th>
                      <th>Tipo</th>
                      <th>Archivos PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? <tr><td colSpan="4" style={{ textAlign: 'center' }}>No existen opiniones de cumplimiento IMSS descargadas.</td></tr> : items.map((o) => (
                      <tr key={o.id}>
                        <td>{new Date(o.fechaDocumento).toLocaleString()}</td>
                        <td>{o.empresa?.razonSocial}</td>
                        <td>
                          <span style={{ fontWeight: 'bold', fontSize: '0.8rem', padding: '3px 8px', borderRadius: '12px', background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>
                            IMSS
                          </span>
                        </td>
                        <td>
                          <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} disabled={!o.hasFile || loadingPdf} onClick={() => handleViewPDF(o.id, `Opinion_IMSS_${o.empresa?.razonSocial}`)}>
                            {loadingPdf ? 'Cargando...' : 'Ver PDF'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* === OPINIONES INFONAVIT === */}
              {activeTab === 'infonavit' && (
                <>
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-6 mb-8 border border-red-100 shadow-sm">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-red-100 text-red-500 text-2xl">
                          🏠
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-red-900 mb-1">Carga de Opinión del INFONAVIT</h4>
                          <p className="text-sm text-red-700 leading-relaxed">
                            Sube el PDF de la Constancia de Situación Fiscal de Aportaciones Patronales (INFONAVIT).
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center gap-2 min-w-[250px]">
                        <input type="file" id="opinion-infonavit-upload" accept="application/pdf" className="hidden" onChange={(e) => handleManualUpload(e, 'OPINION_INFONAVIT')} disabled={loadingPdf} />
                        <label htmlFor="opinion-infonavit-upload" className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl cursor-pointer transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                          {loadingPdf ? (
                            <span className="animate-pulse">⏳ Subiendo...</span>
                          ) : (
                            <>
                              <span className="text-xl">📤</span> 
                              <span>Subir PDF Manualmente</span>
                            </>
                          )}
                        </label>
                        <span className="text-xs text-red-500 font-medium text-center">
                          Asegúrate de seleccionar la empresa en el filtro
                        </span>
                      </div>
                    </div>
                  </div>
                  <thead>
                    <tr>
                      <th>Fecha de Validación</th>
                      <th>Empresa Emisora</th>
                      <th>Tipo</th>
                      <th>Archivos PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? <tr><td colSpan="4" style={{ textAlign: 'center' }}>No existen opiniones de cumplimiento INFONAVIT descargadas.</td></tr> : items.map((o) => (
                      <tr key={o.id}>
                        <td>{new Date(o.fechaDocumento).toLocaleString()}</td>
                        <td>{o.empresa?.razonSocial}</td>
                        <td>
                          <span style={{ fontWeight: 'bold', fontSize: '0.8rem', padding: '3px 8px', borderRadius: '12px', background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
                            INFONAVIT
                          </span>
                        </td>
                        <td>
                          <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} disabled={!o.hasFile || loadingPdf} onClick={() => handleViewPDF(o.id, `Opinion_INFONAVIT_${o.empresa?.razonSocial}`)}>
                            {loadingPdf ? 'Cargando...' : 'Ver PDF'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* === OPINIONES ISN === */}
              {activeTab === 'isn' && (
                <>
                  <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-2xl p-6 mb-8 border border-purple-100 shadow-sm">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-purple-100 text-purple-500 text-2xl">
                          🏛️
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-purple-900 mb-1">Carga de Opinión del ISN</h4>
                          <p className="text-sm text-purple-700 leading-relaxed">
                            Sube el PDF de la Constancia de Cumplimiento de Obligaciones Fiscales Estatales (ISN).
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center gap-2 min-w-[250px]">
                        <input type="file" id="opinion-isn-upload" accept="application/pdf" className="hidden" onChange={(e) => handleManualUpload(e, 'OPINION_ISN')} disabled={loadingPdf} />
                        <label htmlFor="opinion-isn-upload" className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl cursor-pointer transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                          {loadingPdf ? (
                            <span className="animate-pulse">⏳ Subiendo...</span>
                          ) : (
                            <>
                              <span className="text-xl">📤</span> 
                              <span>Subir PDF Manualmente</span>
                            </>
                          )}
                        </label>
                        <span className="text-xs text-purple-500 font-medium text-center">
                          Asegúrate de seleccionar la empresa en el filtro
                        </span>
                      </div>
                    </div>
                  </div>
                  <thead>
                    <tr>
                      <th>Fecha de Validación</th>
                      <th>Empresa Emisora</th>
                      <th>Tipo</th>
                      <th>Archivos PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? <tr><td colSpan="4" style={{ textAlign: 'center' }}>No existen opiniones de cumplimiento ISN descargadas.</td></tr> : items.map((o) => (
                      <tr key={o.id}>
                        <td>{new Date(o.fechaDocumento).toLocaleString()}</td>
                        <td>{o.empresa?.razonSocial}</td>
                        <td>
                          <span style={{ fontWeight: 'bold', fontSize: '0.8rem', padding: '3px 8px', borderRadius: '12px', background: 'rgba(168,85,247,0.2)', color: '#a855f7' }}>
                            ISN
                          </span>
                        </td>
                        <td>
                          <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} disabled={!o.hasFile || loadingPdf} onClick={() => handleViewPDF(o.id, `Opinion_ISN_${o.empresa?.razonSocial}`)}>
                            {loadingPdf ? 'Cargando...' : 'Ver PDF'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* === BUZON TRIBUTARIO === */}
              {activeTab === 'buzon' && (
                <>
                  <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl p-6 mb-8 border border-amber-100 shadow-sm">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-amber-100 text-amber-500 text-2xl">
                          📬
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-amber-900 mb-1">Carga Manual de Notificaciones de Buzón</h4>
                          <p className="text-sm text-amber-700 leading-relaxed">
                            Sube notificaciones o acusos recibidos del Buzón Tributario de forma manual.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center gap-2 min-w-[250px]">
                        <input type="file" id="buzon-upload" accept="application/pdf" className="hidden" onChange={(e) => handleManualUpload(e, 'BUZON')} disabled={loadingPdf} />
                        <label htmlFor="buzon-upload" className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded-xl cursor-pointer transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                          {loadingPdf ? (
                            <span className="animate-pulse">⏳ Subiendo...</span>
                          ) : (
                            <>
                              <span className="text-xl">📤</span> 
                              <span>Subir Notificación Manualmente</span>
                            </>
                          )}
                        </label>
                        <span className="text-xs text-amber-600 font-medium text-center">
                          Asegúrate de seleccionar la empresa en el filtro
                        </span>
                      </div>
                    </div>
                  </div>
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
                          <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: '#3b82f6' }} disabled={!b.hasFile || loadingPdf} onClick={() => handleViewPDF(b.id, `Buzon_${b.empresa?.razonSocial}`)}>
                            {loadingPdf ? 'Cargando...' : 'Revisar e-documento'}
                          </button>
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
