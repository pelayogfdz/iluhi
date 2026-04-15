'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { actualizarUsuario, getEmpresasResumen, getUsuario } from '../../acciones'

export default function EditarUsuarioPage() {
  const router = useRouter()
  const params = useParams()
  const [cargando, setCargando] = useState(false)
  const [cargandoInit, setCargandoInit] = useState(true)
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
    empresaIds: []
  })

  const [empresasBase, setEmpresasBase] = useState([])

  useEffect(() => {
    async function init() {
      // Fetch both companies and the selected user
      const emp = await getEmpresasResumen();
      setEmpresasBase(emp);

      if (params.id) {
        const u = await getUsuario(params.id);
        if (u) {
          setFormData({
            nombre: u.nombre || '',
            correo: u.correo || '',
            password: '', // Leave empty unless they want to change it
            permisoEmpresas: !!u.permisoEmpresas,
            permisoClientes: !!u.permisoClientes,
            permisoProductos: !!u.permisoProductos,
            permisoFacturas: !!u.permisoFacturas,
            permisoReportes: !!u.permisoReportes,
            permisoUsuarios: !!u.permisoUsuarios,
            empresaIds: u.empresas ? u.empresas.map(e => e.id) : []
          })
        }
      }
      setCargandoInit(false);
    }
    
    init();
  }, [params.id])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError(null);
    
    const result = await actualizarUsuario(params.id, formData);
    if (result.success) {
      router.push('/usuarios');
      router.refresh();
    } else {
      setError(result.error);
      setCargando(false);
    }
  }

  if (cargandoInit) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando información del usuario...</div>
  }

  return (
    <div className="fade-in glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>✏️ Editar Usuario</h2>
      
      {error && <div style={{ background: 'rgba(255,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="form-group">
          <label>Nombre Completo</label>
          <input required type="text" name="nombre" value={formData.nombre} onChange={handleChange} className="form-control" />
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
            <label>Correo de Acceso</label>
            <input required type="email" name="correo" value={formData.correo} onChange={handleChange} className="form-control" />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
            <label>Nueva Contraseña (Opcional)</label>
            <input 
              type="password" 
              name="password" 
              value={formData.password} 
              onChange={handleChange} 
              className="form-control" 
              placeholder="Dejar vacío para no cambiar"
            />
          </div>
        </div>

        <h3 style={{ color: 'var(--primary)', marginTop: '1rem' }}>Asignación de Empresas (Tenants)</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Selecciona las empresas a las que este usuario tendrá acceso:</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto' }}>
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

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
        
        <h3 style={{ color: 'var(--primary)' }}>Permisos de Módulos (Palomitas)</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '8px' }}>
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
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button type="submit" disabled={cargando} className="btn" style={{ flex: 1, minHeight: '44px' }}>{cargando ? 'Salvando...' : 'Actualizar Usuario'}</button>
          <Link href="/usuarios" className="btn btn-secondary" style={{ flex: 1, textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '44px' }}>Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
