import './globals.css'
import Link from 'next/link'

export const metadata = {
  title: 'CFDI Multi-tenant Premium',
  description: 'SaaS - Sistema de Facturación Electrónica',
}

import { cookies } from 'next/headers'
import { decrypt } from '../lib/auth'
import CronPinger from './components/CronPinger'

export default async function RootLayout({ children }) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value
  const user = sessionCookie ? await decrypt(sessionCookie) : null;

  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <CronPinger />
        {!user ? (
          <main style={{ width: '100%', height: '100%' }}>{children}</main>
        ) : (
          <div className="layout-wrapper">
            <aside className="sidebar">
              <div className="sidebar-logo">
                <span>⚡</span> CFDI SaaS
              </div>
              
              {user.permisoFacturas && (
                <div style={{ padding: '0 1.2rem 1.2rem 1.2rem' }}>
                  <Link href="/facturas/nuevo" style={{
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
                  }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>➕</span>
                    Emitir Factura
                  </Link>
                </div>
              )}

              <nav className="nav-links">
                <Link href="/" className="nav-link">⊞ Panel Principal</Link>
                {user.permisoEmpresas && <Link href="/empresas" className="nav-link">🏢 Empresas</Link>}
                {user.permisoClientes && <Link href="/clientes" className="nav-link">👥 Clientes</Link>}
                {user.permisoProductos && <Link href="/productos" className="nav-link">📦 Catálogo de Productos</Link>}
                {user.permisoFacturas && <Link href="/facturas" className="nav-link">🧾 Facturas</Link>}
                {user.permisoUsuarios && <Link href="/usuarios" className="nav-link">🔑 Usuarios</Link>}
                {user.permisoReportes && <Link href="/reportes" className="nav-link">📊 Reportes</Link>}
              </nav>
              
              <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '13px' }}>
                <p style={{ fontWeight: 'bold', color: 'var(--accent)' }}>Hola, {user.nombre.split(' ')[0]}</p>
                <form action={async () => {
                   'use server';
                   const cookieStore = await cookies();
                   cookieStore.delete('session');
                }}>
                  <button type="submit" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', width: '100%', padding: '0.5rem', borderRadius: '4px', marginTop: '0.8rem', cursor: 'pointer' }}>Cerrar Sesión</button>
                </form>
              </div>
            </aside>
            
            <main className="main-content">
              {children}
            </main>
          </div>
        )}
      </body>
    </html>
  )
}
// Forzar recarga Next.js Cache
