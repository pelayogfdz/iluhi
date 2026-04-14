'use client'

import { useState } from 'react'

export default function BotonComplemento({ factura, onComplement }) {
  const [open, setOpen] = useState(false)
  const [monto, setMonto] = useState(factura.total)
  const [formaPago, setFormaPago] = useState('03') // 03 Transferencia by default
  const [fechaPago, setFechaPago] = useState('')
  const [loading, setLoading] = useState(false)

  // Solo mostrar para PPD y q tenga ID (esta timbrada), si es PUE no lleva complemento.
  // o tmb si no está cancelada.
  if (factura.metodoPago !== 'PPD' || !factura.uuid || factura.estatus.includes('Cancelada') || factura.estatus.includes('Complementado')) {
    return <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>N/A</span>;
  }

  const handlePayClick = async () => {
    if (!monto || monto <= 0) {
      alert("Debe proveer un monto válido superior a $0");
      return;
    }
    setLoading(true)
    try {
      await onComplement(factura.id, parseFloat(monto), formaPago, fechaPago)
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
        style={{ padding: '4px 8px', fontSize: '0.8rem', background: '#0e7490' }}
        onClick={() => setOpen(true)}
      >
        💳 Emitir Pago
      </button>

      {open && (
         <div style={{
           position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
           background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
           zIndex: 9999
         }}>
           <div className="glass-panel card" style={{ width: '400px', background: '#111' }}>
             <h3 style={{ marginBottom: '1rem', color: '#0e7490' }}>Emitir Complemento PPD</h3>
             <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                Se generará un Recibo REP adjunto a la factura <strong>{factura.uuid.split('-')[0]}...</strong>
             </p>

             <div style={{ marginBottom: '1rem' }}>
               <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>Forma de Pago Efectuada</label>
               <select className="input" value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
                 <option value="01">01 - Efectivo</option>
                 <option value="02">02 - Cheque nominativo</option>
                 <option value="03">03 - Transferencia electrónica</option>
                 <option value="04">04 - Tarjeta de crédito</option>
                 <option value="28">28 - Tarjeta de débito</option>
                 <option value="99">99 - Por definir</option>
               </select>
             </div>

             <div style={{ marginBottom: '1rem' }}>
               <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>Monto a Liquidar (MXN)</label>
               <input 
                 type="number" 
                 step="0.01"
                 className="input" 
                 value={monto} 
                 onChange={(e) => setMonto(e.target.value)} 
               />
               <small style={{ color: 'var(--text-secondary)' }}>Monto total CFDI: ${factura.total.toFixed(2)}</small>
             </div>

             <div style={{ marginBottom: '1rem' }}>
               <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>Fecha de Pago (Opcional)</label>
               <input 
                 type="datetime-local" 
                 className="input" 
                 value={fechaPago} 
                 onChange={(e) => setFechaPago(e.target.value)} 
               />
               <small style={{ color: 'var(--text-secondary)' }}>Dejar vacío para usar la fecha y hora actual.</small>
             </div>

             <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
               <button className="btn" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }} onClick={() => setOpen(false)}>Cancelar</button>
               <button className="btn" style={{ background: '#0e7490' }} disabled={loading} onClick={handlePayClick}>
                 {loading ? 'Timbrando...' : 'Timbrar Pago REP'}
               </button>
             </div>
           </div>
         </div>
      )}
    </>
  )
}
