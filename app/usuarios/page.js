import Link from 'next/link';
import { getUsuarios } from './acciones';
import DeleteUserBtn from './DeleteUserBtn';

export const dynamic = 'force-dynamic';

export default async function UsuariosPage() {
  const usuarios = await getUsuarios();
  
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>🔑 Administración de Usuarios y Accesos</h2>
        <Link href="/usuarios/nuevo" className="btn">+ Nuevo Usuario</Link>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo Electrónico</th>
              <th>Permisos (Módulos)</th>
              <th>Empresas Asignadas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center' }}>No hay usuarios creados aún.</td></tr>
            ) : usuarios.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 'bold' }}>{u.nombre}</td>
                <td>{u.correo}</td>
                <td style={{ fontSize: '13px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {u.permisoEmpresas && <span className="badge">🏢 Empresas</span>}
                  {u.permisoClientes && <span className="badge">👥 Clientes</span>}
                  {u.permisoProductos && <span className="badge">📦 Catálogos</span>}
                  {u.permisoFacturas && <span className="badge">🧾 Facturas</span>}
                  {u.permisoReportes && <span className="badge">📊 Reportes</span>}
                  {u.permisoUsuarios && <span className="badge">🔑 Usuarios</span>}
                </td>
                <td style={{ fontSize: '13px' }}>
                  {u.empresas?.length > 0 ? (
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                       {u.empresas.map(emp => <span key={emp.id} className="badge" style={{ backgroundColor: '#2f3b52' }}>{emp.razonSocial}</span>)}
                    </div>
                  ) : <span style={{ color: '#888' }}>Todas (Sin Restricción)</span>}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Link href={`/usuarios/editar/${u.id}`} className="btn" style={{ background: '#0ea5e9', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}>
                      ✏️ Editar
                    </Link>
                    <DeleteUserBtn id={u.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
