'use client'

import { useState } from 'react'

export default function BotonComplemento({ factura, onComplement }) {
  const [open, setOpen] = useState(false)

  const complements = Array.isArray(factura.complementosPago) ? factura.complementosPago : []
  const activeComplements = complements.filter(c => c.status !== 'canceled' && c.estatus !== 'Cancelado')
  const previousPayments = activeComplements.reduce((sum, comp) => sum + parseFloat(comp.amount || 0), 0)
  const remainingBalance = Math.max(0, factura.total - previousPayments)

  const canceledComplements = complements.filter(c => (c.status === 'canceled' || c.estatus === 'Cancelado') && (c.uuid || c.id))

  const [monto, setMonto] = useState(remainingBalance <= 0.009 ? parseFloat(factura.total.toFixed(2)) : parseFloat(remainingBalance.toFixed(2)))
  const [formaPago, setFormaPago] = useState('03') // 03 Transferencia by default
  const [fechaPago, setFechaPago] = useState('')
  const [moneda, setMoneda] = useState('MXN')
  const [tipoCambio, setTipoCambio] = useState(1)
  const [numOperacion, setNumOperacion] = useState('')
  const [sustituyeCompUuid, setSustituyeCompUuid] = useState('')
  const [loading, setLoading] = useState(false)

  // Solo mostrar para PPD y q tenga ID (esta timbrada), si es PUE no lleva complemento.
  // o tmb si no está cancelada.
  if (factura.metodoPago !== 'PPD' || !factura.uuid || factura.estatus.includes('Cancelada')) {
    return <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>N/A</span>;
  }

  const handleOpen = () => {
    const active = (Array.isArray(factura.complementosPago) ? factura.complementosPago : []).filter(c => c.status !== 'canceled' && c.estatus !== 'Cancelado')
    const paid = active.reduce((sum, comp) => sum + parseFloat(comp.amount || 0), 0)
    const bal = Math.max(0, factura.total - paid)
    const initialMonto = bal <= 0.009 ? parseFloat(factura.total.toFixed(2)) : parseFloat(bal.toFixed(2))
    setMonto(initialMonto)
    
    // Auto-preseleccionar el primer complemento cancelado si existe y no hay nada escrito
    const canc = (Array.isArray(factura.complementosPago) ? factura.complementosPago : []).filter(c => (c.status === 'canceled' || c.estatus === 'Cancelado') && (c.uuid || c.id))
    if (canc.length > 0 && !sustituyeCompUuid) {
      setSustituyeCompUuid(canc[0].uuid || canc[0].id)
    }
    setOpen(true)
  }

  const handlePayClick = async () => {
    if (!monto || monto <= 0) {
      alert("Debe proveer un monto válido superior a $0");
      return;
    }
    setLoading(true)
    try {
      await onComplement(factura.id, parseFloat(monto), formaPago, fechaPago, moneda, parseFloat(tipoCambio), numOperacion, sustituyeCompUuid.trim())
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
        onClick={handleOpen}
      >
        💳 Emitir Pago
      </button>

      {open && (
         <div style={{
           position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
           background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
           zIndex: 9999
         }}>
           <div className="glass-panel card" style={{ width: '460px', background: '#111', maxHeight: '90vh', overflowY: 'auto' }}>
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
               <h3 style={{ margin: 0, color: '#0e7490' }}>Emitir Complemento PPD</h3>
               <span style={{ fontSize: '0.7rem', color: '#c084fc', background: 'rgba(168,85,247,0.2)', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                 Relación SAT 04
               </span>
             </div>
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
               <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>Monto a Liquidar</label>
               <input 
                 type="number" 
                 step="0.01"
                 className="input" 
                 value={monto} 
                 onChange={(e) => setMonto(e.target.value)} 
               />
               <small style={{ color: 'var(--text-secondary)' }}>Monto total CFDI: ${factura.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</small>
             </div>

             <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
               <div style={{ flex: 1 }}>
                 <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>Moneda</label>
                 <select className="input" value={moneda} onChange={(e) => setMoneda(e.target.value)}>
                   <option value="MXN">MXN - Peso Mexicano</option>
                   <option value="USD">USD - Dólar Estadounidense</option>
                   <option value="EUR">EUR - Euro</option>
                 </select>
               </div>
               {moneda !== 'MXN' && (
                 <div style={{ flex: 1 }}>
                   <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>Tipo de Cambio</label>
                   <input 
                     type="number" 
                     step="0.0001" 
                     className="input" 
                     value={tipoCambio} 
                     onChange={(e) => setTipoCambio(e.target.value)} 
                   />
                 </div>
               )}
             </div>

             <div style={{ marginBottom: '1rem' }}>
               <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>Número de Operación (Opcional)</label>
               <input 
                 type="text" 
                 className="input" 
                 placeholder="Ej. 123456789"
                 value={numOperacion} 
                 onChange={(e) => setNumOperacion(e.target.value)} 
               />
             </div>

             <div style={{ marginBottom: '1rem' }}>
               <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>Fecha de Pago (Opcional)</label>
               <input 
                 type="date" 
                 className="input" 
                 value={fechaPago} 
                 onChange={(e) => setFechaPago(e.target.value)} 
               />
               <small style={{ color: 'var(--text-secondary)' }}>Dejar vacío para usar la fecha y hora actual.</small>
             </div>

             <div style={{ marginBottom: '1.25rem', background: 'rgba(168,85,247,0.1)', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(168,85,247,0.3)' }}>
               <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: '#c084fc', fontWeight: 'bold' }}>
                 🔄 Sustituir REP previo cancelado (Relación SAT 04 - Opcional)
               </label>
               
               {canceledComplements.length > 0 && (
                 <div style={{ marginBottom: '6px' }}>
                   <label style={{ display: 'block', fontSize: '0.75rem', color: '#ccc', marginBottom: '2px' }}>Seleccionar complemento cancelado:</label>
                   <select 
                     className="input" 
                     value={sustituyeCompUuid} 
                     onChange={(e) => setSustituyeCompUuid(e.target.value)}
                     style={{ fontSize: '0.85rem' }}
                   >
                     <option value="">-- Ninguno / Escribir manual abajo --</option>
                     {canceledComplements.map(c => (
                       <option key={c.id || c.uuid} value={c.uuid || c.id}>
                         {c.serie || ''}{c.folio || ''} - {c.uuid ? `${c.uuid.substring(0, 13)}...` : c.id} (${parseFloat(c.amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })})
                       </option>
                     ))}
                   </select>
                 </div>
               )}

               <div>
                 <label style={{ display: 'block', fontSize: '0.75rem', color: '#ccc', marginBottom: '2px' }}>
                   UUID Fiscal a sustituir (Folio Fiscal SAT):
                 </label>
                 <input 
                   type="text" 
                   className="input" 
                   placeholder="Ej. F4A02E23-A8F9-4464-9D8D-F893FD881C6B" 
                   value={sustituyeCompUuid} 
                   onChange={(e) => setSustituyeCompUuid(e.target.value)}
                   style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}
                 />
               </div>

               <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '4px', fontSize: '0.75rem' }}>
                 Si se indica un UUID, este nuevo pago se timbrará con relación <strong>Tipo 04 (Sustitución de los CFDI previos)</strong> ante el SAT.
               </small>
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
