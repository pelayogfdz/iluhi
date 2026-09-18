'use client'

import { useState, useMemo } from 'react';
import { 
  crearOperacion, 
  validarCepManual, 
  obtenerFacturasDisponibles, 
  analizarExcelDispersion, 
  actualizarExcelOperacion, 
  exportarExcelDispersion 
} from './acciones';

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

export default function OperacionesClient({ user, operacionesIniciales = [] }) {
  const [operaciones, setOperaciones] = useState(operacionesIniciales);
  const [showForm, setShowForm] = useState(false);
  const [selectedOperacion, setSelectedOperacion] = useState(null);
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [copiedId, setCopiedId] = useState(null);

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
  const [showManualFields, setShowManualFields] = useState(false);

  // Excel & Invoices
  const [facturasDisponibles, setFacturasDisponibles] = useState([]);
  const [facturasAsignadas, setFacturasAsignadas] = useState([]);
  const [dispersionMetodo, setDispersionMetodo] = useState('excel');
  const [manualRows, setManualRows] = useState([
    { id: Date.now(), nombre: '', banco: '', cuenta: '', monto: '', sindicato: '', efectivo: '' }
  ]);
  const [isAnalyzingExcel, setIsAnalyzingExcel] = useState(false);
  const [excelMetadata, setExcelMetadata] = useState(null);

  // Computed KPI Metrics
  const stats = useMemo(() => {
    const total = operaciones.length;
    const totalMonto = operaciones.reduce((acc, o) => acc + (o.monto || 0), 0);
    const cepValidados = operaciones.filter(o => o.estatus === 'Confirmado CEP').length;
    const pendientes = operaciones.filter(o => o.estatus === 'Pendiente').length;
    const conDispersion = operaciones.filter(o => o.requiereDispersion).length;
    return { total, totalMonto, cepValidados, pendientes, conDispersion };
  }, [operaciones]);

  // Filtered operations list
  const filteredOperaciones = useMemo(() => {
    return operaciones.filter(op => {
      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchClave = op.claveRastreo?.toLowerCase().includes(query);
        const matchMonto = op.monto?.toString().includes(query);
        const matchBancoE = BANCOS_SAT[op.bancoEmisor]?.toLowerCase().includes(query);
        const matchBancoR = BANCOS_SAT[op.bancoReceptor]?.toLowerCase().includes(query);
        const matchFactura = op.facturas?.some(f => `${f.serie}-${f.folio}`.toLowerCase().includes(query));
        const matchDispersion = op.dispersionDetalles?.some(d => d.nombre?.toLowerCase().includes(query) || d.cuenta?.includes(query));
        if (!matchClave && !matchMonto && !matchBancoE && !matchBancoR && !matchFactura && !matchDispersion) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'todos') {
        if (statusFilter === 'dispersion') {
          if (!op.requiereDispersion) return false;
        } else if (op.estatus !== statusFilter) {
          return false;
        }
      }

      // Tipo filter
      if (tipoFilter !== 'todos' && op.tipoMovimiento !== tipoFilter) {
        return false;
      }

      return true;
    });
  }, [operaciones, searchTerm, statusFilter, tipoFilter]);

  const handleCopy = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenForm = async () => {
    if (showForm) {
      setShowForm(false);
    } else {
      setShowForm(true);
      setFechaOperacion('');
      setClaveRastreo('');
      setMonto('');
      setCuentaBeneficiario('');
      setBancoEmisor('');
      setBancoReceptor('');
      setRequiereDispersion(false);
      setParsingMsg('');
      setShowManualFields(false);
      setFacturasAsignadas([]);
      setExcelMetadata(null);
      setManualRows([{ id: Date.now(), nombre: '', banco: '', cuenta: '', monto: '', sindicato: '', efectivo: '' }]);
      
      try {
        const res = await obtenerFacturasDisponibles();
        if (res.success) {
          setFacturasDisponibles(res.facturas);
        }
      } catch (e) {
        console.error("Error loading available invoices:", e);
      }
    }
  };

  const handleAddManualRow = () => {
    setManualRows([
      ...manualRows,
      { id: Date.now() + manualRows.length, nombre: '', banco: '', cuenta: '', monto: '', sindicato: '', efectivo: '' }
    ]);
  };

  const handleUpdateManualRow = (id, key, val) => {
    const updated = manualRows.map(r => {
      if (r.id === id) return { ...r, [key]: val };
      return r;
    });
    setManualRows(updated);
  };

  const handleDeleteManualRow = (id) => {
    if (manualRows.length === 1) {
      setManualRows([{ id: Date.now(), nombre: '', banco: '', cuenta: '', monto: '', sindicato: '', efectivo: '' }]);
    } else {
      setManualRows(manualRows.filter(r => r.id !== id));
    }
  };

  const calculateRowTotals = (row) => {
    const m = parseFloat(row.monto) || 0;
    const s = parseFloat(row.sindicato) || 0;
    const e = parseFloat(row.efectivo) || 0;
    const base = m || (s + e);
    const comision = base * 0.04;
    const subtotal = base + comision;
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    return { base, comision, subtotal, iva, total };
  };

  const getManualTableTotals = () => {
    let tBase = 0, tCom = 0, tSub = 0, tIva = 0, tTotal = 0, tSind = 0, tEfec = 0;
    manualRows.forEach(r => {
      const { base, comision, subtotal, iva, total } = calculateRowTotals(r);
      tBase += base;
      tCom += comision;
      tSub += subtotal;
      tIva += iva;
      tTotal += total;
      tSind += parseFloat(r.sindicato) || 0;
      tEfec += parseFloat(r.efectivo) || 0;
    });
    return { tBase, tCom, tSub, tIva, tTotal, tSind, tEfec };
  };

  const handleInvoiceCheck = (id, checked) => {
    let updated;
    if (checked) {
      updated = [...facturasAsignadas, id];
    } else {
      updated = facturasAsignadas.filter(fid => fid !== id);
    }
    setFacturasAsignadas(updated);

    if (updated.length > 0) {
      const sum = facturasDisponibles
        .filter(f => updated.includes(f.id))
        .reduce((acc, curr) => acc + curr.total, 0);
      setMonto(sum.toString());
      
      const firstInvoice = facturasDisponibles.find(f => f.id === updated[0]);
      if (firstInvoice && !claveRastreo) {
        setClaveRastreo(`FAC-${firstInvoice.serie || ''}${firstInvoice.folio || ''}`);
      }
    }
  };

  const handleExcelPreview = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsAnalyzingExcel(true);
    const formData = new FormData();
    formData.append('excelDispersion', file);

    try {
      const res = await analizarExcelDispersion(formData);
      if (res.success) {
        if (res.metadata) {
          setExcelMetadata(res.metadata);
          if (res.metadata.banco) {
            const code = Object.keys(BANCOS_SAT).find(k => BANCOS_SAT[k].toLowerCase() === res.metadata.banco.toLowerCase());
            if (code) setBancoEmisor(code);
          }
          if (res.metadata.fechaPago) {
            setFechaOperacion(res.metadata.fechaPago);
          }
          if (res.metadata.facturaReferencia) {
            setClaveRastreo(res.metadata.facturaReferencia);
          }
        }
        
        if (res.dispersionDetalles && res.dispersionDetalles.length > 0) {
          const formatted = res.dispersionDetalles.map((d, index) => ({
            id: Date.now() + index,
            nombre: d.nombre,
            banco: d.banco || '',
            cuenta: d.cuenta,
            monto: d.monto || '',
            sindicato: d.sindicato || '',
            efectivo: d.efectivo || ''
          }));
          setManualRows(formatted);
          setDispersionMetodo('manual');
          alert('¡Excel leído! Se cargaron los datos en la tabla para tu revisión.');
        }
      } else {
        alert(res.error || 'Error al analizar el archivo de dispersión');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsAnalyzingExcel(false);
    }
  };

  const handleParseReceipt = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setParsingMsg('Comprobante de imagen detectado. Ingrese los detalles de pago manualmente.');
      setShowManualFields(true);
      return;
    }
    
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
        
        const hasAll = d.fecha && d.claveRastreo && d.monto && d.cuentaBeneficiario && d.bancoEmisor && d.bancoReceptor;
        if (hasAll) {
          setParsingMsg('¡Datos extraídos con éxito! Confirme los campos a continuación.');
        } else {
          setParsingMsg('⚠️ Algunos campos requeridos no pudieron ser detectados. Complete los campos vacíos manualmente.');
        }
        setShowManualFields(true);
      } else {
        setParsingMsg('No se pudieron extraer datos del archivo. Ingréselos manualmente.');
        setShowManualFields(true);
      }
    } catch (err) {
      setParsingMsg('Error leyendo archivo. Ingréselos manualmente.');
      setShowManualFields(true);
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
    formData.set('facturasAsignadas', JSON.stringify(facturasAsignadas));

    if (requiereDispersion) {
      if (dispersionMetodo === 'manual') {
        const serialized = manualRows.map(r => {
          const { base } = calculateRowTotals(r);
          return {
            nombre: r.nombre.trim(),
            cuenta: r.cuenta.trim(),
            banco: r.banco.trim(),
            monto: base
          };
        }).filter(r => r.nombre && r.cuenta && r.monto > 0);
        formData.set('manualDispersion', JSON.stringify(serialized));
      }
    }
    
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
        setShowManualFields(false);
        setFacturasAsignadas([]);
        setExcelMetadata(null);
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

  const handleExportExcelTemplate = async () => {
    if (!selectedOperacion) return;
    try {
      const res = await exportarExcelDispersion(selectedOperacion.id);
      if (res.success) {
        downloadBase64File(res.excelBase64, res.filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      } else {
        alert(res.error || 'Error al exportar plantilla');
      }
    } catch (e) {
      alert(e.message);
    }
  };

  const handleUpdateExcelFile = async (e) => {
    if (!selectedOperacion) return;
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('excelDispersion', file);

    try {
      const res = await actualizarExcelOperacion(selectedOperacion.id, formData);
      if (res.success) {
        const updated = operaciones.map(o => o.id === selectedOperacion.id ? res.operacion : o);
        setOperaciones(updated);
        setSelectedOperacion(res.operacion);
        alert('¡Dispersión actualizada con el Excel offline!');
      } else {
        alert(res.error || 'Error al actualizar el Excel');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Confirmado CEP':
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem', 
            padding: '0.3rem 0.75rem', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: '700', 
            background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' 
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d399' }} />
            CEP Confirmado
          </span>
        );
      case 'Pendiente':
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem', 
            padding: '0.3rem 0.75rem', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: '700', 
            background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' 
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 6px #fbbf24' }} />
            Pendiente Banxico
          </span>
        );
      case 'CEP No Encontrado':
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem', 
            padding: '0.3rem 0.75rem', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: '700', 
            background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' 
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f87171' }} />
            No Encontrado
          </span>
        );
      case 'Límite Consultas CEP':
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem', 
            padding: '0.3rem 0.75rem', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: '700', 
            background: 'rgba(217, 119, 6, 0.15)', color: '#f59e0b', border: '1px solid rgba(217, 119, 6, 0.3)' 
          }}>
            ⚠️ Límite Banxico
          </span>
        );
      default:
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem', 
            padding: '0.3rem 0.75rem', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: '700', 
            background: 'rgba(148, 163, 184, 0.15)', color: '#cbd5e1', border: '1px solid rgba(148, 163, 184, 0.3)' 
          }}>
            {status || 'Desconocido'}
          </span>
        );
    }
  };

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '1440px', margin: '0 auto', color: '#f8fafc' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '2.2rem' }}>⚡</span>
            <div>
              <h1 style={{ margin: 0, fontSize: '2.1rem', fontWeight: '800', letterSpacing: '-0.025em', background: 'linear-gradient(135deg, #fff 30%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Control de Operaciones y Flujo SPEI
              </h1>
              <p style={{ color: '#94a3b8', margin: '0.35rem 0 0 0', fontSize: '0.95rem' }}>
                Validación automatizada en Banco de México (CEP), asignación de facturas y dispersión por lotes.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={handleOpenForm}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.4rem', 
              borderRadius: '10px', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer',
              background: showForm ? '#334155' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: '#fff', border: 'none', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            {showForm ? '✖ Cerrar Formulario' : '➕ Nueva Operación'}
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        
        {/* Total Flujo */}
        <div style={{ background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '50%', filter: 'blur(15px)' }} />
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monto Total Procesado</span>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff', marginTop: '0.4rem' }}>
            ${stats.totalMonto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: '0.8rem', color: '#38bdf8', marginTop: '0.3rem', display: 'block' }}>
            {stats.total} operaciones registradas
          </span>
        </div>

        {/* CEP Validados */}
        <div style={{ background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '50%', filter: 'blur(15px)' }} />
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CEPs Validados (Banxico)</span>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#34d399', marginTop: '0.4rem' }}>
            {stats.cepValidados}
          </div>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.3rem', display: 'block' }}>
            {stats.total > 0 ? `${Math.round((stats.cepValidados / stats.total) * 100)}% de efectividad` : '0%'}
          </span>
        </div>

        {/* Pendientes */}
        <div style={{ background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', background: 'rgba(245, 158, 11, 0.15)', borderRadius: '50%', filter: 'blur(15px)' }} />
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pendientes de Validación</span>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fbbf24', marginTop: '0.4rem' }}>
            {stats.pendientes}
          </div>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.3rem', display: 'block' }}>
            Reintentos automáticos activos
          </span>
        </div>

        {/* Con Dispersión */}
        <div style={{ background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', background: 'rgba(168, 85, 247, 0.15)', borderRadius: '50%', filter: 'blur(15px)' }} />
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Con Dispersión por Lote</span>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#c084fc', marginTop: '0.4rem' }}>
            {stats.conDispersion}
          </div>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.3rem', display: 'block' }}>
            Plantillas Excel & desgloses
          </span>
        </div>
      </div>

      {/* Main Creation Form (Collapsible) */}
      {showForm && (
        <div style={{ 
          background: 'rgba(30, 41, 59, 0.95)', backdropFilter: 'blur(16px)', border: '1px solid rgba(59, 130, 246, 0.3)', 
          borderRadius: '16px', padding: '2rem', marginBottom: '2.5rem', boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, color: '#fff' }}>Registrar Nueva Operación Bancaria</h2>
              <p style={{ margin: '0.2rem 0 0 0', color: '#94a3b8', fontSize: '0.88rem' }}>Sube el comprobante de transferencia SPEI o captura los datos manualmente.</p>
            </div>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              
              {/* Movement type */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: '600' }}>Tipo de Movimiento</label>
                <select 
                  name="tipoMovimiento" 
                  value={tipoMovimiento}
                  onChange={(e) => setTipoMovimiento(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '0.9rem' }}
                >
                  <option value="Ingreso">🟢 Ingreso / Cobro de Cliente</option>
                  <option value="Egreso">🔵 Egreso / Dispersión o Pago</option>
                  <option value="Traspaso">⚪ Traspaso entre Cuentas</option>
                </select>
              </div>

              {/* Receipt upload OCR */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: '600' }}>Comprobante de Pago (PDF / Imagen)</label>
                <input 
                  type="file" 
                  name="comprobante" 
                  accept=".pdf, image/*"
                  onChange={handleParseReceipt}
                  style={{ width: '100%', padding: '0.65rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                />
                {parsingReceipt && <p style={{ color: '#38bdf8', fontSize: '0.8rem', marginTop: '0.3rem' }}>⏳ Leyendo datos del comprobante SPEI...</p>}
                {parsingMsg && <p style={{ color: parsingMsg.includes('⚠️') ? '#fbbf24' : '#34d399', fontSize: '0.8rem', marginTop: '0.3rem' }}>{parsingMsg}</p>}
              </div>
            </div>

            {/* SPEI Key Fields */}
            <div style={{ background: '#0f172a', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#38bdf8', fontWeight: '700' }}>Detalles de Transferencia SPEI</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#94a3b8' }}>Clave de Rastreo *</label>
                  <input 
                    type="text" 
                    name="claveRastreo" 
                    value={claveRastreo}
                    onChange={(e) => setClaveRastreo(e.target.value)}
                    placeholder="Ej. BBVA123456789"
                    required
                    style={{ width: '100%', padding: '0.65rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#94a3b8' }}>Fecha de Operación (DD-MM-YYYY) *</label>
                  <input 
                    type="text" 
                    name="fechaOperacion" 
                    value={fechaOperacion}
                    onChange={(e) => setFechaOperacion(e.target.value)}
                    placeholder="DD-MM-YYYY"
                    required
                    style={{ width: '100%', padding: '0.65rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#94a3b8' }}>Monto ($) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    name="monto" 
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="0.00"
                    required
                    style={{ width: '100%', padding: '0.65rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontWeight: 'bold' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#94a3b8' }}>Banco Emisor</label>
                  <select 
                    name="bancoEmisor"
                    value={bancoEmisor}
                    onChange={(e) => setBancoEmisor(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                  >
                    <option value="">Seleccione Banco Emisor</option>
                    {Object.entries(BANCOS_SAT).map(([code, name]) => (
                      <option key={code} value={code}>{code} - {name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#94a3b8' }}>Banco Receptor</label>
                  <select 
                    name="bancoReceptor"
                    value={bancoReceptor}
                    onChange={(e) => setBancoReceptor(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                  >
                    <option value="">Seleccione Banco Receptor</option>
                    {Object.entries(BANCOS_SAT).map(([code, name]) => (
                      <option key={code} value={code}>{code} - {name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#94a3b8' }}>CLABE Beneficiario (18 dígitos)</label>
                  <input 
                    type="text" 
                    name="cuentaBeneficiario" 
                    value={cuentaBeneficiario}
                    onChange={(e) => setCuentaBeneficiario(e.target.value)}
                    placeholder="18 dígitos"
                    maxLength={18}
                    style={{ width: '100%', padding: '0.65rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                  />
                </div>
              </div>
            </div>

            {/* Invoices Assignment */}
            {facturasDisponibles.length > 0 && (
              <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem 0', color: '#38bdf8', fontWeight: '700' }}>Asignar Facturas Emitidas (Hechas)</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0 0 0.8rem 0' }}>Selecciona facturas para ligarlas automáticamente al monto de esta operación.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', maxHeight: '160px', overflowY: 'auto' }}>
                  {facturasDisponibles.map(fac => (
                    <label key={fac.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem', background: '#1e293b', border: facturasAsignadas.includes(fac.id) ? '1px solid #3b82f6' : '1px solid #334155', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input 
                        type="checkbox" 
                        checked={facturasAsignadas.includes(fac.id)}
                        onChange={(e) => handleInvoiceCheck(fac.id, e.target.checked)}
                        style={{ width: '16px', height: '16px' }}
                      />
                      <div>
                        <strong style={{ display: 'block', color: '#fff' }}>Folio: {fac.serie || ''}-{fac.folio || ''}</strong>
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{fac.cliente?.razonSocial || 'Cliente General'} | <strong style={{ color: '#34d399' }}>${fac.total?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Dispersion Section */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', marginBottom: '1rem', color: '#fff', fontSize: '0.95rem', fontWeight: '600' }}>
                <input 
                  type="checkbox"
                  checked={requiereDispersion}
                  onChange={(e) => setRequiereDispersion(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                Esta operación incluye dispersión de fondos a terceros
              </label>

              {requiereDispersion && (
                <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '12px', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                    <button 
                      type="button" 
                      onClick={() => setDispersionMetodo('excel')}
                      style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', background: dispersionMetodo === 'excel' ? '#3b82f6' : '#1e293b', color: '#fff', border: 'none' }}
                    >
                      📁 Cargar Plantilla Excel
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setDispersionMetodo('manual')}
                      style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', background: dispersionMetodo === 'manual' ? '#3b82f6' : '#1e293b', color: '#fff', border: 'none' }}
                    >
                      ✍ Llenar Formato Manualmente
                    </button>
                  </div>

                  {dispersionMetodo === 'excel' && (
                    <div>
                      <input 
                        type="file" 
                        name="excelDispersion" 
                        accept=".xlsx, .xls"
                        onChange={handleExcelPreview}
                        style={{ width: '100%', padding: '0.6rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                      />
                      {isAnalyzingExcel && <p style={{ color: '#38bdf8', fontSize: '0.8rem', marginTop: '0.4rem' }}>Analizando plantilla Excel...</p>}
                    </div>
                  )}

                  {dispersionMetodo === 'manual' && (
                    <div style={{ overflowX: 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Desglose de beneficiarios (comisión 4% e IVA calculados automáticamente):</span>
                        <button type="button" onClick={handleAddManualRow} style={{ padding: '0.35rem 0.75rem', borderRadius: '4px', background: '#334155', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>
                          ➕ Agregar Fila
                        </button>
                      </div>

                      <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', textAlign: 'left', color: '#94a3b8' }}>
                            <th style={{ padding: '0.5rem' }}>Beneficiario</th>
                            <th style={{ padding: '0.5rem' }}>Banco</th>
                            <th style={{ padding: '0.5rem' }}>CLABE</th>
                            <th style={{ padding: '0.5rem' }}>Monto ($)</th>
                            <th style={{ padding: '0.5rem' }}>Sindicato ($)</th>
                            <th style={{ padding: '0.5rem' }}>Efectivo ($)</th>
                            <th style={{ padding: '0.5rem', textAlign: 'right' }}>Comisión (4%)</th>
                            <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total</th>
                            <th style={{ padding: '0.5rem' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {manualRows.map(row => {
                            const { comision, total } = calculateRowTotals(row);
                            return (
                              <tr key={row.id} style={{ borderBottom: '1px solid #1e293b' }}>
                                <td style={{ padding: '0.3rem' }}><input type="text" value={row.nombre} onChange={(e) => handleUpdateManualRow(row.id, 'nombre', e.target.value)} placeholder="Nombre" style={{ width: '100%', padding: '0.35rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }} /></td>
                                <td style={{ padding: '0.3rem' }}><input type="text" value={row.banco} onChange={(e) => handleUpdateManualRow(row.id, 'banco', e.target.value)} placeholder="Banco" style={{ width: '70px', padding: '0.35rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }} /></td>
                                <td style={{ padding: '0.3rem' }}><input type="text" value={row.cuenta} onChange={(e) => handleUpdateManualRow(row.id, 'cuenta', e.target.value)} placeholder="CLABE" maxLength={18} style={{ width: '100%', padding: '0.35rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }} /></td>
                                <td style={{ padding: '0.3rem' }}><input type="number" value={row.monto} onChange={(e) => handleUpdateManualRow(row.id, 'monto', e.target.value)} placeholder="0" style={{ width: '80px', padding: '0.35rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }} /></td>
                                <td style={{ padding: '0.3rem' }}><input type="number" value={row.sindicato} onChange={(e) => handleUpdateManualRow(row.id, 'sindicato', e.target.value)} placeholder="0" style={{ width: '70px', padding: '0.35rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }} /></td>
                                <td style={{ padding: '0.3rem' }}><input type="number" value={row.efectivo} onChange={(e) => handleUpdateManualRow(row.id, 'efectivo', e.target.value)} placeholder="0" style={{ width: '70px', padding: '0.35rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }} /></td>
                                <td style={{ padding: '0.5rem', textAlign: 'right', color: '#94a3b8' }}>${comision.toFixed(2)}</td>
                                <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold', color: '#38bdf8' }}>${total.toFixed(2)}</td>
                                <td style={{ padding: '0.3rem', textAlign: 'center' }}>
                                  <button type="button" onClick={() => handleDeleteManualRow(row.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>🗑</button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '0.7rem 1.4rem', borderRadius: '8px', background: '#334155', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                Cancelar
              </button>
              <button type="submit" disabled={submitting} style={{ padding: '0.7rem 1.6rem', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '700', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)' }}>
                {submitting ? 'Procesando en Banxico...' : 'Guardar y Validar CEP'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modern Filter & Search Toolbar */}
      <div style={{ 
        background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', 
        borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' 
      }}>
        
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '450px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '1rem' }}>🔍</span>
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por clave de rastreo, beneficiario, banco, factura..."
            style={{ 
              width: '100%', padding: '0.65rem 1rem 0.65rem 2.4rem', background: '#0f172a', border: '1px solid #334155', 
              borderRadius: '10px', color: '#fff', fontSize: '0.88rem', outline: 'none' 
            }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { id: 'todos', label: `Todos (${operaciones.length})` },
            { id: 'Confirmado CEP', label: `✓ Validados (${stats.cepValidados})` },
            { id: 'Pendiente', label: `🕒 Pendientes (${stats.pendientes})` },
            { id: 'dispersion', label: `👥 Con Dispersión (${stats.conDispersion})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                background: statusFilter === tab.id ? '#3b82f6' : '#1e293b',
                color: statusFilter === tab.id ? '#fff' : '#94a3b8',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tipo Filter Select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#cbd5e1', fontSize: '0.82rem' }}
          >
            <option value="todos">Todos los movimientos</option>
            <option value="Ingreso">🟢 Solo Ingresos</option>
            <option value="Egreso">🔵 Solo Egresos</option>
          </select>
        </div>
      </div>

      {/* Operations List Container */}
      <div style={{ background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', overflow: 'hidden' }}>
        
        {filteredOperaciones.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#94a3b8' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📂</span>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', margin: '0 0 0.5rem 0' }}>No se encontraron operaciones</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {searchTerm || statusFilter !== 'todos' ? 'Intenta modificar tus filtros de búsqueda.' : 'Registra tu primera operación haciendo clic en "+ Nueva Operación".'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            
            {/* Header row */}
            <div style={{ 
              display: 'grid', gridTemplateColumns: '120px 1.4fr 1.2fr 140px 160px 150px', 
              padding: '1rem 1.5rem', background: 'rgba(15, 23, 42, 0.6)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#94a3b8', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' 
            }}>
              <div>Fecha / Tipo</div>
              <div>Rastreo SPEI & Bancos</div>
              <div>Monto & Asignaciones</div>
              <div>Dispersión</div>
              <div>Estado Banxico</div>
              <div style={{ textAlign: 'right' }}>Acciones</div>
            </div>

            {/* Operation Rows */}
            {filteredOperaciones.map(op => {
              const hasDispersion = op.requiereDispersion && op.dispersionDetalles && op.dispersionDetalles.length > 0;
              const hasFacturas = op.facturas && op.facturas.length > 0;
              const isSelected = selectedOperacion?.id === op.id;

              return (
                <div 
                  key={op.id}
                  onClick={() => setSelectedOperacion(op)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '120px 1.4fr 1.2fr 140px 160px 150px',
                    padding: '1.2rem 1.5rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    alignItems: 'center',
                    background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    borderLeft: op.estatus === 'Confirmado CEP' ? '4px solid #10b981' : op.estatus === 'Pendiente' ? '4px solid #f59e0b' : '4px solid #64748b'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {/* Fecha / Tipo */}
                  <div>
                    <span style={{ display: 'block', fontSize: '0.88rem', fontWeight: '700', color: '#fff' }}>
                      {op.fechaOperacion || new Date(op.createdAt).toLocaleDateString()}
                    </span>
                    <span style={{ 
                      fontSize: '0.72rem', fontWeight: '600', padding: '0.15rem 0.5rem', borderRadius: '4px',
                      background: op.tipoMovimiento === 'Ingreso' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                      color: op.tipoMovimiento === 'Ingreso' ? '#34d399' : '#38bdf8', marginTop: '0.3rem', display: 'inline-block'
                    }}>
                      {op.tipoMovimiento}
                    </span>
                  </div>

                  {/* Rastreo & Bancos */}
                  <div style={{ paddingRight: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#f8fafc', fontSize: '0.9rem' }}>
                        {op.claveRastreo || 'Sin clave'}
                      </span>
                      {op.claveRastreo && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleCopy(op.claveRastreo, op.id); }}
                          title="Copiar clave de rastreo"
                          style={{ background: 'none', border: 'none', color: copiedId === op.id ? '#34d399' : '#64748b', cursor: 'pointer', fontSize: '0.8rem', padding: '2px 4px' }}
                        >
                          {copiedId === op.id ? '✓' : '📋'}
                        </button>
                      )}
                    </div>
                    <span style={{ color: '#94a3b8', fontSize: '0.78rem', display: 'block', marginTop: '0.2rem' }}>
                      {BANCOS_SAT[op.bancoEmisor] || 'Banco'} ➔ {BANCOS_SAT[op.bancoReceptor] || 'Banco'}
                    </span>
                  </div>

                  {/* Monto & Asignaciones */}
                  <div>
                    <span style={{ fontSize: '1.05rem', fontWeight: '800', color: '#fff' }}>
                      ${op.monto?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                    {hasFacturas && (
                      <div style={{ marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.72rem', background: '#1e293b', border: '1px solid #334155', padding: '0.15rem 0.4rem', borderRadius: '4px', color: '#cbd5e1' }}>
                          📄 {op.facturas.length} Factura(s)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Dispersión */}
                  <div>
                    {hasDispersion ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '0.25rem 0.6rem', borderRadius: '6px', fontWeight: '600' }}>
                        👥 {op.dispersionDetalles.length} dest.
                      </span>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}>—</span>
                    )}
                  </div>

                  {/* Estado Banxico */}
                  <div>
                    {getStatusBadge(op.estatus)}
                  </div>

                  {/* Acciones */}
                  <div style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }} onClick={(e) => e.stopPropagation()}>
                    {op.estatus !== 'Confirmado CEP' && (
                      <button 
                        onClick={() => handleRecheckCep(op)}
                        disabled={verifyingCepId === op.id}
                        title="Revalidar con Banco de México"
                        style={{ padding: '0.4rem 0.6rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        {verifyingCepId === op.id ? '⏳' : '🔄'}
                      </button>
                    )}

                    {op.estatus === 'Confirmado CEP' && op.cepPdfBase64 && (
                      <button 
                        onClick={() => downloadBase64File(op.cepPdfBase64, `CEP_${op.claveRastreo}.pdf`, 'application/pdf')}
                        title="Descargar CEP PDF oficial"
                        style={{ padding: '0.4rem 0.6rem', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', borderRadius: '6px', color: '#34d399', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        📄
                      </button>
                    )}

                    <button 
                      onClick={() => setSelectedOperacion(op)}
                      style={{ padding: '0.4rem 0.8rem', background: '#3b82f6', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                    >
                      Detalle
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide-Over Drawer for Selected Operation Details */}
      {selectedOperacion && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
          <div 
            style={{ 
              width: '100%', maxWidth: '600px', height: '100%', background: '#0f172a', borderLeft: '1px solid #334155', 
              boxShadow: '-10px 0 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflowY: 'auto' 
            }}
          >
            {/* Drawer Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Detalle de Operación</span>
                <h2 style={{ margin: '0.2rem 0 0 0', fontSize: '1.3rem', fontWeight: '800', color: '#fff' }}>
                  {selectedOperacion.tipoMovimiento} • ${selectedOperacion.monto?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedOperacion(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.4rem', cursor: 'pointer', padding: '0.2rem 0.5rem' }}
              >
                ✕
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Estatus Banxico Card */}
              <div style={{ background: '#1e293b', padding: '1.2rem', borderRadius: '10px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>Validación en Banco de México</span>
                  {getStatusBadge(selectedOperacion.estatus)}
                </div>
                {selectedOperacion.estatus !== 'Confirmado CEP' && (
                  <button 
                    onClick={() => handleRecheckCep(selectedOperacion)}
                    disabled={verifyingCepId === selectedOperacion.id}
                    style={{ padding: '0.5rem 0.9rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    {verifyingCepId === selectedOperacion.id ? 'Consultando...' : '🔄 Revalidar CEP'}
                  </button>
                )}
              </div>

              {/* SPEI Details Card */}
              <div style={{ background: '#1e293b', padding: '1.2rem', borderRadius: '10px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.92rem', color: '#38bdf8', fontWeight: '700' }}>Información Bancaria (SPEI)</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>Clave de Rastreo:</span>
                    <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{selectedOperacion.claveRastreo || 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>Fecha de Operación:</span>
                    <strong style={{ color: '#fff' }}>{selectedOperacion.fechaOperacion || 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>Banco Emisor:</span>
                    <strong style={{ color: '#fff' }}>{BANCOS_SAT[selectedOperacion.bancoEmisor] || selectedOperacion.bancoEmisor || 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>Banco Receptor:</span>
                    <strong style={{ color: '#fff' }}>{BANCOS_SAT[selectedOperacion.bancoReceptor] || selectedOperacion.bancoReceptor || 'N/A'}</strong>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>Cuenta CLABE Beneficiario:</span>
                    <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{selectedOperacion.cuentaBeneficiario || 'N/A'}</strong>
                  </div>
                </div>
              </div>

              {/* CEP Downloads Card */}
              {selectedOperacion.estatus === 'Confirmado CEP' && selectedOperacion.cepPdfBase64 && (
                <div style={{ background: '#1e293b', padding: '1.2rem', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.92rem', color: '#34d399', fontWeight: '700' }}>Comprobantes Oficiales de Banxico</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <button 
                      onClick={() => downloadBase64File(selectedOperacion.cepPdfBase64, `CEP_${selectedOperacion.claveRastreo}.pdf`, 'application/pdf')}
                      style={{ padding: '0.65rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                    >
                      📄 Descargar PDF
                    </button>
                    <button 
                      onClick={() => downloadBase64File(selectedOperacion.cepXmlBase64, `CEP_${selectedOperacion.claveRastreo}.xml`, 'application/xml')}
                      style={{ padding: '0.65rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                    >
                      🗎 Descargar XML
                    </button>
                  </div>
                </div>
              )}

              {/* Linked Invoices Card */}
              {selectedOperacion.facturas && selectedOperacion.facturas.length > 0 && (
                <div style={{ background: '#1e293b', padding: '1.2rem', borderRadius: '10px', border: '1px solid #334155' }}>
                  <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.92rem', color: '#38bdf8', fontWeight: '700' }}>Facturas Emitidas Vinculadas</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedOperacion.facturas.map(f => (
                      <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem', background: '#0f172a', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <span>📄 Folio {f.serie || ''}-{f.folio || ''}</span>
                        <strong style={{ color: '#34d399' }}>${f.total?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dispersion Card */}
              {selectedOperacion.requiereDispersion && (
                <div style={{ background: '#1e293b', padding: '1.2rem', borderRadius: '10px', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#c084fc', fontWeight: '700' }}>Dispersión de Fondos ({selectedOperacion.dispersionDetalles?.length || 0} beneficiarios)</h4>
                  </div>

                  {/* Actions & Offline update */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
                    {selectedOperacion.excelBase64 ? (
                      <button 
                        onClick={() => downloadBase64File(selectedOperacion.excelBase64, selectedOperacion.excelNombre || 'dispersion.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
                        style={{ padding: '0.55rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }}
                      >
                        📥 Descargar Excel Original
                      </button>
                    ) : (
                      <button 
                        onClick={handleExportExcelTemplate}
                        style={{ padding: '0.55rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }}
                      >
                        📥 Exportar Plantilla Offline
                      </button>
                    )}

                    <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '6px', border: '1px dashed #334155' }}>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '0.35rem' }}>⚡ Actualizar Dispersión con Excel Offline:</span>
                      <input 
                        type="file" 
                        accept=".xlsx, .xls"
                        onChange={handleUpdateExcelFile}
                        style={{ fontSize: '0.75rem', color: '#fff', width: '100%' }}
                      />
                    </div>
                  </div>

                  {/* Beneficiaries Table */}
                  {selectedOperacion.dispersionDetalles && selectedOperacion.dispersionDetalles.length > 0 && (
                    <div style={{ maxHeight: '220px', overflowY: 'auto', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a' }}>
                      <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#1e293b', textAlign: 'left', color: '#94a3b8' }}>
                            <th style={{ padding: '0.4rem 0.6rem' }}>Beneficiario</th>
                            <th style={{ padding: '0.4rem 0.6rem' }}>CLABE</th>
                            <th style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOperacion.dispersionDetalles.map((d, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                              <td style={{ padding: '0.4rem 0.6rem', color: '#cbd5e1' }}>{d.nombre}</td>
                              <td style={{ padding: '0.4rem 0.6rem', color: '#94a3b8', fontFamily: 'monospace' }}>{d.cuenta}</td>
                              <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 'bold', color: '#fff' }}>
                                ${d.monto?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
