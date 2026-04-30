'use client'

import React, { useState } from 'react'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { useRouter, useSearchParams } from 'next/navigation'
import BotonCancelar from './BotonCancelar'
import BotonComplemento from './BotonComplemento'
import BotonNotaCredito from './BotonNotaCredito'
import { cancelarFactura, emitirComplementoPago, emitirNotaCredito } from './acciones'

export default function FacturasClient({ facturasInitial, empresas }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedDocs, setSelectedDocs] = useState([])
  const [isDownloading, setIsDownloading] = useState(false)

  // Estados locales para filtros interactivos
  const [fechaInicio, setFechaInicio] = useState(searchParams.get('fechaInicio') || '')
  const [fechaFin, setFechaFin] = useState(searchParams.get('fechaFin') || '')
  const [empresaFiltro, setEmpresaFiltro] = useState(searchParams.get('empresa') || '')
  const [orden, setOrden] = useState(searchParams.get('orden') || 'desc')
  const q = searchParams.get('q') || ''

  const toggleSelect = (id) => {
    if (selectedDocs.includes(id)) {
      setSelectedDocs(selectedDocs.filter(docId => docId !== id))
    } else {
      setSelectedDocs([...selectedDocs, id])
    }
  }

  const selectAll = () => {
    if (selectedDocs.length === facturasInitial.length) {
      setSelectedDocs([])
    } else {
      setSelectedDocs(facturasInitial.filter(f => f.uuid).map(f => f.id))
    }
  }

  const applyFilters = () => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (fechaInicio) params.set('fechaInicio', fechaInicio)
    if (fechaFin) params.set('fechaFin', fechaFin)
    if (empresaFiltro) params.set('empresa', empresaFiltro)
    if (orden) params.set('orden', orden)
    
    router.push(`?${params.toString()}`)
  }

  const clearFilters = () => {
    setFechaInicio('')
    setFechaFin('')
    setEmpresaFiltro('')
    setOrden('desc')
    router.push(q ? `?q=${q}` : '?')
  }

  const openDownload = (facturaId, type) => {
    const fac = facturasInitial.find(f => f.id === facturaId)
    if (!fac || !fac.uuid) return alert("Esta factura no tiene UUID asignado.")
    window.open(`/api/facturas/${fac.uuid}/download?type=${type}`, '_blank')
  }

  const openDownloadComplement = (facturaUuid, compId, type) => {
    if (!facturaUuid || !compId) return alert("El complemento no tiene un ID válido.");
    window.open(`/api/facturas/${facturaUuid}/download-pago?pagoId=${compId}&type=${type}`, '_blank');
  }

  const downloadSelected = async () => {
    if (selectedDocs.length === 0) return;
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      
      // Proceso en paralelo para mejor rendimiento
      const promises = selectedDocs.map(async (docId) => {
        const fac = facturasInitial.find(f => f.id === docId);
        if(!fac || !fac.uuid) return;
        
        const resPdf = await fetch(`/api/facturas/${fac.uuid}/download?type=pdf`);
        const resXml = await fetch(`/api/facturas/${fac.uuid}/download?type=xml`);
        
        if (resPdf.ok) {
          const blobPdf = await resPdf.blob();
          zip.file(`Factura_${fac.uuid}.pdf`, blobPdf);
        }
        if (resXml.ok) {
          const blobXml = await resXml.blob();
          zip.file(`Factura_${fac.uuid}.xml`, blobXml);
        }
      });
      
      await Promise.all(promises);
      
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "Facturas_Bulk_Download.zip");
      setSelectedDocs([]); // Clear selection after download
    } catch(err) {
      console.error(err);
      alert("Error procesando descargas: " + err.message);
    } finally {
      setIsDownloading(false);
    }
  }

  const handleCancelFactura = async (id, motivo, substitution) => {
     const res = await cancelarFactura(id, motivo, substitution);
     if(!res.success) throw new Error(res.error);
     alert("Factura enviada a cancelación exitosamente.");
     router.refresh();
  }

  const handleComplement = async (id, monto, formaPago, fechaPago, moneda, tipoCambio, numOperacion) => {
     const res = await emitirComplementoPago(id, monto, formaPago, fechaPago, moneda, tipoCambio, numOperacion);
     if(!res.success) throw new Error(res.error);
     alert("Complemento REP timbrado exitosamente.");
     router.refresh();
  }

  const handleNotaCredito = async (id, monto, formaPago, usoCfdi, concepto) => {
     const res = await emitirNotaCredito(id, monto, formaPago, usoCfdi, concepto);
     if(!res.success) throw new Error(res.error);
     alert("Nota de Crédito timbrada exitosamente.");
     router.refresh();
  }

  return (
    <div>
      {/* Panel de Filtros Secundarios */}
      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{display: 'block', fontSize: '0.85rem', marginBottom: '4px'}}>Empresa Emisora</label>
          <select className="input" value={empresaFiltro} onChange={e => setEmpresaFiltro(e.target.value)} style={{minWidth: '200px'}}>
            <option value="">Todas las Empresas</option>
            {empresas.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.razonSocial}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{display: 'block', fontSize: '0.85rem', marginBottom: '4px'}}>Fecha Inicio</label>
          <input type="date" className="input" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
        </div>
        <div>
          <label style={{display: 'block', fontSize: '0.85rem', marginBottom: '4px'}}>Fecha Fin</label>
          <input type="date" className="input" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
        </div>
        <div>
          <label style={{display: 'block', fontSize: '0.85rem', marginBottom: '4px'}}>Orden</label>
          <select className="input" value={orden} onChange={e => setOrden(e.target.value)}>
            <option value="desc">Más recientes primero</option>
            <option value="asc">Más antiguos primero</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
           <button className="btn" onClick={applyFilters}>Aplicar Filtros</button>
           {(fechaInicio || fechaFin || empresaFiltro || orden !== 'desc') && (
             <button className="btn" style={{background: 'rgba(255,255,255,0.1)'}} onClick={clearFilters}>Limpiar</button>
           )}
        </div>
      </div>

      {/* Panel Central Batch */}
      {selectedDocs.length > 0 && (
         <div style={{ padding: '0.5rem 1rem', background: 'rgba(0,100,255,0.2)', border: '1px solid var(--primary)', borderRadius: '8px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{selectedDocs.length} facturas seleccionadas listas para descargar.</span>
            <button className="btn" onClick={downloadSelected} disabled={isDownloading}>
              {isDownloading ? 'Empaquetando...' : `📦 Descargar las ${selectedDocs.length} marcadas (.zip)`}
            </button>
         </div>
      )}

      {/* Tabla */}
      <table className="table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--primary)' }}>
            <th style={{ width: '40px', paddingLeft: '1rem' }}>
              <input type="checkbox" 
                     onChange={selectAll} 
                     checked={selectedDocs.length === facturasInitial.filter(f => f.uuid).length && facturasInitial.length > 0} />
            </th>
            <th>ID Interno / UUID</th>
            <th>Emisor</th>
            <th>Método</th>
            <th>Pago REP</th>
            <th>Fecha</th>
            <th>Total</th>
            <th>Estatus</th>
            <th>Descargas</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {facturasInitial.length === 0 ? (
            <tr><td colSpan="10" style={{ padding: '2rem', textAlign: 'center' }}>No existen facturas timbradas con estos filtros aún.</td></tr>
          ) : facturasInitial.map(fac => {
             const hasUUID = !!fac.uuid;
             return (
              <React.Fragment key={fac.id}>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: selectedDocs.includes(fac.id) ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                <td style={{ padding: '1rem 0', paddingLeft: '1rem' }}>
                  {hasUUID && <input type="checkbox" checked={selectedDocs.includes(fac.id)} onChange={() => toggleSelect(fac.id)} />}
                </td>
                <td>
                  <div style={{fontSize: '0.85rem', opacity: 0.7}}>{new Date(fac.createdAt).toLocaleTimeString()} {fac.id.substring(0,8)}...</div>
                  <div style={{fontFamily: 'monospace', fontWeight: 'bold'}}>{fac.uuid || 'En Proceso...'}</div>
                </td>
                <td>{fac.empresa.razonSocial}</td>
                <td>
                  <span style={{background: 'rgba(255,255,255,0.1)', padding:'2px 6px', borderRadius:'4px', fontSize:'0.8rem'}}>
                    {fac.metodoPago || 'PUE'}
                  </span>
                </td>
                <td>
                  <BotonComplemento factura={fac} onComplement={handleComplement} />
                  <BotonNotaCredito factura={fac} onEmit={handleNotaCredito} />
                </td>
                <td>{new Date(fac.fechaEmision).toLocaleDateString()}</td>
                <td>${fac.total.toFixed(2)}</td>
                <td>
                  <span style={{ 
                     padding: '4px 8px', borderRadius: '4px', fontSize: '12px',
                     background: fac.estatus.includes('Cancelada') ? 'rgba(225,29,72,0.2)' : fac.estatus.includes('Timbrada') ? 'rgba(0,255,0,0.2)' : 'rgba(255,255,0,0.2)',
                     color: fac.estatus.includes('Cancelada') ? '#f43f5e' : fac.estatus.includes('Timbrada') ? 'lightgreen' : 'var(--warning-color, yellow)'
                  }}>{fac.estatus}</span>
                </td>
                <td>
                  {hasUUID ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn" style={{padding: '4px 8px', fontSize: '0.8rem'}} onClick={() => openDownload(fac.id, 'pdf')}>📥 PDF</button>
                      <button className="btn" style={{padding: '4px 8px', fontSize: '0.8rem', background: '#eab308'}} onClick={() => openDownload(fac.id, 'xml')}>📥 XML</button>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>No disponible</span>
                  )}
                </td>
                <td>
                  <BotonCancelar factura={fac} onCancel={handleCancelFactura} />
                </td>
              </tr>
              {/* Renglón para Recibos Electrónicos de Pago (Complementos) */}
              {Array.isArray(fac.complementosPago) && fac.complementosPago.length > 0 && (
                <tr style={{ background: 'rgba(14, 116, 144, 0.1)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td colSpan="2"></td>
                  <td colSpan="8" style={{ padding: '0.5rem 1rem' }}>
                    <div style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 'bold', marginBottom: '8px' }}>
                      ↳ Complementos de Pago (REP)
                    </div>
                    {fac.complementosPago.map(comp => (
                      <div key={comp.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '4px', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '6px' }}>
                        <span style={{ fontFamily: 'monospace', color: '#ccc', width: '280px', fontSize: '0.85rem' }}>{comp.uuid || comp.id}</span>
                        <span style={{ width: '100px', fontSize: '0.85rem' }}>${parseFloat(comp.amount || 0).toFixed(2)}</span>
                        <span style={{ width: '120px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(comp.date).toLocaleDateString()}</span>
                        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                          <button className="btn" style={{padding: '2px 8px', fontSize: '0.7rem', background: '#0ea5e9'}} onClick={() => openDownloadComplement(fac.uuid, comp.id, 'pdf')}>📥 PDF REP</button>
                          <button className="btn" style={{padding: '2px 8px', fontSize: '0.7rem', background: '#eab308'}} onClick={() => openDownloadComplement(fac.uuid, comp.id, 'xml')}>📥 XML REP</button>
                        </div>
                      </div>
                    ))}
                  </td>
                </tr>
              )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
