'use client'

import { useState } from 'react'

export default function BotonNotaCredito({ factura, onEmit }) {
  const [open, setOpen] = useState(false)
  const [monto, setMonto] = useState(factura.total)
  const [formaPago, setFormaPago] = useState('15') // 15 Condonación es común o la forma original
  const [usoCfdi, setUsoCfdi] = useState('G02') // G02 Devoluciones, descuentos
  const [concepto, setConcepto] = useState('Devolución o descuento')
  const [loading, setLoading] = useState(false)

  // Solo mostrar para facturas de Ingreso timbradas y no canceladas
  // Si la factura no tiene UUID o está cancelada, ocultamos o mostramos N/A
  if (!factura.uuid || factura.estatus.includes('Cancelada') || factura.estatus.includes('Nota de Crédito')) {
    return null;
  }

  const handleEmitClick = async () => {
    if (!monto || monto <= 0) {
      alert("Debe proveer un monto válido superior a $0");
      return;
    }
    setLoading(true)
    try {
      await onEmit(factura.id, parseFloat(monto), formaPago, usoCfdi, concepto)
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
        style={{ padding: '4px 8px', fontSize: '0.8rem', background: '#9333ea', marginRight: '4px' }}
        onClick={() => setOpen(true)}
        title="Generar Nota de Crédito (Egreso)"
      >
        📄 N. Crédito
      </button>

      {open && (
         <div style={{
           position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
           background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
           zIndex: 9999
         }}>
           <div className="glass-panel card" style={{ width: '400px', background: '#111' }}>
             <h3 style={{ marginBottom: '1rem', color: '#a855f7' }}>Emitir Nota de Crédito</h3>
             <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                Genera un CFDI de <strong>Egreso</strong> relacionado a la factura <strong>{factura.uuid.split('-')[0]}...</strong>
             </p>

             <div style={{ marginBottom: '1rem' }}>
               <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>Monto a Devolver/Descontar</label>
               <input 
                 type="number" 
                 step="0.01"
                 className="input" 
                 value={monto} 
                 onChange={(e) => setMonto(e.target.value)} 
               />
               <small style={{ color: 'var(--text-secondary)' }}>Monto original: ${factura.total.toFixed(2)}</small>
             </div>

             <div style={{ marginBottom: '1rem' }}>
               <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>Concepto</label>
               <input 
                 type="text" 
                 className="input" 
                 value={concepto} 
                 onChange={(e) => setConcepto(e.target.value)} 
               />
             </div>

             <div style={{ marginBottom: '1rem' }}>
               <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>Forma de Pago de Devolución</label>
               <select className="input" value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
                 <option value="15">15 - Condonación</option>
                 <option value="01">01 - Efectivo</option>
                 <option value="02">02 - Cheque nominativo</option>
                 <option value="03">03 - Transferencia electrónica</option>
                 <option value="04">04 - Tarjeta de crédito</option>
               </select>
             </div>

             <div style={{ marginBottom: '1rem' }}>
               <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>Uso de CFDI</label>
               <select className="input" value={usoCfdi} onChange={(e) => setUsoCfdi(e.target.value)}>
                 <option value="G02">G02 - Devoluciones, descuentos o bonificaciones</option>
                 <option value="G03">G03 - Gastos en general</option>
               </select>
             </div>

             <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
               <button className="btn" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }} onClick={() => setOpen(false)}>Cancelar</button>
               <button className="btn" style={{ background: '#9333ea' }} disabled={loading} onClick={handleEmitClick}>
                 {loading ? 'Timbrando...' : 'Timbrar Egreso'}
               </button>
             </div>
           </div>
         </div>
      )}
    </>
  )
}
