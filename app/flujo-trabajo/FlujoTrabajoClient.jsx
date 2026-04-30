"use client";

import { useState } from "react";
import { registrarPagoFlujo, asignarFacturaAPago, eliminarPago } from "./acciones";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function FlujoTrabajoClient({ facturasDisponibles, pagosPendientesIniciales, pagosAsignadosIniciales }) {
  const [activeTab, setActiveTab] = useState("tesoreria");
  const [pagosPendientes, setPagosPendientes] = useState(pagosPendientesIniciales);
  const [pagosAsignados, setPagosAsignados] = useState(pagosAsignadosIniciales);

  // Estados Tesoreria
  const [loadingTesoreria, setLoadingTesoreria] = useState(false);
  const [formData, setFormData] = useState({ banco: "", monto: "", fechaPago: "", horaPago: "" });

  // Estados Operaciones
  const [loadingAsignacion, setLoadingAsignacion] = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState(null);
  const [facturaSearch, setFacturaSearch] = useState("");

  const handleTesoreriaSubmit = async (e) => {
    e.preventDefault();
    setLoadingTesoreria(true);
    
    const res = await registrarPagoFlujo(formData);
    
    if (res.success) {
      setPagosPendientes([res.pago, ...pagosPendientes]);
      setFormData({ banco: "", monto: "", fechaPago: "", horaPago: "" });
      alert("Pago registrado correctamente");
    } else {
      alert(res.error);
    }
    setLoadingTesoreria(false);
  };

  const handleAsignar = async (facturaId) => {
    if (!pagoSeleccionado) return;
    
    if (!confirm("¿Seguro que deseas enlazar este pago a la factura seleccionada?")) return;
    
    setLoadingAsignacion(true);
    const res = await asignarFacturaAPago(pagoSeleccionado.id, facturaId);
    
    if (res.success) {
      // Actualizar listas
      setPagosPendientes(pagosPendientes.filter(p => p.id !== pagoSeleccionado.id));
      // Se podria hacer fetch de asignados de nuevo, por simplicidad lo forzamos a recargar la UI o lo añadimos a asignados si tuvieramos la factura entera
      alert("Pago asignado correctamente");
      setPagoSeleccionado(null);
      window.location.reload(); // Recarga simple para traer los joins completos
    } else {
      alert(res.error);
    }
    setLoadingAsignacion(false);
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

  const facturasFiltradas = facturasDisponibles.filter(f => 
    (f.folio && f.folio.toString().includes(facturaSearch)) ||
    (f.cliente && f.cliente.razonSocial.toLowerCase().includes(facturaSearch.toLowerCase())) ||
    (f.total && f.total.toString().includes(facturaSearch))
  ).slice(0, 10); // mostrar solo top 10

  return (
    <div className="space-y-6">
      
      {/* Selector de Pestañas */}
      <div className="flex bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 p-1 w-max">
        <button 
          onClick={() => setActiveTab("tesoreria")}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'tesoreria' ? 'bg-[#3b82f6] text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          💼 Tesorería (Carga de Pagos)
        </button>
        <button 
          onClick={() => setActiveTab("operaciones")}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'operaciones' ? 'bg-[#10b981] text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          ⚙️ Operaciones (Asignación)
        </button>
      </div>

      {activeTab === "tesoreria" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Formulario Tesoreria */}
          <div className="col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Registrar Pago Recibido</h2>
            <form onSubmit={handleTesoreriaSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                <input required type="text" value={formData.banco} onChange={e => setFormData({...formData, banco: e.target.value})} className="w-full border-gray-300 rounded-lg shadow-sm p-2 border" placeholder="Ej. BBVA, Santander..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
                <input required type="number" step="0.01" value={formData.monto} onChange={e => setFormData({...formData, monto: e.target.value})} className="w-full border-gray-300 rounded-lg shadow-sm p-2 border" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Pago</label>
                <input required type="date" value={formData.fechaPago} onChange={e => setFormData({...formData, fechaPago: e.target.value})} className="w-full border-gray-300 rounded-lg shadow-sm p-2 border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora (Opcional)</label>
                <input type="time" value={formData.horaPago} onChange={e => setFormData({...formData, horaPago: e.target.value})} className="w-full border-gray-300 rounded-lg shadow-sm p-2 border" />
              </div>
              <button disabled={loadingTesoreria} type="submit" className="w-full bg-[#3b82f6] text-white py-2 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50">
                {loadingTesoreria ? "Guardando..." : "Subir Pago al Flujo"}
              </button>
            </form>
          </div>

          {/* Historial de Tesoreria */}
          <div className="col-span-1 md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Pagos Registrados Recientemente</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                  <tr>
                    <th className="py-3 px-4">Fecha / Hora</th>
                    <th className="py-3 px-4">Banco</th>
                    <th className="py-3 px-4">Monto</th>
                    <th className="py-3 px-4">Estatus</th>
                    <th className="py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pagosPendientes.map(pago => (
                    <tr key={pago.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-800">
                        {format(new Date(pago.fechaPago), "dd/MM/yyyy")} {pago.horaPago && `- ${pago.horaPago}`}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{pago.banco}</td>
                      <td className="py-3 px-4 font-bold text-gray-800">
                        ${pago.monto?.toLocaleString("es-MX", {minimumFractionDigits: 2})}
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-medium border border-orange-200">
                          En Espera (Operaciones)
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button onClick={() => handleEliminarPago(pago.id)} className="text-red-500 hover:text-red-700 font-medium">
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pagosAsignados.slice(0, 5).map(pago => (
                    <tr key={pago.id} className="hover:bg-gray-50 opacity-70">
                      <td className="py-3 px-4 text-gray-800">
                        {format(new Date(pago.fechaPago), "dd/MM/yyyy")}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{pago.banco}</td>
                      <td className="py-3 px-4 font-bold text-gray-800">
                        ${pago.monto?.toLocaleString("es-MX", {minimumFractionDigits: 2})}
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium border border-green-200">
                          ✅ Conciliado
                        </span>
                      </td>
                      <td className="py-3 px-4"></td>
                    </tr>
                  ))}
                  {pagosPendientes.length === 0 && pagosAsignados.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-gray-500">No hay pagos registrados recientemente.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "operaciones" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pagos Pendientes (Bandeja de Entrada) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
            <h2 className="text-xl font-bold text-gray-800 mb-2">📥 Pagos Entrantes</h2>
            <p className="text-sm text-gray-500 mb-4">Selecciona un pago subido por Tesorería para asignarle una factura.</p>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {pagosPendientes.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-4xl mb-2">🎉</div>
                  <p>No hay pagos pendientes de asignación.</p>
                </div>
              ) : (
                pagosPendientes.map(pago => (
                  <div 
                    key={pago.id} 
                    onClick={() => setPagoSeleccionado(pago)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all ${pagoSeleccionado?.id === pago.id ? 'border-[#10b981] bg-emerald-50 ring-2 ring-emerald-100' : 'border-gray-200 hover:border-[#10b981] hover:bg-gray-50'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-gray-800 text-lg">
                        ${pago.monto?.toLocaleString("es-MX", {minimumFractionDigits: 2})}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-medium">
                        {pago.banco}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <span>📅 {format(new Date(pago.fechaPago), "dd MMM yyyy")}</span>
                      {pago.horaPago && <span>🕒 {pago.horaPago}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Area de Asignación */}
          <div className="bg-gray-50 p-6 rounded-2xl shadow-inner border border-gray-200 flex flex-col h-[600px]">
            {pagoSeleccionado ? (
              <>
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-gray-800">🔗 Enlazar Factura</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Buscando factura para el pago de <strong className="text-emerald-600">${pagoSeleccionado.monto?.toLocaleString("es-MX", {minimumFractionDigits: 2})}</strong>
                  </p>
                </div>

                <input 
                  type="text" 
                  value={facturaSearch}
                  onChange={e => setFacturaSearch(e.target.value)}
                  placeholder="Buscar por Folio, Cliente o Monto..." 
                  className="w-full border-gray-300 rounded-lg shadow-sm p-3 border mb-4 focus:ring-emerald-500 focus:border-emerald-500"
                />

                <div className="flex-1 overflow-y-auto space-y-3">
                  {facturasFiltradas.length > 0 ? (
                    facturasFiltradas.map(f => (
                      <div key={f.id} className="bg-white p-4 border border-gray-200 rounded-xl flex justify-between items-center hover:shadow-md transition-shadow">
                        <div>
                          <div className="font-bold text-gray-800">Folio: {f.folio || 'S/F'} <span className="text-gray-400 font-normal ml-2">(${f.total?.toLocaleString("es-MX", {minimumFractionDigits: 2})})</span></div>
                          <div className="text-sm text-gray-600 truncate max-w-[200px]">{f.cliente?.razonSocial}</div>
                        </div>
                        <button 
                          onClick={() => handleAsignar(f.id)}
                          disabled={loadingAsignacion}
                          className="bg-[#10b981] hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          Enlazar
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-500 text-sm">
                      No se encontraron facturas que coincidan con la búsqueda.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <div className="text-5xl mb-4 text-gray-300">🔗</div>
                <p className="text-center font-medium text-gray-500">Selecciona un pago de la lista de la izquierda<br/>para buscar y asignarle una factura.</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
