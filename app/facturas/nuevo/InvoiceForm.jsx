'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { prepararYTimbrarFactura } from '../acciones'
import ProductSelector from '../../components/ProductSelector'

export default function InvoiceForm({ empresas, clientes, catalogoProductos }) {
  const router = useRouter()
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState(null)
  
  // Estado del Formulario Principal
  const [empresaId, setEmpresaId] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [usoCfdi, setUsoCfdi] = useState('G03')
  const [formaPago, setFormaPago] = useState('03')
  const [metodoPago, setMetodoPago] = useState('PUE')
  const [notasServicio, setNotasServicio] = useState('')

  // Estado del carrito de conceptos
  const [items, setItems] = useState([])
  const [tempProductoId, setTempProductoId] = useState('')
  const [tempCantidad, setTempCantidad] = useState(1)

  // Clientes globales disponibles independientemente de la empresa emisora
  const clientesFiltrados = clientes
  
  // Filtrado reactivo de productos de la empresa
  const productosFiltrados = catalogoProductos.filter(p => p.empresaId === empresaId)

  const handleAgregarConcepto = () => {
    if (!tempProductoId) return;
    const prodOrigin = productosFiltrados.find(p => p.id === tempProductoId)
    if (!prodOrigin) return;

    // Agregar al carrito desvinculándolo ligeramente para permitir alteración antes del disparo
    setItems([...items, { ...prodOrigin, cantidad: tempCantidad }])
    
    // Reset inputs
    setTempProductoId('')
    setTempCantidad(1)
  }

  const handleEliminarConcepto = (index) => {
    const newArr = [...items]
    newArr.splice(index, 1)
    setItems(newArr)
  }

  const handleChangeDescripcion = (index, newVal) => {
    const newArr = [...items];
    newArr[index] = { ...newArr[index], descripcion: newVal };
    setItems(newArr);
  }

  const handleSometerFactura = async (e) => {
    e.preventDefault()
    if (!empresaId || !clienteId || items.length === 0) {
      alert("Seleccione Emisor, Cliente y al menos 1 producto.")
      return;
    }

    setCargando(true)
    setResultado({ msg: "Conectando con el motor SAT...", type: "info" })

    const payload = {
      empresaId,
      clienteId,
      usoCfdi,
      formaPago,
      metodoPago,
      notasServicio,
      items: items.map(it => ({
        ...it,
        productoId: it.id // Mapeo de Producto DB
      }))
    };

    const serverRes = await prepararYTimbrarFactura(payload)

    if (serverRes.success) {
      setResultado({ msg: `✅ Factura Armada con Estatus: ${serverRes.status}`, type: "success" })
      setTimeout(() => router.push('/facturas'), 2500)
    } else {
      setResultado({ msg: `❌ ${serverRes.error}`, type: "error" })
    }
    setCargando(false)
  }

  // Calculos visuales
  const totalSub = items.reduce((acc, current) => acc + (current.precio * current.cantidad), 0)

  return (
    <div className="responsive-columns">
      
      {/* Columna Izquierda - Constructor */}
      <div className="glass-panel">
        <form onSubmit={handleSometerFactura} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
            <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>1. Cabecera (Emisor y Receptor)</h3>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>Empresa Emisora (SaaS Tenant)</label>
              <select className="form-control" value={empresaId} onChange={e => { setEmpresaId(e.target.value); setClienteId(''); setItems([]); }} required style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <option value="">Selecciona Empresa...</option>
                {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.razonSocial}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Paso 2: Cliente Receptor</label>
              <select className="form-control" value={clienteId} onChange={e => setClienteId(e.target.value)} required style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <option value="">Selecciona al cliente</option>
                {clientesFiltrados.map(c => (
                  <option key={c.id} value={c.id}>{c.razonSocial} ({c.rfc})</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
             <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>2. Parámetros de Cobro</h3>
             <div className="responsive-grid-3">
                <div className="form-group">
                  <label>Uso del CFDI</label>
                  <select className="form-control" value={usoCfdi} onChange={e => setUsoCfdi(e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <option value="G03">Gastos en general</option>
                    <option value="G01">Adquisición de mercancias</option>
                    <option value="I08">Otra maquinaria o Eq.</option>
                    <option value="P01">Por definir</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Forma Pago</label>
                  <select className="form-control" value={formaPago} onChange={e => setFormaPago(e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <option value="03">03 - Transferencia Electrónica</option>
                    <option value="01">01 - Efectivo</option>
                    <option value="04">04 - Tarjeta Crédito</option>
                    <option value="99">99 - Por definir</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Método Pago</label>
                  <select className="form-control" value={metodoPago} onChange={e => setMetodoPago(e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <option value="PUE">Pago en Una Sola Exhibición</option>
                    <option value="PPD">Pago en Parcialidades / Diferido</option>
                  </select>
                </div>
             </div>
             <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Notas del Servicio / Descripción Adicional (Opcional)</label>
                <textarea 
                   className="form-control" 
                   value={notasServicio} 
                   onChange={e => setNotasServicio(e.target.value)} 
                   placeholder="Escribe aquí las consideraciones, reportes de servicio, garantías, o notas que quieras que aparezcan en los PDFs (Cotización, Orden y Factura Oficial)..."
                   style={{ backgroundColor: 'rgba(0,0,0,0.5)', minHeight: '80px', resize: 'vertical' }}
                />
             </div>
          </div>

          <div>
            <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>3. Conceptos (El Carrito)</h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: '1 1 300px' }}>
                  <label>Catálogo de Productos</label>
                  <ProductSelector 
                     options={productosFiltrados} 
                     value={tempProductoId} 
                     onChange={setTempProductoId} 
                     disabled={!empresaId} 
                     placeholder="Añade un producto al carrito... (Teclea para buscar)"
                  />
                </div>
                <div className="form-group" style={{ flex: '1 1 100px' }}>
                  <label>Cantidad</label>
                  <input type="number" step="0.01" min="0.01" className="form-control" value={tempCantidad} onChange={e => setTempCantidad(e.target.value)} disabled={!tempProductoId} />
                </div>
                <button type="button" className="btn" onClick={handleAgregarConcepto} disabled={!tempProductoId} style={{ flex: '1 1 150px' }}>+ Anexar</button>
            </div>
            
            {/* Tabla del Carrito */}
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '1rem', minHeight: '100px', overflowX: 'auto' }}>
               {items.length === 0 ? <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '1rem' }}>El carrito está vacío.</p> : 
               items.map((it, idx) => (
                 <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0.5rem 0', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ flex: '1 1 250px' }}>
                      <input 
                         type="text" 
                         value={it.descripcion} 
                         onChange={(e) => handleChangeDescripcion(idx, e.target.value)}
                         className="form-control"
                         style={{ fontWeight: 'bold', padding: '0.3rem', width: '100%', minWidth: '150px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.2)' }}
                      />
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Clave SAT: {it.claveProdServ} | Impuesto: {it.impuesto === '002' ? 'IVA '+(it.tasaOCuota*100)+'%' : 'Exento/Otro'}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span>{it.cantidad} x ${it.precio.toFixed(2)}</span>
                      <span style={{ fontWeight: 'bold', width: '80px', textAlign: 'right' }}>$ {(it.cantidad * it.precio).toFixed(2)}</span>
                      <button type="button" onClick={() => handleEliminarConcepto(idx)} style={{ background: 'red', color: 'white', border: 'none', borderRadius: '4px', padding: '0.2rem 0.6rem', cursor: 'pointer' }}>X</button>
                    </div>
                 </div>
               ))}
            </div>
          </div>

          <button type="submit" className="btn" disabled={cargando || items.length === 0} style={{ padding: '1rem', fontSize: '1.2rem', marginTop: '1rem' }}>
            {cargando ? 'Ensamblando Arquitectura SAT...' : '▶ DISPARAR TIMBRADO PAC (FACTURAPI)'}
          </button>

          {resultado && (
            <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '8px', backgroundColor: resultado.type === 'error' ? 'rgba(255,0,0,0.2)' : 'rgba(0,255,0,0.2)'}}>
              {resultado.msg}
            </div>
          )}

        </form>
      </div>

      {/* Columna Derecha - Resumen Magnético */}
      <div className="glass-panel" style={{ position: 'sticky', top: '2rem' }}>
        <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>Resumen Premiliminar</h3>
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between' }}>
             <span style={{ color: 'var(--text-secondary)' }}>Subtotal:</span>
             <span>$ {totalSub.toFixed(2)}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between' }}>
             <span style={{ color: 'var(--text-secondary)' }}>Impuestos Aprox:</span>
             <span style={{ color: 'var(--accent)' }}>Calculado por PAC en vuelo</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', fontWeight: 'bold', fontSize: '1.2rem' }}>
             <span>Base Total:</span>
             <span>$ {totalSub.toFixed(2)}</span>
           </div>
        </div>
        <p style={{ marginTop: '2rem', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
          Al presionar "Disparar", el esquema JSON será firmado criptográficamente, validado con las reglas LCO del SAT mediante Smart Web (Facturapi) y se expedirá inmediatamente el folio fiscal UUID 4.0.
        </p>
      </div>

    </div>
  )
}
