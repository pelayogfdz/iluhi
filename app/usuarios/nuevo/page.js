'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { crearUsuario, getEmpresasResumen, getClientesResumen } from '../acciones'

export default function NuevoUsuarioPage() {
  const router = useRouter()
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    password: '',
    permisoEmpresas: false,
    permisoClientes: false,
    permisoProductos: false,
    permisoFacturas: false,
    permisoReportes: false,
    permisoUsuarios: false,
    permisoAsignacionClientes: false,
    permisoEliminarEmpresas: false,
    permisoTesoreria: false,
    permisoOperaciones: false,
    empresaIds: [],
    clienteIds: []
  })

  const [empresasBase, setEmpresasBase] = useState([])
  const [clientesBase, setClientesBase] = useState([])

  useEffect(() => {
    async function init() {
      const emp = await getEmpresasResumen();
      setEmpresasBase(emp);
      
      const cli = await getClientesResumen();
      setClientesBase(cli);
    }
    init();
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError(null);
    
    const result = await crearUsuario(formData);
    if (result.success) {
      router.push('/usuarios');
      router.refresh();
    } else {
      setError(result.error);
      setCargando(false);
    }
  }

  return (
    <div className="fade-in glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Añadir Nuevo Usuario</h2>
      
      {error && <div style={{ background: 'rgba(255,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="form-group">
          <label>Nombre Completo</label>
          <input required type="text" name="nombre" value={formData.nombre} onChange={handleChange} className="form-control" />
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Correo de Acceso</label>
            <input required type="email" name="correo" value={formData.correo} onChange={handleChange} className="form-control" />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Contraseña</label>
            <input required type="password" name="password" value={formData.password} onChange={handleChange} className="form-control" />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ color: 'var(--primary)', marginTop: '1rem' }}>Asignación de Empresas (Tenants)</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Selecciona las empresas a las que este usuario tendrá acceso:</p>
          </div>
          <button 
             type="button" 
             className="btn btn-secondary" 
             style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}
             onClick={() => setFormData(prev => ({ ...prev, empresaIds: empresasBase.map(e => e.id) }))}
          >
             Seleccionar Todas
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto' }}>
          {empresasBase.map((emp) => (
            <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input 
                 type="checkbox" 
                 checked={formData.empresaIds.includes(emp.id)}
                 onChange={(e) => {
                   if(e.target.checked) setFormData({ ...formData, empresaIds: [...formData.empresaIds, emp.id] });
                   else setFormData({ ...formData, empresaIds: formData.empresaIds.filter(id => id !== emp.id) });
                 }}
              /> 
              {emp.razonSocial}
            </label>
          ))}
          {empresasBase.length === 0 && <p style={{ gridColumn: '1 / -1', color: '#666' }}>No hay empresas registradas.</p>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: '1rem' }}>
          <div>
            <h3 style={{ color: 'var(--primary)', marginTop: '1rem' }}>Asignación de Clientes (CRM)</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Selecciona los clientes a los que este usuario tendrá acceso:</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
               type="button" 
               className="btn btn-secondary" 
               style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}
               onClick={() => setFormData(prev => ({ ...prev, clienteIds: clientesBase.map(c => c.id) }))}
            >
               Seleccionar Todos
            </button>
            <button 
               type="button" 
               className="btn btn-secondary" 
               style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}
               onClick={() => setFormData(prev => ({ ...prev, clienteIds: [] }))}
            >
               Ninguno
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto' }}>
          {clientesBase.map((cli) => (
            <label key={cli.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input 
                 type="checkbox" 
                 checked={formData.clienteIds.includes(cli.id)}
                 onChange={(e) => {
                   if(e.target.checked) setFormData({ ...formData, clienteIds: [...formData.clienteIds, cli.id] });
                   else setFormData({ ...formData, clienteIds: formData.clienteIds.filter(id => id !== cli.id) });
                 }}
              /> 
              {cli.razonSocial}
            </label>
          ))}
          {clientesBase.length === 0 && <p style={{ gridColumn: '1 / -1', color: '#666' }}>No hay clientes registrados.</p>}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
        
        <h3 style={{ color: 'var(--primary)' }}>Permisos de Módulos (Palomitas)</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" name="permisoEmpresas" checked={formData.permisoEmpresas} onChange={handleChange} /> 🏢 Empleados / Empresas
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" name="permisoClientes" checked={formData.permisoClientes} onChange={handleChange} /> 👥 Base de Clientes
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" name="permisoProductos" checked={formData.permisoProductos} onChange={handleChange} /> 📦 Catálogo de Productos
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" name="permisoFacturas" checked={formData.permisoFacturas} onChange={handleChange} /> 🧾 Operación: Facturación
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" name="permisoReportes" checked={formData.permisoReportes} onChange={handleChange} /> 📊 Analítica y Reportes
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" name="permisoUsuarios" checked={formData.permisoUsuarios} onChange={handleChange} /> 🔑 Seguridad y Usuarios
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" name="permisoAsignacionClientes" checked={formData.permisoAsignacionClientes} onChange={handleChange} /> 🤝 Asignación de Clientes
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#ef4444' }}>
            <input type="checkbox" name="permisoEliminarEmpresas" checked={formData.permisoEliminarEmpresas} onChange={handleChange} /> 🗑️ Eliminar Empresas
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#3b82f6' }}>
            <input type="checkbox" name="permisoTesoreria" checked={formData.permisoTesoreria} onChange={handleChange} /> 💼 Tesorería (Flujo de Trabajo)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#10b981' }}>
            <input type="checkbox" name="permisoOperaciones" checked={formData.permisoOperaciones} onChange={handleChange} /> 🖱️ Operaciones (Flujo de Trabajo)
          </label>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button type="submit" disabled={cargando} className="btn" style={{ flex: 1 }}>{cargando ? 'Salvando...' : 'Guardar Autorización'}</button>
          <Link href="/usuarios" className="btn btn-secondary" style={{ flex: 1, textDecoration: 'none' }}>Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
