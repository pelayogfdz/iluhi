'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { generarVistaPreviaCotizacion } from './acciones' // We can reuse the action for downloading directly if needed, or create an API route. 
// Actually, since PDF is generated on the fly, it's better to trigger it via an action or similar, or I can make an API endpoint for it. Let's just create an API endpoint or use a client-side conversion logic.

export default function CotizacionesClient({ cotizacionesInitial, empresas }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Estados locales para filtros interactivos
  const [fechaInicio, setFechaInicio] = useState(searchParams.get('fechaInicio') || '')
  const [fechaFin, setFechaFin] = useState(searchParams.get('fechaFin') || '')
  const [empresaFiltro, setEmpresaFiltro] = useState(searchParams.get('empresa') || '')
  const [orden, setOrden] = useState(searchParams.get('orden') || 'desc')
  const q = searchParams.get('q') || ''

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

  const openDownload = async (cotizacion) => {
    try {
       // Llamamos a la acción de generar vista previa pero le pasamos los datos
       const res = await generarVistaPreviaCotizacion({
          empresaId: cotizacion.empresaId,
          clienteId: cotizacion.clienteId,
          items: cotizacion.productos,
          notasServicio: cotizacion.notasServicio
       });

       if (res.success) {
           const binaryString = window.atob(res.base64);
           const len = binaryString.length;
           const bytes = new Uint8Array(len);
           for (let i = 0; i < len; i++) {
               bytes[i] = binaryString.charCodeAt(i);
           }
           const blob = new Blob([bytes.buffer], { type: 'application/pdf' });
           const blobUrl = URL.createObjectURL(blob);
           window.open(blobUrl, '_blank');
       } else {
           alert("Error al generar PDF de cotización: " + res.error);
       }
    } catch(err) {
       console.error(err);
       alert("Ocurrió un error.");
    }
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

      {/* Tabla */}
      <table className="table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--primary)' }}>
            <th>Folio / ID</th>
            <th>Emisor</th>
            <th>Cliente Receptor</th>
            <th>Fecha</th>
            <th>Total</th>
            <th>Estatus</th>
            <th>Descargas</th>
          </tr>
        </thead>
        <tbody>
          {cotizacionesInitial.length === 0 ? (
            <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center' }}>No existen cotizaciones con estos filtros aún.</td></tr>
          ) : cotizacionesInitial.map(cot => {
             return (
              <tr key={cot.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td>
                  <div style={{fontSize: '0.85rem', opacity: 0.7}}>{new Date(cot.createdAt).toLocaleTimeString()}</div>
                  <div style={{fontFamily: 'monospace', fontWeight: 'bold'}}>Folio: {cot.folio}</div>
                </td>
                <td>{cot.empresa.razonSocial}</td>
                <td>
                  <div style={{fontSize: '0.9rem', fontWeight: 'bold'}}>{cot.cliente.razonSocial}</div>
                  <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{cot.cliente.rfc}</div>
                </td>
                <td>{new Date(cot.fechaEmision).toLocaleDateString()}</td>
                <td>${cot.total.toFixed(2)}</td>
                <td>
                  <span style={{ 
                     padding: '4px 8px', borderRadius: '4px', fontSize: '12px',
                     background: cot.estatus === 'Facturada' ? 'rgba(0,255,0,0.2)' : 'rgba(255,255,0,0.2)',
                     color: cot.estatus === 'Facturada' ? 'lightgreen' : 'var(--warning-color, yellow)'
                  }}>{cot.estatus}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxWidth: '180px' }}>
                    <button className="btn" style={{padding: '4px 8px', fontSize: '0.8rem'}} onClick={() => openDownload(cot)}>📥 PDF</button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
