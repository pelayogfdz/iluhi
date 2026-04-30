'use client'

import { useState, useEffect, useMemo } from 'react';
import { obtenerReporteFacturas } from './acciones';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

export default function ReportesClient({ empresas, clientes }) {
  const [filtros, setFiltros] = useState({
    empresaId: '',
    clienteId: '',
    fechaInicio: '',
    fechaFin: '',
    estatus: '',
    metodoPago: '',
    estadoComplemento: 'Todos'
  });

  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Fetch initial data
  useEffect(() => {
    cargarReporte();
  }, []);

  const cargarReporte = async () => {
    setCargando(true);
    setError('');
    try {
      const res = await obtenerReporteFacturas(filtros);
      if (res.success) {
        setFacturas(res.facturas);
      } else {
        setError(res.error || 'Error al cargar los reportes');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const handleChange = (e) => {
    setFiltros({ ...filtros, [e.target.name]: e.target.value });
  };

  const handleExportExcel = () => {
    if (facturas.length === 0) return;
    
    // Map to friendly format for Excel
    const dataToExport = facturas.map(f => ({
      'UUID': f.uuid,
      'Folio Interno': f.folioInterno,
      'Fecha Emisión': new Date(f.fecha).toLocaleDateString(),
      'Empresa Emisora': f.empresa,
      'Cliente Receptor': f.cliente,
      'SubTotal': f.subTotal,
      'Total': f.total,
      'Estatus': f.estatus,
      'Método de Pago': f.metodoPago,
      'Complementos': f.complementos > 0 ? 'Con Complemento' : (f.metodoPago === 'PPD' ? 'Pendiente' : 'N/A')
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Facturas");
    
    XLSX.writeFile(workbook, `Reporte_Facturas_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // Group data for the chart (Group by Month or by Status as an example)
  // Let's do a simple grouping by Estatus
  const chartData = useMemo(() => {
    const counts = {};
    const amounts = {};

    facturas.forEach(f => {
       const label = f.estatus || 'Desconocido';
       counts[label] = (counts[label] || 0) + 1;
       amounts[label] = (amounts[label] || 0) + f.total;
    });

    return Object.keys(amounts).map(key => ({
      name: key,
      cantidad: counts[key],
      montoTotal: amounts[key]
    }));
  }, [facturas]);

  const kpis = {
    totalMonto: facturas.reduce((acc, curr) => acc + curr.total, 0),
    totalFacturas: facturas.length,
    totalPPD: facturas.filter(f => f.metodoPago === 'PPD').length,
    totalPUE: facturas.filter(f => f.metodoPago === 'PUE').length,
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ color: 'var(--primary)', margin: 0 }}>📊 Explorador Visual de Facturación</h2>
        <button className="btn" onClick={handleExportExcel} disabled={facturas.length === 0} style={{ backgroundColor: '#20a359', color: 'white' }}>
          📥 Descargar Excel
        </button>
      </div>

      {error && <div style={{ background: '#ff4444', color: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}

      {/* Panel de Filtros */}
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <h4 style={{ marginBottom: '1rem', color: 'var(--accent)' }}>Filtros de Búsqueda</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label>Empresa Emisora</label>
            <select name="empresaId" className="form-control" value={filtros.empresaId} onChange={handleChange}>
              <option value="">Todas</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.razonSocial}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Cliente Receptor</label>
            <select name="clienteId" className="form-control" value={filtros.clienteId} onChange={handleChange}>
              <option value="">Todos</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.razonSocial}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Estatus</label>
            <select name="estatus" className="form-control" value={filtros.estatus} onChange={handleChange}>
              <option value="">Todos</option>
              <option value="Timbrada">Timbradas / Activas</option>
              <option value="Cancelada">Canceladas</option>
              <option value="Borrador">Borradores</option>
            </select>
          </div>
          <div className="form-group">
            <label>Método de Pago</label>
            <select name="metodoPago" className="form-control" value={filtros.metodoPago} onChange={handleChange}>
              <option value="">Todos</option>
              <option value="PUE">PUE (Pago en una exhibición)</option>
              <option value="PPD">PPD (Pago en parcialidades)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Complementos (Solo PPD)</label>
            <select name="estadoComplemento" className="form-control" value={filtros.estadoComplemento} onChange={handleChange}>
              <option value="Todos">Todos</option>
              <option value="Emitido">Emitido</option>
              <option value="Pendiente">Pendiente</option>
            </select>
          </div>
          <div className="form-group">
            <label>Fecha Inicio</label>
            <input type="date" name="fechaInicio" className="form-control" value={filtros.fechaInicio} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Fecha Fin</label>
            <input type="date" name="fechaFin" className="form-control" value={filtros.fechaFin} onChange={handleChange} />
          </div>
        </div>
        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
           <button className="btn btn-secondary" onClick={cargarReporte} disabled={cargando}>
             {cargando ? 'Cargando...' : 'Aplicar Filtros'}
           </button>
        </div>
      </div>

      {/* KPIs Rápidos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <h5 style={{ color: 'var(--text-secondary)' }}>Monto Total Filtrado</h5>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent)' }}>
            ${kpis.totalMonto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <h5 style={{ color: 'var(--text-secondary)' }}>Facturas Encontradas</h5>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00ff88' }}>
            {kpis.totalFacturas}
          </div>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <h5 style={{ color: 'var(--text-secondary)' }}>Facturas PPD</h5>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffb300' }}>
            {kpis.totalPPD}
          </div>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <h5 style={{ color: 'var(--text-secondary)' }}>Facturas PUE</h5>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff4444' }}>
            {kpis.totalPUE}
          </div>
        </div>
      </div>

      {/* Gráfica */}
      {facturas.length > 0 && (
        <div className="glass-panel" style={{ marginBottom: '2rem', height: '350px' }}>
          <h4 style={{ marginBottom: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Distribución por Estatus (Montos)</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid var(--accent)', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="montoTotal" name="Monto ($)" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detalle */}
      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <h4 style={{ marginBottom: '1rem' }}>Detalle de Documentos</h4>
        {cargando ? (
           <p style={{ textAlign: 'center', padding: '2rem' }}>Obteniendo datos...</p>
        ) : facturas.length === 0 ? (
           <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No se encontraron facturas con los filtros seleccionados.</p>
        ) : (
          <table className="table" style={{ width: '100%', minWidth: '900px' }}>
            <thead>
              <tr>
                <th>Factura / Folio</th>
                <th>Fecha</th>
                <th>Emisor</th>
                <th>Receptor</th>
                <th>Monto Total</th>
                <th>Estatus</th>
                <th>Método</th>
                <th>Comprobantes</th>
              </tr>
            </thead>
            <tbody>
              {facturas.map(f => (
                <tr key={f.id}>
                  <td>
                    {f.uuid !== 'N/A' ? (
                      <a href={`/api/facturas/${f.uuid}/download?type=pdf`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' }}>
                        {f.folioInterno !== 'N/A' ? f.folioInterno : (f.uuid.substring(0,8) + '...')}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>Sin Folio</span>
                    )}
                  </td>
                  <td>{new Date(f.fecha).toLocaleDateString()}</td>
                  <td>{f.empresa}</td>
                  <td>{f.cliente}</td>
                  <td style={{ fontWeight: 'bold' }}>${f.total.toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                  <td>
                    <span style={{
                      padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem',
                      backgroundColor: f.estatus === 'Timbrada' ? 'rgba(0,255,0,0.2)' : (f.estatus === 'Cancelada' ? 'rgba(255,0,0,0.2)' : 'rgba(255,255,255,0.1)'),
                      color: f.estatus === 'Timbrada' ? '#00ff88' : (f.estatus === 'Cancelada' ? '#ff4444' : 'white')
                    }}>
                      {f.estatus}
                    </span>
                  </td>
                  <td>{f.metodoPago}</td>
                  <td>
                    {f.metodoPago === 'PPD' ? (
                       f.complementos > 0 ? <span style={{ color: '#00ff88' }}>Emitido(s)</span> : <span style={{ color: '#ffb300' }}>Pendiente</span>
                    ) : (
                       <span style={{ color: 'var(--text-secondary)' }}>N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
