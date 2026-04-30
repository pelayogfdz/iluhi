'use client'

import { useState } from 'react'

export default function BotonCancelarComplemento({ facturaId, complemento, onCancel }) {
  const [open, setOpen] = useState(false)
  const [motivo, setMotivo] = useState('02')
  const [loading, setLoading] = useState(false)

  // Ocultamos si no tiene UUID de Facturapi
  if (!complemento.uuid && !complemento.id.includes('sim_')) {
    return null;
  }

  const handleCancelClick = async () => {
    if (!confirm(`¿Estás seguro de que quieres cancelar el complemento de pago (Recibo ${complemento.uuid || complemento.id})?`)) {
      return;
    }

    setLoading(true)
    try {
      await onCancel(facturaId, complemento.id, motivo)
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
        style={{ padding: '2px 8px', fontSize: '0.7rem', background: '#e11d48' }}
        onClick={() => setOpen(true)}
      >
        ❌ Cancelar REP
      </button>

      {open && (
         <div style={{
           position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
           background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
           zIndex: 9999
         }}>
           <div className="glass-panel card" style={{ width: '400px', background: '#111' }}>
             <h3 style={{ marginBottom: '1rem', color: '#e11d48' }}>Cancelar Complemento REP</h3>
             <div style={{ marginBottom: '1rem' }}>
               <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>Motivo de cancelación (SAT)</label>
               <select className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                 <option value="02">02 - Comprobante emitido con errores sin relación</option>
                 <option value="03">03 - No se llevó a cabo la operación</option>
               </select>
             </div>

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
