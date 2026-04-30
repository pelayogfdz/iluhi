"use client";

import { useState } from "react";
import { registrarPagoFlujo, asignarFacturaAPago, eliminarPago } from "./acciones";

export default function FlujoTrabajoClient({ 
  facturasDisponibles, 
  empresasDisponibles = [],
  clientesDisponibles = [],
  pagosPendientesIniciales, 
  pagosAsignadosIniciales 
}) {
  const [activeTab, setActiveTab] = useState("tesoreria");
  const [pagosPendientes, setPagosPendientes] = useState(pagosPendientesIniciales);
  const [pagosAsignados, setPagosAsignados] = useState(pagosAsignadosIniciales);

  // Estados Tesoreria
  const [loadingTesoreria, setLoadingTesoreria] = useState(false);
  const [formData, setFormData] = useState({ 
    empresaId: "",
    clienteId: "",
    banco: "", 
    monto: "", 
    fechaPago: "", 
    horaPago: "" 
  });

  // Estados Operaciones
  const [facturaSearch, setFacturaSearch] = useState("");
  const [draggedPago, setDraggedPago] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // === FUNCIONES TESORERIA ===
  const handleTesoreriaSubmit = async (e) => {
    e.preventDefault();
    setLoadingTesoreria(true);
    
    const res = await registrarPagoFlujo(formData);
    
    if (res.success) {
      // Manualmente agregamos los datos de empresa y cliente al objeto de pago creado para la vista
      const empresa = empresasDisponibles.find(e => e.id === formData.empresaId);
      const cliente = clientesDisponibles.find(c => c.id === formData.clienteId);
      
      const nuevoPago = {
        ...res.pago,
        empresa,
        cliente
      };

      setPagosPendientes([nuevoPago, ...pagosPendientes]);
      setFormData({ empresaId: "", clienteId: "", banco: "", monto: "", fechaPago: "", horaPago: "" });
      alert("Pago registrado correctamente");
    } else {
      alert(res.error);
    }
    setLoadingTesoreria(false);
  };

  const handleEliminarPago = async (id) => {
    if (!confirm("¿Seguro que deseas eliminar este pago del flujo?")) return;
    const res = await eliminarPago(id);
    if (res.success) {
      setPagosPendientes(pagosPendientes.filter(p => p.id !== id));
    } else {
      alert("Error al eliminar");
    }
  };


  // === FUNCIONES DRAG & DROP OPERACIONES ===
  const handleDragStart = (e, pago) => {
    setDraggedPago(pago);
    setIsDragging(true);
    // Establecer algo visual
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedPago(null);
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Necesario para permitir el drop
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, factura) => {
    e.preventDefault();
    if (!draggedPago) return;

    // Confirmación nativa rápida para evitar drops por accidente
    const confirmar = window.confirm(
      `¿Enlazar el pago de $${draggedPago.monto.toLocaleString("es-MX")} a la factura ${factura.folio || 'S/F'}?`
    );
    
    if (!confirmar) {
      handleDragEnd();
      return;
    }

    const res = await asignarFacturaAPago(draggedPago.id, factura.id);
    if (res.success) {
      setPagosPendientes(prev => prev.filter(p => p.id !== draggedPago.id));
      alert("¡Enlazado exitosamente!");
      // Recarga rapida para estabilizar
      window.location.reload();
    } else {
      alert(res.error);
    }
    handleDragEnd();
  };

  // Buscador
  const facturasFiltradas = facturasDisponibles.filter(f => 
    (f.folio && f.folio.toString().includes(facturaSearch)) ||
    (f.cliente && f.cliente.razonSocial.toLowerCase().includes(facturaSearch.toLowerCase())) ||
    (f.total && f.total.toString().includes(facturaSearch))
  ).slice(0, 15);

  return (
    <div className="space-y-6">
      
      {/* Selector de Pestañas */}
      <div className="flex bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 p-1 w-max">
        <button 
          onClick={() => setActiveTab("tesoreria")}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'tesoreria' ? 'bg-[#3b82f6] text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          💼 Tesorería (Carga)
        </button>
        <button 
          onClick={() => setActiveTab("operaciones")}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'operaciones' ? 'bg-[#10b981] text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          🖱️ Operaciones (Drag & Drop)
        </button>
      </div>

      {activeTab === "tesoreria" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario Tesoreria */}
          <div className="col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Registrar Pago Recibido</h2>
            <form onSubmit={handleTesoreriaSubmit} className="space-y-4">
              
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-2">
                <label className="block text-sm font-semibold text-blue-900 mb-1">Empresa Receptora *</label>
                <select 
                  required
                  value={formData.empresaId} 
                  onChange={e => setFormData({...formData, empresaId: e.target.value})} 
                  className="w-full border-blue-200 rounded-lg shadow-sm p-2 text-sm bg-white"
                >
                  <option value="">-- Selecciona a dónde cayó el pago --</option>
                  {empresasDisponibles.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.razonSocial}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Banco *</label>
                <input required type="text" value={formData.banco} onChange={e => setFormData({...formData, banco: e.target.value})} className="w-full border-gray-300 rounded-lg shadow-sm p-2 border" placeholder="Ej. BBVA, Santander..." />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($) *</label>
                  <input required type="number" step="0.01" value={formData.monto} onChange={e => setFormData({...formData, monto: e.target.value})} className="w-full border-gray-300 rounded-lg shadow-sm p-2 border" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                  <input required type="date" value={formData.fechaPago} onChange={e => setFormData({...formData, fechaPago: e.target.value})} className="w-full border-gray-300 rounded-lg shadow-sm p-2 border" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente (Opcional si se conoce)</label>
                <select 
                  value={formData.clienteId} 
                  onChange={e => setFormData({...formData, clienteId: e.target.value})} 
                  className="w-full border-gray-300 rounded-lg shadow-sm p-2 text-sm border bg-gray-50"
                >
                  <option value="">-- Pago no identificado / No estoy seguro --</option>
                  {clientesDisponibles.map(cli => (
                    <option key={cli.id} value={cli.id}>{cli.razonSocial}</option>
                  ))}
                </select>
              </div>

              <button disabled={loadingTesoreria} type="submit" className="w-full mt-4 bg-[#3b82f6] text-white py-3 rounded-xl font-bold shadow hover:bg-blue-600 disabled:opacity-50 transition-all">
                {loadingTesoreria ? "Guardando..." : "Subir Pago al Flujo"}
              </button>
            </form>
          </div>

          {/* Historial de Tesoreria */}
          <div className="col-span-1 lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Pagos Registrados Recientemente</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                  <tr>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Empresa / Banco</th>
                    <th className="py-3 px-4">Cliente (Opcional)</th>
                    <th className="py-3 px-4">Monto</th>
                    <th className="py-3 px-4">Estatus</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pagosPendientes.map(pago => (
                    <tr key={pago.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-800">
                        {new Date(pago.fechaPago).toLocaleDateString("es-MX")}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-blue-700 text-xs">{pago.empresa?.razonSocial || 'Desconocida'}</div>
                        <div className="text-gray-600 text-xs">{pago.banco}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs max-w-[150px] truncate">
                        {pago.cliente?.razonSocial || <span className="italic">No identificado</span>}
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-800">
                        ${pago.monto?.toLocaleString("es-MX", {minimumFractionDigits: 2})}
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-medium border border-orange-200">
                          En Espera
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button onClick={() => handleEliminarPago(pago.id)} className="text-red-500 hover:text-red-700 font-medium text-xs">Eliminar</button>
                      </td>
                    </tr>
                  ))}
                  {pagosAsignados.slice(0, 5).map(pago => (
                    <tr key={pago.id} className="hover:bg-gray-50 opacity-60">
                      <td className="py-3 px-4 text-gray-800">{new Date(pago.fechaPago).toLocaleDateString("es-MX")}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-blue-700 text-xs">{pago.empresa?.razonSocial}</div>
                        <div className="text-gray-600 text-xs">{pago.banco}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs truncate max-w-[150px]">
                        {pago.cliente?.razonSocial || pago.factura?.cliente?.razonSocial}
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-800">${pago.monto?.toLocaleString("es-MX", {minimumFractionDigits: 2})}</td>
                      <td className="py-3 px-4">
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium border border-green-200">✅ Conciliado</span>
                      </td>
                      <td className="py-3 px-4"></td>
                    </tr>
                  ))}
                  {pagosPendientes.length === 0 && pagosAsignados.length === 0 && (
                    <tr><td colSpan="6" className="py-6 text-center text-gray-500">No hay pagos registrados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "operaciones" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Columna Izquierda: Pagos Pendientes (Draggable) */}
          <div className="flex flex-col h-[700px]">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-800">📥 Pagos Entrantes</h2>
              <p className="text-sm text-gray-500">Arrastra una tarjeta hacia una factura de la derecha.</p>
            </div>
            
            <div className={`flex-1 overflow-y-auto pr-2 space-y-4 p-2 rounded-xl border-2 border-dashed ${isDragging ? 'border-orange-200 bg-orange-50' : 'border-transparent'}`}>
              {pagosPendientes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <div className="text-4xl mb-2">🎉</div>
                  <p>No hay pagos pendientes.</p>
                </div>
              ) : (
                pagosPendientes.map(pago => (
                  <div 
                    key={pago.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, pago)}
                    onDragEnd={handleDragEnd}
                    className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all hover:border-orange-300"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-2xl text-emerald-600">
                        ${pago.monto?.toLocaleString("es-MX", {minimumFractionDigits: 2})}
                      </div>
                      <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-md font-bold truncate max-w-[120px]">
                        {pago.empresa?.razonSocial || 'Sin empresa'}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end mt-4">
                      <div className="text-xs text-gray-500">
                        🏦 {pago.banco} <br/>
                        📅 {new Date(pago.fechaPago).toLocaleDateString("es-MX")}
                      </div>
                      <div className="text-xs font-medium text-gray-600 text-right">
                        {pago.cliente ? (
                          <span className="bg-gray-100 px-2 py-1 rounded">👤 {pago.cliente.razonSocial.substring(0, 20)}</span>
                        ) : (
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">❓ Cliente sin identificar</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Columna Derecha: Facturas (Drop Zones) */}
          <div className="flex flex-col h-[700px] bg-gray-50 p-6 rounded-3xl border border-gray-200 shadow-inner">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                🔗 Facturas (Destino)
                {isDragging && <span className="animate-pulse h-3 w-3 bg-emerald-500 rounded-full"></span>}
              </h2>
              <p className="text-sm text-gray-500">Suelta el pago aquí encima para enlazarlo.</p>
            </div>

            <input 
              type="text" 
              value={facturaSearch}
              onChange={e => setFacturaSearch(e.target.value)}
              placeholder="Buscar Factura por Folio, Cliente o Monto..." 
              className="w-full border-gray-300 rounded-xl shadow-sm p-3 border mb-6 focus:ring-emerald-500 focus:border-emerald-500"
            />

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {facturasFiltradas.length > 0 ? (
                facturasFiltradas.map(f => (
                  <div 
                    key={f.id} 
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, f)}
                    className={`bg-white p-5 border-2 rounded-2xl flex flex-col justify-between transition-all relative overflow-hidden group
                      ${isDragging ? 'border-dashed border-emerald-300 hover:bg-emerald-50 hover:border-emerald-500 hover:shadow-lg hover:scale-[1.02]' : 'border-gray-100 hover:border-gray-300'}
                    `}
                  >
                    {/* Overlay que aparece al arrastrar encima */}
                    {isDragging && (
                      <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                        <span className="bg-emerald-600 text-white font-bold py-1 px-4 rounded-full shadow-lg">Soltar Aquí</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center w-full">
                      <div>
                        <div className="font-black text-gray-800 text-lg">Folio: {f.folio || 'S/F'}</div>
                        <div className="text-sm font-semibold text-gray-600 max-w-[220px] truncate">{f.cliente?.razonSocial}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-800">${f.total?.toLocaleString("es-MX", {minimumFractionDigits: 2})}</div>
                        <div className="text-xs text-gray-400">{new Date(f.createdAt).toLocaleDateString("es-MX")}</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-gray-500 text-sm">
                  No se encontraron facturas.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
