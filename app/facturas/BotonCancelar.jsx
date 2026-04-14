'use client'

import { useState } from 'react'

export default function BotonCancelar({ factura, onCancel }) {
  const [open, setOpen] = useState(false)
  const [motivo, setMotivo] = useState('02')
  const [uuidSustitucion, setUuidSustitucion] = useState('')
  const [loading, setLoading] = useState(false)

  if (!factura.uuid || factura.estatus.includes('Cancelada')) {
    return null;
  }

  const handleCancelClick = async () => {
    if (motivo === '01' && !uuidSustitucion.trim()) {
      alert("Debes proporcionar el UUID de la factura que la sustituye.")
      return;
    }
    
    if (!confirm(`¿Estás seguro de que quieres solicitar la cancelación SAT para la factura ${factura.uuid}?`)) {
      return;
    }

    setLoading(true)
    try {
      await onCancel(factura.id, motivo, uuidSustitucion)
      setOpen(false)
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button 
        className="btn" 
        style={{ padding: '4px 8px', fontSize: '0.8rem', background: '#e11d48' }}
        onClick={() => setOpen(true)}
      >
        ❌ Cancelar
      </button>

      {open && (
         <div style={{
           position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
           background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
           zIndex: 9999
         }}>
           <div className="glass-panel card" style={{ width: '400px', background: '#111' }}>
             <h3 style={{ marginBottom: '1rem', color: '#e11d48' }}>Cancelar Factura</h3>
             <div style={{ marginBottom: '1rem' }}>
               <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>Motivo de cancelación (SAT)</label>
               <select className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                 <option value="01">01 - Comprobante emitido con errores con relación</option>
                 <option value="02">02 - Comprobante emitido con errores sin relación</option>
                 <option value="03">03 - No se llevó a cabo la operación</option>
                 <option value="04">04 - Operación nominativa relacionada en una factura global</option>
               </select>
             </div>

             {motivo === '01' && (
               <div style={{ marginBottom: '1rem' }}>
                 <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>UUID Sustitución</label>
                 <input 
                   type="text" 
                   className="input" 
                   placeholder="Ej. FAG91823-A882-C21..."
                   value={uuidSustitucion} 
                   onChange={(e) => setUuidSustitucion(e.target.value)} 
                 />
                 <small style={{ color: 'var(--text-secondary)' }}>Factura nueva que reemplaza a esta.</small>
               </div>
             )}

             <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
               <button className="btn" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }} onClick={() => setOpen(false)}>Regresar</button>
               <button className="btn" style={{ background: '#e11d48' }} disabled={loading} onClick={handleCancelClick}>
                 {loading ? 'Procesando...' : 'Confirmar Cancelación'}
               </button>
             </div>
           </div>
         </div>
      )}
    </>
  )
}
