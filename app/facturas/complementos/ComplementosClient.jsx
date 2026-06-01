'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { emitirComplementoPago, cancelarComplementoPago } from '../acciones'
import BotonCancelarComplemento from '../BotonCancelarComplemento'

export default function ComplementosClient({ ppdFacturas, empresas, clientes }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('ppd') // 'ppd' or 'history'

  // Filtros locales
  const [empresaFiltro, setEmpresaFiltro] = useState('')
  const [clienteFiltro, setClienteFiltro] = useState('')
  const [folioFiltro, setFolioFiltro] = useState('')

  // Modal de Complemento
  const [selectedFactura, setSelectedFactura] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [monto, setMonto] = useState('')
  const [formaPago, setFormaPago] = useState('03') // 03 Transferencia default
  const [fechaPago, setFechaPago] = useState('')
  const [moneda, setMoneda] = useState('MXN')
  const [tipoCambio, setTipoCambio] = useState(1)
  const [numOperacion, setNumOperacion] = useState('')
  const [loading, setLoading] = useState(false)

  // 1. Filtrar las facturas PPD
  const filteredFacturas = useMemo(() => {
    return ppdFacturas.filter(fac => {
      // Filtro Empresa
      if (empresaFiltro && fac.empresaId !== empresaFiltro) return false
      // Filtro Cliente
      if (clienteFiltro && fac.clienteId !== clienteFiltro) return false
      // Filtro Folio (Soporta serie + folio, e.g. "F5001" or just "5001")
      if (folioFiltro) {
        const fullFolio = `${fac.serie || ''}${fac.folio || ''}`.toLowerCase()
        if (!fullFolio.includes(folioFiltro.toLowerCase())) return false
      }
      return true
    })
  }, [ppdFacturas, empresaFiltro, clienteFiltro, folioFiltro])

  // 2. Extraer todos los complementos históricos de las facturas PPD filtradas
  const complementsHistory = useMemo(() => {
    const list = []
    ppdFacturas.forEach(fac => {
      // Primero aplicamos filtros de empresa/cliente del padre
      if (empresaFiltro && fac.empresaId !== empresaFiltro) return
      if (clienteFiltro && fac.clienteId !== clienteFiltro) return
      if (folioFiltro) {
        const fullFolio = `${fac.serie || ''}${fac.folio || ''}`.toLowerCase()
        if (!fullFolio.includes(folioFiltro.toLowerCase())) return
      }

      const complements = Array.isArray(fac.complementosPago) ? fac.complementosPago : []
      complements.forEach(comp => {
        list.push({
          ...comp,
          facturaId: fac.id,
          facturaUuid: fac.uuid,
          facturaFolio: `${fac.serie || ''}${fac.folio || ''}` || fac.id.substring(0, 8),
          cliente: fac.cliente,
          empresa: fac.empresa
        })
      })
    })
    // Ordenar de más reciente a más antiguo
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [ppdFacturas, empresaFiltro, clienteFiltro, folioFiltro])

  // Abre el modal para emitir un complemento
  const openEmitModal = (factura) => {
    const comps = Array.isArray(factura.complementosPago) ? factura.complementosPago : []
    const paid = comps.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0)
    const bal = Math.max(0, factura.total - paid)

    setSelectedFactura(factura)
    setMonto(bal.toFixed(2))
    setFormaPago('03')
    setFechaPago('')
    setMoneda('MXN')
    setTipoCambio(1)
    setNumOperacion('')
    setModalOpen(true)
  }

  const handleEmitComplement = async () => {
    if (!monto || parseFloat(monto) <= 0) {
      alert("Por favor, ingrese un monto válido superior a 0.")
      return
    }
    setLoading(true)
    try {
      const res = await emitirComplementoPago(
        selectedFactura.id,
        parseFloat(monto),
        formaPago,
        fechaPago,
        moneda,
        parseFloat(tipoCambio),
        numOperacion
      )
      if (!res.success) throw new Error(res.error)
      alert("Complemento de Pago (REP) emitido y timbrado exitosamente.")
      setModalOpen(false)
      router.refresh()
    } catch (err) {
      alert("Error al timbrar complemento: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelComplement = async (facturaId, receiptId, motivo) => {
    const res = await cancelarComplementoPago(facturaId, receiptId, motivo)
    if (!res.success) throw new Error(res.error)
    alert("Complemento de Pago cancelado exitosamente.")
    router.refresh()
  }

  const openDownload = (facturaUuid, compId, type) => {
    if (!facturaUuid || !compId) return alert("Parámetros de descarga inválidos.")
    window.open(`/api/facturas/${facturaUuid}/download-pago?pagoId=${compId}&type=${type}`, '_blank')
  }

  return (
    <div>
      {/* Panel de Filtros */}
      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Buscar Folio</label>
          <input 
            type="text" 
            placeholder="Ej. F1 o 5001" 
            className="input" 
            value={folioFiltro} 
            onChange={e => setFolioFiltro(e.target.value)} 
            style={{ maxWidth: '180px' }} 
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Empresa Emisora</label>
          <select className="input" value={empresaFiltro} onChange={e => setEmpresaFiltro(e.target.value)} style={{ minWidth: '220px' }}>
            <option value="">Todas las Empresas</option>
            {empresas.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.razonSocial}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Cliente Receptor</label>
          <select className="input" value={clienteFiltro} onChange={e => setClienteFiltro(e.target.value)} style={{ minWidth: '220px' }}>
            <option value="">Todos los Clientes</option>
            {clientes.map(cli => (
              <option key={cli.id} value={cli.id}>{cli.razonSocial}</option>
            ))}
          </select>
        </div>
        <button 
          className="btn" 
          style={{ background: 'rgba(255,255,255,0.1)' }}
          onClick={() => {
            setEmpresaFiltro('')
            setClienteFiltro('')
            setFolioFiltro('')
          }}
        >
          Limpiar Filtros
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => setActiveTab('ppd')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: 'none',
            color: activeTab === 'ppd' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'ppd' ? '2px solid var(--primary)' : 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem'
          }}
        >
          Facturas PPD por Cobrar
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: 'none',
            color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'history' ? '2px solid var(--primary)' : 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem'
          }}
        >
          Historial de Complementos Emitidos
        </button>
      </div>

      {/* Tab: Facturas PPD */}
      {activeTab === 'ppd' && (
        <div className="glass-panel">
          <table className="table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--primary)' }}>
                <th>Folio / Serie</th>
                <th>Emisor</th>
                <th>Cliente Receptor</th>
                <th>Total Factura</th>
                <th>Total Cobrado</th>
                <th>Saldo Restante</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredFacturas.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No se encontraron facturas PPD vigentes con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredFacturas.map(fac => {
                  const comps = Array.isArray(fac.complementosPago) ? fac.complementosPago : []
                  const paid = comps.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0)
                  const balance = Math.max(0, fac.total - paid)
                  const isFullyPaid = balance <= 0.01

                  return (
                    <tr key={fac.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem 0' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '1rem' }}>
                          {fac.serie || ''}{fac.folio || 'Sin Folio'}
                        </div>
                        <small style={{ fontFamily: 'monospace', opacity: 0.5 }}>{fac.uuid?.substring(0, 18)}...</small>
                      </td>
                      <td>{fac.empresa.razonSocial}</td>
                      <td>
                        <div style={{ fontWeight: 'bold' }}>{fac.cliente.razonSocial}</div>
                        <small style={{ color: 'var(--text-secondary)' }}>{fac.cliente.rfc}</small>
                      </td>
                      <td style={{ fontWeight: 'bold' }}>
                        ${fac.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ color: 'lightgreen' }}>
                        ${paid.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ color: isFullyPaid ? 'var(--text-secondary)' : 'yellow', fontWeight: 'bold' }}>
                        {isFullyPaid ? 'Pagada (100%)' : `$${balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </td>
                      <td>
                        {isFullyPaid ? (
                          <span style={{ fontSize: '0.85rem', color: 'gray' }}>Liquidada</span>
                        ) : (
                          <button 
                            className="btn" 
                            style={{ padding: '4px 8px', fontSize: '0.8rem', background: '#0e7490' }}
                            onClick={() => openEmitModal(fac)}
                          >
                            💳 Registrar Pago (REP)
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Historial */}
      {activeTab === 'history' && (
        <div className="glass-panel">
          <table className="table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--primary)' }}>
                <th>Factura Origen</th>
                <th>Cliente Receptor</th>
                <th>ID / UUID Complemento</th>
                <th>Fecha de Pago</th>
                <th>Monto Abonado</th>
                <th>Descargas</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {complementsHistory.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No hay complementos de pago registrados en el historial aún.
                  </td>
                </tr>
              ) : (
                complementsHistory.map(comp => (
                  <tr key={comp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem 0' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{comp.facturaFolio}</div>
                      <small style={{ opacity: 0.5 }}>{comp.empresa.razonSocial}</small>
                    </td>
                    <td>
                      <div style={{ fontWeight: 'bold' }}>{comp.cliente.razonSocial}</div>
                      <small style={{ color: 'var(--text-secondary)' }}>{comp.cliente.rfc}</small>
                    </td>
                    <td>
                      <div style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.85rem' }}>{comp.uuid || 'En Proceso (Test)'}</div>
                      <small style={{ opacity: 0.5 }}>ID: {comp.id}</small>
                    </td>
                    <td>{new Date(comp.date).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 'bold', color: 'lightgreen' }}>
                      ${comp.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '0.75rem' }} onClick={() => openDownload(comp.facturaUuid, comp.id, 'pdf')}>PDF</button>
                        <button className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '0.75rem' }} onClick={() => openDownload(comp.facturaUuid, comp.id, 'xml')}>XML</button>
                      </div>
                    </td>
                    <td>
                      <BotonCancelarComplemento 
                        facturaId={comp.facturaId} 
                        receiptId={comp.id} 
                        onCancel={handleCancelComplement} 
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para emitir pago */}
      {modalOpen && selectedFactura && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="glass-panel card" style={{ width: '450px', background: '#111', padding: '1.5rem', borderRadius: '12px' }}>
            <h3 style={{ marginBottom: '0.5rem', color: '#0e7490' }}>Emitir Complemento REP</h3>
            <p style={{ fontSize: '0.85rem', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
              Generando Recibo de Pago adjunto a la factura: <strong>{selectedFactura.serie || ''}{selectedFactura.folio || ''}</strong>
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>Forma de Pago</label>
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
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>Monto de Pago (MXN)</label>
              <input 
                type="number" 
                step="0.01" 
                className="input" 
                value={monto} 
                onChange={(e) => setMonto(e.target.value)} 
              />
              <small style={{ color: 'var(--text-secondary)' }}>
                Total original: ${selectedFactura.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </small>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>Moneda</label>
                <select className="input" value={moneda} onChange={(e) => setMoneda(e.target.value)}>
                  <option value="MXN">MXN - Peso Mexicano</option>
                  <option value="USD">USD - Dólar</option>
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
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>Nº de Operación (Opcional)</label>
              <input 
                type="text" 
                className="input" 
                placeholder="Ej. SPEI-987654" 
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
              <small style={{ color: 'var(--text-secondary)' }}>Vacio para usar la fecha y hora del servidor.</small>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button 
                className="btn" 
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }} 
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn" 
                style={{ background: '#0e7490' }} 
                disabled={loading} 
                onClick={handleEmitComplement}
              >
                {loading ? 'Timbrando...' : 'Timbrar Pago REP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
