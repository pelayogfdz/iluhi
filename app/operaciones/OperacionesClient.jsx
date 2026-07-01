'use client'

import { useState } from 'react';
import { crearOperacion, validarCepManual } from './acciones';

const BANCOS_SAT = {
  '2001': 'BANXICO',
  '37006': 'BANCOMEXT',
  '37009': 'BANOBRAS',
  '37019': 'BANJERCITO',
  '37135': 'NAFIN',
  '37166': 'BaBien',
  '37168': 'HIPOTECARIA FED',
  '40002': 'BANAMEX',
  '40012': 'BBVA MEXICO',
  '40014': 'SANTANDER',
  '40021': 'HSBC',
  '40030': 'BAJIO',
  '40036': 'INBURSA',
  '40042': 'MIFEL',
  '40044': 'SCOTIABANK',
  '40058': 'BANREGIO',
  '40059': 'INVEX',
  '40060': 'BANSI',
  '40062': 'AFIRME',
  '40072': 'BANORTE',
  '40106': 'BANK OF AMERICA',
  '40108': 'MUFG',
  '40110': 'JP MORGAN',
  '40112': 'BMONEX',
  '40113': 'VE POR MAS',
  '40124': 'CITI MEXICO',
  '40127': 'AZTECA',
  '40128': 'AUTOFIN',
  '40129': 'BARCLAYS',
  '40130': 'COMPARTAMOS',
  '40132': 'MULTIVA BANCO',
  '40133': 'ACTINVER',
  '40136': 'INTERCAM BANCO',
  '40137': 'BANCOPPEL',
  '40138': 'UALA',
  '40140': 'CONSUBANCO',
  '40141': 'VOLKSWAGEN',
  '40143': 'CIBANCO',
  '40145': 'BBASE',
  '40147': 'BANKAOOL',
  '40148': 'PAGATODO',
  '40150': 'INMOBILIARIO',
  '40151': 'DONDE',
  '40152': 'BANCREA',
  '40154': 'BANCO COVALTO',
  '40155': 'ICBC',
  '40156': 'SABADELL',
  '40157': 'SHINHAN',
  '40158': 'MIZUHO BANK',
  '40159': 'BANK OF CHINA',
  '40160': 'BANCO S3',
  '40167': 'HEY BANCO',
  '90600': 'MONEXCB',
  '90601': 'GBM',
  '90602': 'MASARI',
  '90605': 'VALUE',
  '90608': 'VECTOR',
  '90616': 'FINAMEX',
  '90617': 'VALMEX',
  '90620': 'PROFUTURO',
  '90630': 'CB INTERCAM',
  '90631': 'CI BOLSA',
  '90634': 'FINCOMUN',
  '90638': 'NU MEXICO',
  '90646': 'STP',
  '90652': 'CREDICAPITAL',
  '90653': 'KUSPIT',
  '90656': 'UNAGRA',
  '90659': 'ASP INTEGRA OPC',
  '90661': 'KLAR',
  '90670': 'LIBERTAD',
  '90677': 'CAJA POP MEXICA',
  '90680': 'CRISTOBAL COLON',
  '90683': 'CAJA TELEFONIST',
  '90684': 'TRANSFER',
  '90685': 'FONDO (FIRA)',
  '90688': 'CREDICLUB',
  '90699': 'FONDEADORA',
  '90703': 'TESORED',
  '90706': 'ARCUS FI',
  '90710': 'NVIO',
  '90715': 'CASHI CUENTA',
  '90720': 'MexPago',
  '90721': 'albo',
  '90722': 'Mercado Pago W',
  '90723': 'Cuenca',
  '90728': 'SPIN BY OXXO',
  '90729': 'Dep y Pag Dig',
  '90732': 'Peibo',
  '90734': 'FINCO PAY',
  '90901': 'CLS',
  '90902': 'INDEVAL',
  '90903': 'CoDi Valida'
};

export default function OperacionesClient({ user, operacionesIniciales }) {
  const [operaciones, setOperaciones] = useState(operacionesIniciales);
  const [showForm, setShowForm] = useState(false);
  const [selectedOperacion, setSelectedOperacion] = useState(null);
  
  // Form state
  const [tipoMovimiento, setTipoMovimiento] = useState('Ingreso');
  const [requiereDispersion, setRequiereDispersion] = useState(false);
  const [fechaOperacion, setFechaOperacion] = useState('');
  const [claveRastreo, setClaveRastreo] = useState('');
  const [bancoEmisor, setBancoEmisor] = useState('');
  const [bancoReceptor, setBancoReceptor] = useState('');
  const [cuentaBeneficiario, setCuentaBeneficiario] = useState('');
  const [monto, setMonto] = useState('');
  
  const [parsingReceipt, setParsingReceipt] = useState(false);
  const [parsingMsg, setParsingMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verifyingCepId, setVerifyingCepId] = useState(null);

  const handleParseReceipt = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setParsingReceipt(true);
    setParsingMsg('Analizando comprobante...');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('/api/parse-receipt', {
        method: 'POST',
        body: formData
      });
      const resJson = await res.json();
      
      if (resJson.success && resJson.data) {
        const d = resJson.data;
        if (d.fecha) setFechaOperacion(d.fecha);
        if (d.claveRastreo) setClaveRastreo(d.claveRastreo);
        if (d.monto) setMonto(d.monto.toString());
        if (d.cuentaBeneficiario) setCuentaBeneficiario(d.cuentaBeneficiario);
        if (d.bancoEmisor) setBancoEmisor(d.bancoEmisor);
        if (d.bancoReceptor) setBancoReceptor(d.bancoReceptor);
        setParsingMsg('¡Datos extraídos! Favor de revisarlos.');
      } else {
        setParsingMsg('No se pudieron extraer datos del archivo. Ingréselos manualmente.');
      }
    } catch (err) {
      setParsingMsg('Error leyendo archivo. Ingréselos manualmente.');
    } finally {
      setParsingReceipt(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    const form = e.target;
    const formData = new FormData(form);
    formData.set('requiereDispersion', requiereDispersion.toString());
    
    try {
      const res = await crearOperacion(formData);
      if (res.success) {
        setOperaciones([res.operacion, ...operaciones]);
        setShowForm(false);
        form.reset();
        setFechaOperacion('');
        setClaveRastreo('');
        setMonto('');
        setCuentaBeneficiario('');
        setBancoEmisor('');
        setBancoReceptor('');
        setRequiereDispersion(false);
        setParsingMsg('');
      } else {
        alert(res.error || 'Error al guardar la operación');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecheckCep = async (oper) => {
    setVerifyingCepId(oper.id);
    try {
      const res = await validarCepManual(oper.id, {
        fechaOperacion: oper.fechaOperacion,
        claveRastreo: oper.claveRastreo,
        bancoEmisor: oper.bancoEmisor,
        bancoReceptor: oper.bancoReceptor,
        cuentaBeneficiario: oper.cuentaBeneficiario,
        monto: oper.monto
      });
      if (res.success) {
        // Update local state
        const updated = operaciones.map(o => o.id === oper.id ? res.operacion : o);
        setOperaciones(updated);
        if (selectedOperacion && selectedOperacion.id === oper.id) {
          setSelectedOperacion(res.operacion);
        }
      } else {
        alert(res.error || 'No se pudo verificar el CEP en Banxico');
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setVerifyingCepId(null);
    }
  };

  const downloadBase64File = (base64, filename, contentType) => {
    if (!base64) return;
    const linkSource = `data:${contentType};base64,${base64}`;
    const downloadLink = document.createElement("a");
    downloadLink.href = linkSource;
    downloadLink.download = filename;
    downloadLink.click();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Confirmado CEP':
        return <span className="badge badge-success">✓ CEP Validado</span>;
      case 'Pendiente':
        return <span className="badge badge-warning">🕒 Pendiente</span>;
      case 'CEP No Encontrado':
        return <span className="badge badge-danger">✗ No Encontrado</span>;
      case 'Límite Consultas CEP':
        return <span className="badge badge-danger">⚠️ Límite Banxico</span>;
      default:
        return <span className="badge badge-danger">{status || 'Error'}</span>;
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '800' }}>Panel de Operaciones</h1>
          <p style={{ color: '#94a3b8', margin: '0.5rem 0 0 0' }}>Gestión de flujos de pago, validación SPEI (CEP) y dispersión por lotes.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Volver al Listado' : '⚡ Nueva Operación'}
        </button>
      </div>

      {showForm ? (
        <div className="card" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '1.5rem', fontWeight: 'bold' }}>Crear Nueva Operación</h2>
          
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1' }}>1. Subir Comprobante de Pago (Opcional - Extrae datos)</label>
                <input 
                  type="file" 
                  accept=".pdf" 
                  onChange={handleParseReceipt}
                  className="form-control"
                  style={{ width: '100%', padding: '0.6rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                />
                {parsingReceipt && <p style={{ color: 'var(--accent)', fontSize: '0.85rem', marginTop: '0.5rem' }}>{parsingMsg}</p>}
                {!parsingReceipt && parsingMsg && <p style={{ color: '#facc15', fontSize: '0.85rem', marginTop: '0.5rem' }}>{parsingMsg}</p>}
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1' }}>Tipo de Movimiento</label>
                <select 
                  name="tipoMovimiento"
                  value={tipoMovimiento}
                  onChange={(e) => setTipoMovimiento(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', padding: '0.7rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                >
                  <option value="Ingreso">Ingreso (Pago Recibido)</option>
                  <option value="Egreso">Egreso (Pago Enviado)</option>
                  <option value="Dispersión">Dispersión de Fondos</option>
                </select>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #334155', padding: '1.5rem 0' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#94a3b8' }}>Datos del CEP para Validación Automática</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.2rem', marginBottom: '1.2rem' }}>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', color: '#cbd5e1', fontSize: '0.9rem' }}>Clave de Rastreo</label>
                  <input 
                    type="text" 
                    name="claveRastreo" 
                    value={claveRastreo}
                    onChange={(e) => setClaveRastreo(e.target.value)}
                    placeholder="Ej. BBVA123456789"
                    className="form-control"
                    style={{ width: '100%', padding: '0.7rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', color: '#cbd5e1', fontSize: '0.9rem' }}>Fecha de Operación</label>
                  <input 
                    type="text" 
                    name="fechaOperacion" 
                    value={fechaOperacion}
                    onChange={(e) => setFechaOperacion(e.target.value)}
                    placeholder="DD-MM-YYYY"
                    className="form-control"
                    style={{ width: '100%', padding: '0.7rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', color: '#cbd5e1', fontSize: '0.9rem' }}>Monto ($)</label>
                  <input 
                    type="text" 
                    name="monto" 
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="Ej. 77963.78"
                    className="form-control"
                    style={{ width: '100%', padding: '0.7rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.2rem', marginBottom: '1.2rem' }}>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', color: '#cbd5e1', fontSize: '0.9rem' }}>Banco Emisor</label>
                  <select 
                    name="bancoEmisor"
                    value={bancoEmisor}
                    onChange={(e) => setBancoEmisor(e.target.value)}
                    className="form-control"
                    style={{ width: '100%', padding: '0.7rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                  >
                    <option value="">Seleccione Banco Emisor</option>
                    {Object.entries(BANCOS_SAT).map(([code, name]) => (
                      <option key={code} value={code}>{code} - {name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', color: '#cbd5e1', fontSize: '0.9rem' }}>Banco Receptor</label>
                  <select 
                    name="bancoReceptor"
                    value={bancoReceptor}
                    onChange={(e) => setBancoReceptor(e.target.value)}
                    className="form-control"
                    style={{ width: '100%', padding: '0.7rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                  >
                    <option value="">Seleccione Banco Receptor</option>
                    {Object.entries(BANCOS_SAT).map(([code, name]) => (
                      <option key={code} value={code}>{code} - {name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', color: '#cbd5e1', fontSize: '0.9rem' }}>Cuenta CLABE Beneficiario</label>
                  <input 
                    type="text" 
                    name="cuentaBeneficiario" 
                    value={cuentaBeneficiario}
                    onChange={(e) => setCuentaBeneficiario(e.target.value)}
                    placeholder="18 dígitos"
                    className="form-control"
                    maxLength={18}
                    style={{ width: '100%', padding: '0.7rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #334155', padding: '1.5rem 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '1rem', color: '#fff', fontSize: '1rem' }}>
                <input 
                  type="checkbox"
                  checked={requiereDispersion}
                  onChange={(e) => setRequiereDispersion(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                Esta operación requiere dispersión de fondos
              </label>

              {requiereDispersion && (
                <div style={{ maxWidth: '600px', background: '#0f172a', padding: '1.2rem', borderRadius: '8px', border: '1px dashed #334155' }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1' }}>Subir Plantilla de Dispersión (Excel)</label>
                  <input 
                    type="file" 
                    name="excelDispersion" 
                    accept=".xlsx, .xls"
                    className="form-control"
                    style={{ color: '#fff' }}
                  />
                  <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.4rem', marginBlockEnd: 0 }}>
                    Debe contener columnas: <strong>Nombre / Beneficiario</strong>, <strong>Cuenta / CLABE</strong>, y <strong>Monto / Importe</strong>.
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Procesando y Consultando CEP...' : 'Guardar y Validar'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2.5rem' }}>
          {/* Operations List */}
          <div className="card" style={{ padding: '1.5rem', background: '#1e293b', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.2rem', fontWeight: 'bold' }}>Operaciones Registradas</h2>
            
            {operaciones.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                <span style={{ fontSize: '2.5rem' }}>📂</span>
                <p style={{ marginTop: '1rem', fontSize: '1.05rem' }}>No hay operaciones registradas aún.</p>
              </div>
            ) : (
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '0.75rem' }}>Fecha</th>
                    <th style={{ padding: '0.75rem' }}>Tipo</th>
                    <th style={{ padding: '0.75rem' }}>Monto</th>
                    <th style={{ padding: '0.75rem' }}>Dispersión</th>
                    <th style={{ padding: '0.75rem' }}>Estado CEP</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {operaciones.map(op => (
                    <tr key={op.id} style={{ borderBottom: '1px solid #334155', cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => setSelectedOperacion(op)}>
                      <td style={{ padding: '0.9rem 0.75rem' }}>{new Date(op.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '0.9rem 0.75rem' }}>
                        <span style={{ fontWeight: '600', color: op.tipoMovimiento === 'Ingreso' ? 'var(--accent)' : op.tipoMovimiento === 'Egreso' ? '#38bdf8' : '#e2e8f0' }}>
                          {op.tipoMovimiento}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 0.75rem', fontWeight: '600' }}>
                        {op.monto > 0 ? `$${op.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 'N/A'}
                      </td>
                      <td style={{ padding: '0.9rem 0.75rem' }}>
                        {op.requiereDispersion ? (
                          <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>✓ Sí ({op.dispersionDetalles ? op.dispersionDetalles.length : 0})</span>
                        ) : 'No'}
                      </td>
                      <td style={{ padding: '0.9rem 0.75rem' }}>
                        {getStatusBadge(op.estatus)}
                      </td>
                      <td style={{ padding: '0.9rem 0.75rem', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-secondary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }} onClick={() => setSelectedOperacion(op)}>
                          Ver Detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Details Sidebar / Panel */}
          <div>
            {selectedOperacion ? (
              <div className="card" style={{ padding: '1.5rem', background: '#1e293b', border: '1px solid #334155', position: 'sticky', top: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', borderBottom: '1px solid #334155', paddingBottom: '0.8rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Detalles de Operación</h2>
                  <button style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => setSelectedOperacion(null)}>
                    ✖
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.95rem' }}>
                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.85rem' }}>Estatus</span>
                    <div style={{ marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      {getStatusBadge(selectedOperacion.estatus)}
                      
                      {selectedOperacion.estatus !== 'Confirmado CEP' && (
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} 
                          disabled={verifyingCepId === selectedOperacion.id}
                          onClick={() => handleRecheckCep(selectedOperacion)}
                        >
                          {verifyingCepId === selectedOperacion.id ? 'Consultando...' : '🔄 Reintentar CEP'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.85rem' }}>Tipo de Movimiento</span>
                    <strong style={{ fontSize: '1.05rem' }}>{selectedOperacion.tipoMovimiento}</strong>
                  </div>

                  {selectedOperacion.claveRastreo && (
                    <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '6px', border: '1px solid #334155' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#cbd5e1' }}>Datos de Transferencia (SPEI)</h4>
                      <p style={{ margin: '0.3rem 0', fontSize: '0.85rem' }}><span style={{ color: '#94a3b8' }}>Clave Rastreo:</span> {selectedOperacion.claveRastreo}</p>
                      <p style={{ margin: '0.3rem 0', fontSize: '0.85rem' }}><span style={{ color: '#94a3b8' }}>Fecha Operación:</span> {selectedOperacion.fechaOperacion}</p>
                      <p style={{ margin: '0.3rem 0', fontSize: '0.85rem' }}><span style={{ color: '#94a3b8' }}>Monto:</span> ${selectedOperacion.monto?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                      <p style={{ margin: '0.3rem 0', fontSize: '0.85rem' }}><span style={{ color: '#94a3b8' }}>Banco Emisor:</span> {BANCOS_SAT[selectedOperacion.bancoEmisor] || selectedOperacion.bancoEmisor}</p>
                      <p style={{ margin: '0.3rem 0', fontSize: '0.85rem' }}><span style={{ color: '#94a3b8' }}>Banco Receptor:</span> {BANCOS_SAT[selectedOperacion.bancoReceptor] || selectedOperacion.bancoReceptor}</p>
                      <p style={{ margin: '0.3rem 0', fontSize: '0.85rem' }}><span style={{ color: '#94a3b8' }}>CLABE Beneficiario:</span> {selectedOperacion.cuentaBeneficiario}</p>
                    </div>
                  )}

                  {selectedOperacion.estatus === 'Confirmado CEP' && selectedOperacion.cepPdfBase64 && (
                    <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                        onClick={() => downloadBase64File(selectedOperacion.cepPdfBase64, `CEP_${selectedOperacion.claveRastreo}.pdf`, 'application/pdf')}
                      >
                        📄 Descargar CEP (PDF)
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                        onClick={() => downloadBase64File(selectedOperacion.cepXmlBase64, `CEP_${selectedOperacion.claveRastreo}.xml`, 'application/xml')}
                      >
                        🗎 Descargar CEP (XML)
                      </button>
                    </div>
                  )}

                  {selectedOperacion.requiereDispersion && (
                    <div style={{ marginTop: '0.5rem', borderTop: '1px solid #334155', paddingTop: '1rem' }}>
                      <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Dispersion de Fondos</span>
                      
                      {selectedOperacion.excelBase64 && (
                        <button 
                          className="btn btn-secondary" 
                          style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', marginBottom: '1rem' }}
                          onClick={() => downloadBase64File(selectedOperacion.excelBase64, selectedOperacion.excelNombre || 'plantilla_dispersion.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
                        >
                          📥 Descargar Excel Original
                        </button>
                      )}

                      {selectedOperacion.dispersionDetalles && selectedOperacion.dispersionDetalles.length > 0 ? (
                        <div>
                          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #334155', borderRadius: '4px', background: '#0f172a' }}>
                            <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ background: '#1e293b', textAlign: 'left', color: '#cbd5e1' }}>
                                  <th style={{ padding: '0.4rem' }}>Beneficiario</th>
                                  <th style={{ padding: '0.4rem' }}>CLABE</th>
                                  <th style={{ padding: '0.4rem', textAlign: 'right' }}>Monto</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedOperacion.dispersionDetalles.map((det, idx) => (
                                  <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                                    <td style={{ padding: '0.4rem', color: '#94a3b8' }}>{det.nombre}</td>
                                    <td style={{ padding: '0.4rem', color: '#94a3b8' }}>{det.cuenta}</td>
                                    <td style={{ padding: '0.4rem', textAlign: 'right', fontWeight: 'bold' }}>
                                      ${det.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.8rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
                            <span>Total Dispersado:</span>
                            <span style={{ color: 'var(--accent)' }}>
                              ${selectedOperacion.dispersionDetalles.reduce((acc, curr) => acc + curr.monto, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: 0 }}>
                          No se pudieron leer registros válidos de dispersión en el Excel.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', border: '1px dashed #334155' }}>
                <p>Selecciona una operación de la lista para ver su detalle, descargar los CEP oficiales de Banxico o consultar su desglose de dispersión.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
