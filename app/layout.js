import './globals.css'
import Link from 'next/link'

export const metadata = {
  title: 'CFDI Multi-tenant',
  description: 'Sistema de Facturación Electrónica',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <aside className="sidebar">
          <h2>Factura CFDI</h2>
          <nav className="nav-links">
            <Link href="/" className="nav-link">Dashboard</Link>
            <Link href="/empresas" className="nav-link">Empresas</Link>
            <Link href="/clientes" className="nav-link">Clientes</Link>
            <Link href="/productos" className="nav-link">Productos</Link>
            <Link href="/facturas" className="nav-link">Facturas</Link>
          </nav>
        </aside>
        <main className="main-content">
          {children}
        </main>
      </body>
    </html>
  )
}
