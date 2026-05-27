'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { guardarCotizacion, generarVistaPreviaCotizacion } from '../acciones'
import ProductSelector from '../../components/ProductSelector'
import SearchableSelect from '../../components/SearchableSelect'

export default function CotizacionForm({ empresas, clientes, catalogoProductos }) {
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

    setItems([...items, { ...prodOrigin, cantidad: tempCantidad }])
    
    setTempProductoId('')
    setTempCantidad(1)
  }

  const handleMostrarPrevia = async () => {
    if (!empresaId || !clienteId || items.length === 0) {
      setResultado({ msg: "❗ Faltan datos (Empresa, Cliente o Conceptos) para generar la vista previa.", type: "error" })
      return;
    }
    setCargando(true)
    setResultado({ msg: "Generando PDF de Vista Previa...", type: "info" })
    try {
      const payload = { empresaId, clienteId, items, notasServicio, usoCfdi, formaPago, metodoPago };
      const res = await generarVistaPreviaCotizacion(payload);
      if (res.success && res.base64) {
        const byteCharacters = atob(res.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {type: 'application/pdf'});
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setResultado(null)
      } else {
        setResultado({ msg: `❌ Error: ${res.error}`, type: "error" })
      }
    } catch (error) {
      setResultado({ msg: "❌ Falló la generación del PDF.", type: "error" })
    } finally {
      setCargando(false)
    }
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

  const handleChangeSubtotal = (index, valStr) => {
    const newArr = [...items];
    const newSubtotal = parseFloat(valStr);
    
    if (isNaN(newSubtotal)) {
      newArr[index] = { ...newArr[index], _subtotalStr: valStr };
      setItems(newArr);
      return;
    }
    
    newArr[index] = { 
      ...newArr[index], 
      precio: newSubtotal / newArr[index].cantidad,
      _subtotalStr: valStr,
      _totalStr: undefined
    };
    setItems(newArr);
  }

  const handleChangeTotal = (index, valStr) => {
    const newArr = [...items];
    const newTotal = parseFloat(valStr);
    
    if (isNaN(newTotal)) {
      newArr[index] = { ...newArr[index], _totalStr: valStr };
      setItems(newArr);
      return;
    }
    
    const it = newArr[index];
    const tasa = (it.impuesto === '002' || !it.impuesto) ? (it.tasaOCuota ? parseFloat(it.tasaOCuota) : 0.16) : 0;
    const newPrecio = newTotal / (it.cantidad * (1 + tasa));
    
    newArr[index] = { 
      ...newArr[index], 
      precio: newPrecio,
      _totalStr: valStr,
      _subtotalStr: undefined
    };
    setItems(newArr);
  }

  const handleSometerCotizacion = async (e) => {
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
      setResultado({ msg: "❗ El carrito está vacío.", type: "error" })
      return;
    }

    setCargando(true)
    setResultado({ msg: "Guardando Cotización...", type: "info" })

    const payload = {
      empresaId,
      clienteId,
      usoCfdi,
      formaPago,
      metodoPago,
      notasServicio,
      items: items.map(it => ({
        ...it,
        productoId: it.id 
      }))
    };

    try {
      const serverRes = await guardarCotizacion(payload)

      if (serverRes.success) {
        setResultado({ msg: `✅ Cotización Creada Exitosamente`, type: "success" })
        setTimeout(() => router.push('/cotizaciones'), 2000)
      } else {
        setResultado({ msg: `❌ ${serverRes.error}`, type: "error" })
      }
    } catch (error) {
      console.error("Error al guardar cotización:", error);
      setResultado({ msg: `❌ Error de red o tiempo de espera agotado. Por favor intente nuevamente.`, type: "error" })
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
    <form onSubmit={handleSometerCotizacion} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="responsive-columns">
        
        {/* Columna Izquierda - Constructor */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
            <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>1. Cabecera</h3>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>Empresa Emisora</label>
              <SearchableSelect 
                value={empresaId}
                onChange={(val) => { setEmpresaId(val); setClienteId(''); setItems([]); }}
                options={empresasOptions}
                placeholder="Selecciona Empresa..."
                required={true}
              />
            </div>

            <div className="form-group">
              <label>Cliente Receptor</label>
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
             <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>2. Parámetros Tentativos</h3>
             <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Uso del CFDI Esperado</label>
                <select className="form-control" value={usoCfdi} onChange={e => setUsoCfdi(e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                  <option value="G03">G03 - Gastos en general</option>
                  <option value="G01">G01 - Adquisición de mercancías</option>
                  <option value="I04">I04 - Equipo de computo y accesorios</option>
                  <option value="S01">S01 - Sin efectos fiscales</option>
                </select>
             </div>
             
             <div className="form-grid-2">
                <div className="form-group">
                  <label>Método de Pago Esperado</label>
                  <select className="form-control" value={metodoPago} onChange={e => {
                    const val = e.target.value;
                    setMetodoPago(val);
                    if (val === 'PPD') setFormaPago('99');
                    else if (val === 'PUE' && formaPago === '99') setFormaPago('03'); 
                  }} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <option value="PUE">PUE - Pago en Una Sola Exhibición</option>
                    <option value="PPD">PPD - Pago en Parcialidades / Diferido</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Forma de Pago Esperada</label>
                  <select className="form-control" value={formaPago} onChange={e => setFormaPago(e.target.value)} disabled={metodoPago === 'PPD'} style={{ backgroundColor: 'rgba(0,0,0,0.5)', opacity: metodoPago === 'PPD' ? 0.6 : 1 }}>
                    <option value="03">03 - Transferencia Electrónica</option>
                    <option value="01">01 - Efectivo</option>
                    <option value="04">04 - Tarjeta Crédito</option>
                    <option value="99">99 - Por definir (Obligatorio para PPD)</option>
                  </select>
                </div>
             </div>
             <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Notas / Condiciones Adicionales</label>
                <textarea 
                   className="form-control" 
                   value={notasServicio} 
                   onChange={e => setNotasServicio(e.target.value)} 
                   placeholder="Condiciones de pago, validez de la cotización, garantías, etc."
                   style={{ backgroundColor: 'rgba(0,0,0,0.5)', minHeight: '80px', resize: 'vertical' }}
                />
             </div>
          </div>

        </div>

        {/* Columna Derecha - Resumen Magnético */}
        <div className="glass-panel" style={{ position: 'sticky', top: '2rem', height: 'fit-content' }}>
          <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>Resumen Cotización</h3>
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <span style={{ color: 'var(--text-secondary)' }}>Subtotal:</span>
               <span>$ {totalSub.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <span style={{ color: 'var(--text-secondary)' }}>IVA Aprox:</span>
               <span style={{ color: 'var(--accent)' }}>$ {totalIVA.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', fontWeight: 'bold', fontSize: '1.2rem' }}>
               <span>Total Estimado:</span>
               <span>$ {totalFinal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
             </div>
          </div>
        </div>
      </div>

      {/* Panel Inferior Completo - Conceptos y Botones */}
      <div className="glass-panel" style={{ width: '100%', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>3. Productos o Servicios Cotizados</h3>
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
              + Agregar Concepto
            </button>
        </div>
        
        {/* Tabla del Carrito */}
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '1rem', minHeight: '300px', overflowX: 'auto', flex: 1 }}>
               {items.length === 0 ? <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '1rem' }}>No hay conceptos agregados aún.</p> : 
               items.map((it, idx) => {
                 const subtotal = it.cantidad * it.precio;
                 const iva = it.impuesto === '002' ? subtotal * it.tasaOCuota : 0;
                 const totalItem = subtotal + iva;

                 const displaySubtotal = it._subtotalStr !== undefined ? it._subtotalStr : subtotal.toFixed(2);
                 const displayTotal = it._totalStr !== undefined ? it._totalStr : totalItem.toFixed(2);

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
                         <span>{it.cantidad} x ${it.precio.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1rem' }}>
                         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                           <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Costo: $</span>
                           <input 
                             type="number" step="0.01" 
                             value={displaySubtotal} 
                             onChange={(e) => handleChangeSubtotal(idx, e.target.value)} 
                             onBlur={() => {
                               const newArr = [...items];
                               newArr[idx]._subtotalStr = undefined;
                               setItems(newArr);
                             }}
                             style={{ width: '80px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '2px 4px', fontSize: '0.8rem', borderRadius: '4px', textAlign: 'right' }} 
                           />
                         </div>
                         <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>IVA: ${iva.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                           <span style={{ fontWeight: 'bold', fontSize: '1rem', color: 'white' }}>Total: $</span>
                           <input 
                             type="number" step="0.01" 
                             value={displayTotal} 
                             onChange={(e) => handleChangeTotal(idx, e.target.value)} 
                             onBlur={() => {
                               const newArr = [...items];
                               newArr[idx]._totalStr = undefined;
                               setItems(newArr);
                             }}
                             style={{ width: '100px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--accent)', color: 'white', padding: '4px', fontSize: '1rem', fontWeight: 'bold', borderRadius: '4px', textAlign: 'right' }} 
                           />
                         </div>
                      </div>
                      <button type="button" onClick={() => handleEliminarConcepto(idx)} style={{ background: 'red', color: 'white', border: 'none', borderRadius: '4px', padding: '0.4rem 0.6rem', cursor: 'pointer', height: 'fit-content' }}>X</button>
                    </div>
                 </div>
                 );
               })}
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
          
          <div style={{ display: 'flex', gap: '0.5rem', flex: 1, justifyContent: 'flex-end' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleMostrarPrevia}
              disabled={cargando || !empresaId || !clienteId || items.length === 0}
              style={{ padding: '1rem', fontSize: '1.2rem', flex: 1 }}
            >
              👁️ Mostrar Previa (PDF)
            </button>
            <button type="submit" className="btn" disabled={cargando} style={{ padding: '1rem', fontSize: '1.2rem', flex: 2 }}>
              {cargando ? 'Guardando...' : '💾 GUARDAR COTIZACIÓN'}
            </button>
          </div>
        </div>

        {resultado && (
          <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '8px', backgroundColor: resultado.type === 'error' ? 'rgba(255,0,0,0.2)' : 'rgba(0,255,0,0.2)'}}>
            {resultado.msg}
          </div>
        )}
      </div>
    </form>
  )
}
