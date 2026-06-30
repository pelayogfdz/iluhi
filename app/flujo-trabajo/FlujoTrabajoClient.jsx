"use client";

import { useState } from "react";
import { registrarPagoFlujo, asignarFacturaAPago, editarEmpresaClientePago, eliminarPago } from "./acciones";
import { formatDateDDMMYYYY } from "../../lib/date";

export default function FlujoTrabajoClient({ 
  facturasDisponibles, 
  empresasDisponibles = [],
  clientesDisponibles = [],
  pagosPendientesIniciales, 
  pagosAsignadosIniciales,
  currentUser 
}) {
  const [pagos, setPagos] = useState([...pagosPendientesIniciales, ...pagosAsignadosIniciales]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(""); // "CREATE_TESORERIA", "EDIT_EMPRESA_CLIENTE", "ASSIGN_FACTURA"
  const [selectedPagoId, setSelectedPagoId] = useState(null);
  
  // Forms
  const [tesoreriaForm, setTesoreriaForm] = useState({ empresaId: "", clienteId: "", banco: "", monto: "", fechaPago: "" });
  const [empresaClienteForm, setEmpresaClienteForm] = useState({ empresaId: "", clienteId: "" });
  const [facturaForm, setFacturaForm] = useState({ facturaId: "" });

  const [loading, setLoading] = useState(false);

  // Permisos
  const isTesoreria = !!currentUser?.permisoTesoreria;
  const isOperaciones = !!currentUser?.permisoOperaciones;

  // Tesoreria: Create Pago
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await registrarPagoFlujo({ ...tesoreriaForm, userId: currentUser.id });
    if (res.success) {
      const empresa = empresasDisponibles.find(e => e.id === tesoreriaForm.empresaId);
      const cliente = clientesDisponibles.find(c => c.id === tesoreriaForm.clienteId);
      const nuevoPago = {
        ...res.pago,
        empresa,
        cliente,
        creador: { nombre: currentUser.nombre }
      };
      setPagos([nuevoPago, ...pagos]);
      setIsModalOpen(false);
      setTesoreriaForm({ empresaId: "", clienteId: "", banco: "", monto: "", fechaPago: "" });
    } else {
      alert(res.error);
    }
    setLoading(false);
  };

  // Ambos: Edit Empresa / Cliente
  const handleEditEmpresaCliente = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await editarEmpresaClientePago(selectedPagoId, { ...empresaClienteForm, userId: currentUser.id });
    if (res.success) {
      const empresa = empresasDisponibles.find(em => em.id === empresaClienteForm.empresaId);
      const cliente = clientesDisponibles.find(c => c.id === empresaClienteForm.clienteId);
      
      setPagos(pagos.map(p => {
        if (p.id === selectedPagoId) {
          return { ...p, empresaId: empresaClienteForm.empresaId, clienteId: empresaClienteForm.clienteId, empresa, cliente, clienteEditadoPor: { nombre: currentUser.nombre } };
        }
        return p;
      }));
      setIsModalOpen(false);
    } else {
      alert(res.error);
    }
    setLoading(false);
  };

  // Operaciones: Assign Factura
  const handleAssignFactura = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await asignarFacturaAPago(selectedPagoId, facturaForm.facturaId, currentUser.id);
    if (res.success) {
      const factura = facturasDisponibles.find(f => f.id === facturaForm.facturaId);
      setPagos(pagos.map(p => {
        if (p.id === selectedPagoId) {
          return { ...p, estatus: "Asignado", facturaId: facturaForm.facturaId, factura, facturaAsignadaPor: { nombre: currentUser.nombre } };
        }
        return p;
      }));
      setIsModalOpen(false);
    } else {
      alert(res.error);
    }
    setLoading(false);
  };

  const handleEliminar = async (id) => {
    if(!confirm("¿Seguro que deseas eliminar este pago?")) return;
    const res = await eliminarPago(id);
    if(res.success) {
      setPagos(pagos.filter(p => p.id !== id));
    } else {
      alert("Error eliminando: " + res.error);
    }
  };

  const openEditEmpresaCliente = (pago) => {
    setSelectedPagoId(pago.id);
    setEmpresaClienteForm({ empresaId: pago.empresaId || "", clienteId: pago.clienteId || "" });
    setModalType("EDIT_EMPRESA_CLIENTE");
    setIsModalOpen(true);
  };

  const openAssignFactura = (pago) => {
    setSelectedPagoId(pago.id);
    setFacturaForm({ facturaId: pago.facturaId || "" });
    setModalType("ASSIGN_FACTURA");
    setIsModalOpen(true);
  };

  const [draggedPago, setDraggedPago] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Drag handlers
  const handleDragStart = (e, pago) => {
    setDraggedPago(pago);
    e.dataTransfer.effectAllowed = "move";
    // Slight delay to allow UI to update while dragging
    setTimeout(() => {
      e.target.style.opacity = "0.5";
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = "1";
    setDraggedPago(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault(); // Necesario para permitir el drop
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = (e) => {
    setDragOverColumn(null);
  };

  const handleDrop = (e, targetColumnId) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (!draggedPago) return;

    // Determinar la lógica según el movimiento de columnas
    if (targetColumnId === "col2" && (!draggedPago.empresaId || !draggedPago.clienteId)) {
      // Movido de Col1 a Col2 -> Requiere asignar Empresa/Cliente
      openEditEmpresaCliente(draggedPago);
    } else if (targetColumnId === "col3" && draggedPago.estatus !== "Asignado") {
      // Movido de Col2 a Col3 -> Requiere asignar Factura
      if (!isOperaciones) {
        alert("⚠️ Solo el departamento de Operaciones puede vincular facturas.");
        return;
      }
      if (!draggedPago.empresaId || !draggedPago.clienteId) {
        alert("⚠️ Primero debes identificar la empresa y el cliente del depósito antes de poder asignarle una factura.");
        return;
      }
      openAssignFactura(draggedPago);
    } else if (targetColumnId === "col1" && (draggedPago.empresaId || draggedPago.clienteId)) {
      // Opcional: Permitir regresar a la col1 (quitar empresa/cliente)
      // Por ahora no lo haremos arrastrable hacia atrás directamente, pueden editar con el lapicito.
      alert("⚠️ Para desvincular empresa/cliente, usa el ícono de editar en la tarjeta.");
    }
  };

  // Dividir pagos en columnas
  const pagosCol1 = pagos.filter(p => !p.empresaId || !p.clienteId);
  const pagosCol2 = pagos.filter(p => p.empresaId && p.clienteId && p.estatus !== "Asignado");
  const pagosCol3 = pagos.filter(p => p.estatus === "Asignado");

  const renderCard = (pago, columnId) => (
    <div
      key={pago.id}
      draggable
      onDragStart={(e) => handleDragStart(e, pago)}
      onDragEnd={handleDragEnd}
      className={`group bg-white p-5 rounded-2xl shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing hover:shadow-md transition-all relative ${draggedPago?.id === pago.id ? 'ring-2 ring-indigo-400 opacity-50' : ''}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="font-black text-indigo-600 text-xl tracking-tight">${pago.monto?.toLocaleString("es-MX", {minimumFractionDigits: 2})}</div>
        <div className="flex gap-2">
          {columnId !== "col3" && (
            <button onClick={() => openEditEmpresaCliente(pago)} title="Identificar Empresa/Cliente" className="text-gray-300 hover:text-blue-500 bg-gray-50 shadow-sm border border-gray-100 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110">✏️</button>
          )}
          {columnId === "col2" && isOperaciones && (
            <button onClick={() => openAssignFactura(pago)} title="Vincular Factura" className="text-emerald-400 hover:text-emerald-600 bg-emerald-50 shadow-sm border border-emerald-100 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110">🔗</button>
          )}
          {isTesoreria && columnId !== "col3" && (
            <button onClick={() => handleEliminar(pago.id)} title="Eliminar Pago" className="text-red-300 hover:text-red-500 bg-red-50 shadow-sm border border-red-100 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110">🗑️</button>
          )}
        </div>
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm">
          <span className="bg-gray-100 p-1 rounded">🏦</span> {pago.banco}
        </div>
        <div className="flex items-center gap-2 text-gray-400 text-xs font-medium">
           <span className="bg-gray-100 p-1 rounded">📅</span> {formatDateDDMMYYYY(pago.fechaPago)}
        </div>
      </div>

      {(pago.empresa || pago.cliente) && (
        <div className="p-3 bg-gray-50 rounded-xl mb-4 border border-gray-100">
          <div className="text-xs font-bold text-gray-400 mb-1">IDENTIFICADO COMO:</div>
          <div className="font-bold text-gray-800 text-sm">{pago.empresa?.razonSocial || "Sin Empresa"}</div>
          <div className="text-gray-500 text-xs">{pago.cliente?.razonSocial || "Sin Cliente"}</div>
        </div>
      )}

      {pago.factura && (
        <div className="p-3 bg-emerald-50 rounded-xl mb-4 border border-emerald-100">
          <div className="text-xs font-black text-emerald-600 uppercase mb-1">Factura Vinculada</div>
          <div className="font-bold text-emerald-900 text-sm">Folio: {pago.factura.folio || 'S/F'}</div>
          <div className="text-emerald-700 text-xs font-bold">Total: ${pago.factura.total?.toLocaleString("es-MX")}</div>
        </div>
      )}

      {/* Auditoría Footer */}
      <div className="mt-4 pt-3 border-t border-gray-50 text-[10px] text-gray-400 flex flex-col gap-1 font-medium">
        {pago.creador && <span>📥 Capturado por: {pago.creador.nombre}</span>}
        {pago.clienteEditadoPor && <span>🔍 Identificado por: {pago.clienteEditadoPor.nombre}</span>}
        {pago.facturaAsignadaPor && <span>🔗 Conciliado por: {pago.facturaAsignadaPor.nombre}</span>}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 fade-in">
      
      {/* Botones de Accion Principales */}
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-lg border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <span className="bg-indigo-100 text-indigo-600 p-2 rounded-xl">💸</span> 
            Flujo de Pagos
          </h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Arrastra los pagos entre etapas para identificarlos y conciliarlos.</p>
        </div>
        {isTesoreria && (
          <button 
            onClick={() => { setModalType("CREATE_TESORERIA"); setIsModalOpen(true); }}
            className="bg-gray-900 hover:bg-black text-white font-bold py-3.5 px-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all flex items-center gap-2 transform hover:-translate-y-1"
          >
            <span>➕</span> Registrar Nuevo Depósito
          </button>
        )}
      </div>

      {/* TABLERO KANBAN */}
      <div className="flex gap-6 min-h-[600px] overflow-x-auto pb-4 snap-x">
        
        {/* COLUMNA 1 */}
        <div 
          className={`flex flex-col bg-gray-50/50 rounded-3xl border-2 transition-all duration-300 overflow-hidden min-w-[320px] flex-1 snap-center ${dragOverColumn === 'col1' ? 'border-indigo-400 bg-indigo-50/30 ring-4 ring-indigo-50' : 'border-dashed border-gray-200'}`}
          onDragOver={(e) => handleDragOver(e, 'col1')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'col1')}
        >
          <div className="p-5 border-b border-gray-100 bg-white/50 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-black text-gray-800 uppercase tracking-wider text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                1. Recién Ingresados
              </h3>
              <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2.5 py-0.5 rounded-full">{pagosCol1.length}</span>
            </div>
            <p className="text-xs text-gray-500">Pendientes de asignar Empresa/Cliente</p>
          </div>
          <div className="p-4 flex-1 space-y-4 overflow-y-auto">
            {pagosCol1.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm font-medium opacity-60 p-6 text-center">
                <span className="text-3xl mb-2">📥</span>
                No hay depósitos nuevos.
              </div>
            ) : pagosCol1.map(p => renderCard(p, "col1"))}
          </div>
        </div>

        {/* COLUMNA 2 */}
        <div 
          className={`flex flex-col bg-blue-50/30 rounded-3xl border-2 transition-all duration-300 overflow-hidden min-w-[320px] flex-1 snap-center ${dragOverColumn === 'col2' ? 'border-blue-400 bg-blue-100/50 ring-4 ring-blue-50' : 'border-dashed border-blue-200'}`}
          onDragOver={(e) => handleDragOver(e, 'col2')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'col2')}
        >
          <div className="p-5 border-b border-blue-100 bg-white/50 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-black text-blue-900 uppercase tracking-wider text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                2. Identificados
              </h3>
              <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">{pagosCol2.length}</span>
            </div>
            <p className="text-xs text-blue-600/70">Esperando asignación de factura</p>
          </div>
          <div className="p-4 flex-1 space-y-4 overflow-y-auto">
            {pagosCol2.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-blue-400 text-sm font-medium opacity-60 p-6 text-center">
                <span className="text-3xl mb-2">🔍</span>
                Arrastra un depósito aquí para identificarlo.
              </div>
            ) : pagosCol2.map(p => renderCard(p, "col2"))}
          </div>
        </div>

        {/* COLUMNA 3 */}
        <div 
          className={`flex flex-col bg-emerald-50/30 rounded-3xl border-2 transition-all duration-300 overflow-hidden min-w-[320px] flex-1 snap-center ${dragOverColumn === 'col3' ? 'border-emerald-400 bg-emerald-100/50 ring-4 ring-emerald-50' : 'border-dashed border-emerald-200'}`}
          onDragOver={(e) => handleDragOver(e, 'col3')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'col3')}
        >
          <div className="p-5 border-b border-emerald-100 bg-white/50 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-black text-emerald-900 uppercase tracking-wider text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                3. Conciliados
              </h3>
              <span className="bg-emerald-200 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">{pagosCol3.length}</span>
            </div>
            <p className="text-xs text-emerald-600/70">Factura vinculada y proceso cerrado</p>
          </div>
          <div className="p-4 flex-1 space-y-4 overflow-y-auto">
            {pagosCol3.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-emerald-400 text-sm font-medium opacity-60 p-6 text-center">
                <span className="text-3xl mb-2">✅</span>
                Arrastra aquí para asignar factura.
              </div>
            ) : pagosCol3.map(p => renderCard(p, "col3"))}
          </div>
        </div>

      </div>

      {/* === MODALES === */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4 fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
            
            {modalType === "CREATE_TESORERIA" && (
              <div className="p-8">
                <h3 className="text-2xl font-black text-gray-900 mb-2">
                  Registrar Depósito
                </h3>
                <p className="text-gray-500 text-sm mb-6">Ingresa los detalles del pago recibido en banco.</p>
                <form onSubmit={handleCreateSubmit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Monto $ *</label>
                      <div className="relative">
                        <span className="absolute left-4 top-3.5 text-gray-400 font-bold">$</span>
                        <input required type="number" step="0.01" value={tesoreriaForm.monto} onChange={e => setTesoreriaForm({...tesoreriaForm, monto: e.target.value})} className="w-full pl-8 border-gray-200 bg-gray-50 rounded-xl p-3 border shadow-sm focus:ring-2 focus:ring-gray-900 font-bold text-gray-900" placeholder="0.00" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Banco *</label>
                      <input required type="text" value={tesoreriaForm.banco} onChange={e => setTesoreriaForm({...tesoreriaForm, banco: e.target.value})} className="w-full border-gray-200 bg-gray-50 rounded-xl p-3 border shadow-sm focus:ring-2 focus:ring-gray-900" placeholder="Ej. BBVA" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Fecha del Depósito *</label>
                    <input required type="date" value={tesoreriaForm.fechaPago} onChange={e => setTesoreriaForm({...tesoreriaForm, fechaPago: e.target.value})} className="w-full border-gray-200 bg-gray-50 rounded-xl p-3 border shadow-sm focus:ring-2 focus:ring-gray-900" />
                  </div>
                  
                  <div className="flex gap-4 pt-4 mt-8 border-t border-gray-100">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 rounded-xl bg-white text-gray-700 font-bold hover:bg-gray-100 border border-gray-200 transition-colors">Cancelar</button>
                    <button disabled={loading} type="submit" className="flex-1 py-3.5 rounded-xl bg-gray-900 text-white font-bold hover:bg-black shadow-lg disabled:opacity-50 transition-all">Guardar Depósito</button>
                  </div>
                </form>
              </div>
            )}

            {modalType === "EDIT_EMPRESA_CLIENTE" && (
              <div className="p-8">
                <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                  <span className="text-3xl">🔍</span>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">
                  Identificar Depósito
                </h3>
                <p className="text-gray-500 text-sm mb-6">¿A qué empresa le depositaron y qué cliente lo pagó?</p>
                <form onSubmit={handleEditEmpresaCliente} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Empresa Receptora *</label>
                    <select required value={empresaClienteForm.empresaId} onChange={e => setEmpresaClienteForm({...empresaClienteForm, empresaId: e.target.value})} className="w-full border-gray-200 bg-gray-50 rounded-xl p-3 border shadow-sm focus:ring-2 focus:ring-blue-500">
                      <option value="">-- Seleccionar --</option>
                      {empresasDisponibles.map(e => <option key={e.id} value={e.id}>{e.razonSocial}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Cliente Emisor *</label>
                    <select required value={empresaClienteForm.clienteId} onChange={e => setEmpresaClienteForm({...empresaClienteForm, clienteId: e.target.value})} className="w-full border-gray-200 bg-gray-50 rounded-xl p-3 border shadow-sm focus:ring-2 focus:ring-blue-500">
                      <option value="">-- Seleccionar --</option>
                      {clientesDisponibles.map(c => <option key={c.id} value={c.id}>{c.razonSocial}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-4 pt-4 mt-8 border-t border-gray-100">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 rounded-xl bg-white text-gray-700 font-bold hover:bg-gray-100 border border-gray-200 transition-colors">Cancelar</button>
                    <button disabled={loading} type="submit" className="flex-1 py-3.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg disabled:opacity-50 transition-all">Mover a Etapa 2</button>
                  </div>
                </form>
              </div>
            )}

            {modalType === "ASSIGN_FACTURA" && (
              <div className="p-8">
                <div className="bg-emerald-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                  <span className="text-3xl">🔗</span>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">
                  Vincular Factura
                </h3>
                <p className="text-gray-500 text-sm mb-6">Selecciona la factura emitida correspondiente a este depósito.</p>
                <form onSubmit={handleAssignFactura} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Buscar Factura *</label>
                    <select required value={facturaForm.facturaId} onChange={e => setFacturaForm({...facturaForm, facturaId: e.target.value})} className="w-full border-gray-200 bg-gray-50 rounded-xl p-3 border shadow-sm focus:ring-2 focus:ring-emerald-500 font-medium">
                      <option value="">-- Seleccionar Factura --</option>
                      {facturasDisponibles.map(f => (
                        <option key={f.id} value={f.id}>
                          Folio: {f.folio || 'S/F'} | {f.cliente?.razonSocial?.substring(0, 20)}... | ${f.total?.toLocaleString("es-MX")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-4 pt-4 mt-8 border-t border-gray-100">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 rounded-xl bg-white text-gray-700 font-bold hover:bg-gray-100 border border-gray-200 transition-colors">Cancelar</button>
                    <button disabled={loading} type="submit" className="flex-1 py-3.5 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 shadow-lg disabled:opacity-50 transition-all">Conciliar (Etapa 3)</button>
                  </div>
                </form>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
