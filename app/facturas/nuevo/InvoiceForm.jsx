'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { prepararYTimbrarFactura } from '../acciones'
import ProductSelector from '../../components/ProductSelector'
import SearchableSelect from '../../components/SearchableSelect'

export default function InvoiceForm({ empresas, clientes, catalogoProductos }) {
  const router = useRouter()
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState(null)
  
  // Estado del Formulario Principal
  const [empresaId, setEmpresaId] = useState('')
  const [clienteId, setClienteId] = useState('')

  const empresasOptions = empresas.map(emp => ({
    value: emp.id,
    label: `${emp.razonSocial} (${emp.rfc})`
  }));
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
    if (!empresaId) {
      setResultado({ msg: "❗ Seleccione una Empresa Emisora.", type: "error" })
      return;
    }
    if (!clienteId) {
      setResultado({ msg: "❗ Seleccione un Cliente Receptor.", type: "error" })
      return;
    }
    if (items.length === 0) {
      setResultado({ msg: "❗ El carrito está vacío. Agregue al menos 1 producto para disparar el timbrado PAC.", type: "error" })
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

    try {
      const serverRes = await prepararYTimbrarFactura(payload)

      if (serverRes.success) {
        setResultado({ msg: `✅ Factura Armada con Estatus: ${serverRes.status}`, type: "success" })
        setTimeout(() => router.push('/facturas'), 2500)
      } else {
        setResultado({ msg: `❌ ${serverRes.error}`, type: "error" })
      }
    } catch (error) {
      console.error("Error al disparar la accion del servidor:", error);
      setResultado({ msg: `❌ Error de red o tiempo de espera agotado. Facturapi/SAT tardó demasiado o la conexión falló. Por favor intente nuevamente.`, type: "error" })
    } finally {
      setCargando(false)
    }
  }

  // Calculos visuales
  const totalSub = items.reduce((acc, current) => acc + (current.precio * current.cantidad), 0)
  
  const totalIVA = items.reduce((acc, current) => {
      if (current.impuesto === '002' || !current.impuesto) {
          const tasa = current.tasaOCuota ? parseFloat(current.tasaOCuota) : 0.16;
          return acc + (current.precio * current.cantidad * tasa);
      }
      return acc;
  }, 0);

  const totalFinal = totalSub + totalIVA;

  return (
    <div className="responsive-columns">
      
      {/* Columna Izquierda - Constructor */}
      <div className="glass-panel">
        <form onSubmit={handleSometerFactura} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
            <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>1. Cabecera (Emisor y Receptor)</h3>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>Empresa Emisora (SaaS Tenant)</label>
              <SearchableSelect 
                value={empresaId}
                onChange={(val) => { setEmpresaId(val); setClienteId(''); setItems([]); }}
                options={empresasOptions}
                placeholder="Selecciona Empresa..."
                required={true}
              />
            </div>

            <div className="form-group">
              <label>Paso 2: Cliente Receptor</label>
              <SearchableSelect 
                value={clienteId}
                onChange={setClienteId}
                options={clientesFiltrados.map(c => ({ value: c.id, label: `${c.razonSocial} (${c.rfc})` }))}
                placeholder="Selecciona al cliente"
                required={true}
              />
            </div>
          </div>

          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
             <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>2. Parámetros de Cobro</h3>
             <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Uso del CFDI</label>
                <select className="form-control" value={usoCfdi} onChange={e => setUsoCfdi(e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                  <option value="G01">G01 - Adquisición de mercancías</option>
                  <option value="G02">G02 - Devoluciones, descuentos o bonificaciones</option>
                  <option value="G03">G03 - Gastos en general</option>
                  <option value="I01">I01 - Construcciones</option>
                  <option value="I02">I02 - Mobiliario y equipo de oficina por inversiones</option>
                  <option value="I03">I03 - Equipo de transporte</option>
                  <option value="I04">I04 - Equipo de computo y accesorios</option>
                  <option value="I05">I05 - Dados, troqueles, moldes, matrices y herramental</option>
                  <option value="I06">I06 - Comunicaciones telefónicas</option>
                  <option value="I07">I07 - Comunicaciones satelitales</option>
                  <option value="I08">I08 - Otra maquinaria y equipo</option>
                  <option value="D01">D01 - Honorarios médicos, dentales y hospitalarios</option>
                  <option value="D02">D02 - Gastos médicos por incapacidad o discapacidad</option>
                  <option value="D03">D03 - Gastos funerales</option>
                  <option value="D04">D04 - Donativos</option>
                  <option value="D05">D05 - Intereses reales efectivamente pagados por créditos hipotecarios</option>
                  <option value="D06">D06 - Aportaciones voluntarias al SAR</option>
                  <option value="D07">D07 - Primas por seguros de gastos médicos</option>
                  <option value="D08">D08 - Gastos de transportación escolar obligatoria</option>
                  <option value="D09">D09 - Depósitos en cuentas para el ahorro, planes de pensiones</option>
                  <option value="D10">D10 - Pagos por servicios educativos (colegiaturas)</option>
                  <option value="P01">P01 - Por definir (Solo comprobante de Pagos y Retenciones)</option>
                  <option value="S01">S01 - Sin efectos fiscales</option>
                  <option value="CP01">CP01 - Pagos</option>
                  <option value="CN01">CN01 - Nómina</option>
                </select>
             </div>
             
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Método de Pago</label>
                  <select className="form-control" value={metodoPago} onChange={e => {
                    const val = e.target.value;
                    setMetodoPago(val);
                    if (val === 'PPD') setFormaPago('99');
                    else if (val === 'PUE' && formaPago === '99') setFormaPago('03'); // Fallback to Transferencia si estaba en 99
                  }} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <option value="PUE">PUE - Pago en Una Sola Exhibición</option>
                    <option value="PPD">PPD - Pago en Parcialidades / Diferido</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Forma de Pago</label>
                  <select className="form-control" value={formaPago} onChange={e => setFormaPago(e.target.value)} disabled={metodoPago === 'PPD'} style={{ backgroundColor: 'rgba(0,0,0,0.5)', opacity: metodoPago === 'PPD' ? 0.6 : 1 }}>
                    <option value="03">03 - Transferencia Electrónica</option>
                    <option value="01">01 - Efectivo</option>
                    <option value="04">04 - Tarjeta Crédito</option>
                    <option value="99">99 - Por definir (Obligatorio para PPD)</option>
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
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)' }}>
                <div className="form-group" style={{ flex: '1 1 300px' }}>
                  <label style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Buscar Producto o Servicio</label>
                  <ProductSelector 
                     options={productosFiltrados} 
                     value={tempProductoId} 
                     onChange={setTempProductoId} 
                     disabled={!empresaId} 
                     placeholder="🔍 Teclea para buscar en tu catálogo..."
                  />
                </div>
                <div className="form-group" style={{ flex: '0 1 120px' }}>
                  <label>Cantidad</label>
                  <input 
                     type="number" step="0.01" min="0.01" className="form-control" 
                     value={tempCantidad} onChange={e => setTempCantidad(e.target.value)} 
                     onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); handleAgregarConcepto(); } }}
                     disabled={!tempProductoId} 
                     style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}
                  />
                </div>
                <button 
                  type="button" 
                  className="btn" 
                  onClick={handleAgregarConcepto} 
                  disabled={!tempProductoId} 
                  style={{ flex: '0 1 180px', height: '48px', backgroundColor: 'var(--accent)', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', transition: 'all 0.2s ease' }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  + Agregar al Ticket
                </button>
            </div>
            
            {/* Tabla del Carrito */}
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '1rem', minHeight: '100px', overflowX: 'auto' }}>
               {items.length === 0 ? <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '1rem' }}>El carrito está vacío.</p> : 
               items.map((it, idx) => {
                 const subtotal = it.cantidad * it.precio;
                 const iva = it.impuesto === '002' ? subtotal * it.tasaOCuota : 0;
                 const totalItem = subtotal + iva;

                 return (
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.9rem' }}>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', color: 'var(--text-secondary)' }}>
                         <span>{it.cantidad} x ${it.precio.toFixed(2)}</span>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1rem' }}>
                         <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Costo: ${subtotal.toFixed(2)}</span>
                         <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>IVA: ${iva.toFixed(2)}</span>
                         <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'white' }}>Total: ${totalItem.toFixed(2)}</span>
                      </div>
                      <button type="button" onClick={() => handleEliminarConcepto(idx)} style={{ background: 'red', color: 'white', border: 'none', borderRadius: '4px', padding: '0.4rem 0.6rem', cursor: 'pointer', height: 'fit-content' }}>X</button>
                    </div>
                 </div>
                 );
               })}
            </div>
          </div>

          <button type="submit" className="btn" disabled={cargando} style={{ padding: '1rem', fontSize: '1.2rem', marginTop: '1rem' }}>
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
             <span style={{ color: 'var(--text-secondary)' }}>IVA Aprox:</span>
             <span style={{ color: 'var(--accent)' }}>$ {totalIVA.toFixed(2)}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', fontWeight: 'bold', fontSize: '1.2rem' }}>
             <span>Total Estimado:</span>
             <span>$ {totalFinal.toFixed(2)}</span>
           </div>
        </div>
        <p style={{ marginTop: '2rem', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
          Al presionar "Disparar", el esquema JSON será firmado criptográficamente, validado con las reglas LCO del SAT mediante Smart Web (Facturapi) y se expedirá inmediatamente el folio fiscal UUID 4.0.
        </p>
      </div>

    </div>
  )
}
