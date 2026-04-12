import './globals.css'
import Link from 'next/link'

export const metadata = {
  title: 'CFDI Multi-tenant Premium',
  description: 'SaaS - Sistema de Facturación Electrónica',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <div className="layout-wrapper">
          <aside className="sidebar">
            <div className="sidebar-logo">
              <span>⚡</span> CFDI SaaS
            </div>
            <nav className="nav-links">
              <Link href="/" className="nav-link">⊞ Panel Principal</Link>
              <Link href="/empresas" className="nav-link">🏢 Emisores (Tenants)</Link>
              <Link href="/clientes" className="nav-link">👥 Directorio Clientes</Link>
              <Link href="/productos" className="nav-link">📦 Catálogo SAT</Link>
              <Link href="/facturas" className="nav-link">🧾 Facturación</Link>
            </nav>
            
            <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <p>v2.0 Premium Edition</p>
              <p>Motor: Facturapi (México)</p>
            </div>
          </aside>
          
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
