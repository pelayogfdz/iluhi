'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Sidebar({ user, doLogout }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleLogout = async (e) => {
    e.preventDefault()
    await doLogout()
  }

  const closeMenu = () => setOpen(false)

  return (
    <>
      {/* Mobile Top Navbar */}
      <div className="mobile-nav" style={{
        display: 'none', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '60px', 
        background: 'rgba(15, 18, 25, 0.95)', 
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border-light)',
        padding: '0 1rem',
        zIndex: 2000
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#fff' }}>
          <span style={{ color: 'var(--primary)' }}>⚡</span> CFDI SaaS
        </div>
        <button 
          onClick={() => setOpen(!open)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            fontSize: '1.5rem',
            cursor: 'pointer',
            padding: '0.5rem'
          }}
        >
          {open ? '✖' : '☰'}
        </button>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-nav {
            display: flex !important;
          }
        }
      `}</style>

      {/* Actual Sidebar */}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <span>⚡</span> CFDI SaaS
        </div>
        
        {user.permisoFacturas && (
          <div style={{ padding: '0 1.2rem 1.2rem 1.2rem' }}>
            <Link href="/facturas/nuevo" onClick={closeMenu} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              background: 'var(--accent)',
              color: '#000',
              fontWeight: 'bold',
              padding: '0.75rem',
              borderRadius: '8px',
              textDecoration: 'none',
              boxShadow: '0 4px 15px rgba(0, 255, 136, 0.2)',
              transition: 'all 0.2s ease',
              fontSize: '0.95rem'
            }}>
              <span style={{ fontSize: '1.2rem' }}>➕</span>
              Emitir Factura
            </Link>
          </div>
        )}

        <nav className="nav-links">
          <Link href="/" className="nav-link" onClick={closeMenu}>⊞ Panel Principal</Link>
          {user.permisoEmpresas && <Link href="/empresas" className="nav-link" onClick={closeMenu}>🏢 Empresas</Link>}
          {user.permisoClientes && <Link href="/clientes" className="nav-link" onClick={closeMenu}>👥 Clientes</Link>}
          {user.permisoProductos && <Link href="/productos" className="nav-link" onClick={closeMenu}>📦 Catálogo de Productos</Link>}
          {user.permisoFacturas && <Link href="/facturas" className="nav-link" onClick={closeMenu}>🧾 Facturas</Link>}
          {user.permisoUsuarios && <Link href="/usuarios" className="nav-link" onClick={closeMenu}>🔑 Usuarios</Link>}
          {user.permisoReportes && <Link href="/reportes" className="nav-link" onClick={closeMenu}>📊 Reportes</Link>}
          {user.permisoEmpresas && <Link href="/descargas-sat" className="nav-link" onClick={closeMenu}>📥 Descargas SAT</Link>}
        </nav>
        
        <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '13px' }}>
          <p style={{ fontWeight: 'bold', color: 'var(--accent)' }}>Hola, {user.nombre.split(' ')[0]}</p>
          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', width: '100%', padding: '0.5rem', borderRadius: '4px', marginTop: '0.8rem', cursor: 'pointer' }}>
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  )
}
