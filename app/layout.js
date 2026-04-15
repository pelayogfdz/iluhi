import './globals.css'
import Link from 'next/link'

export const metadata = {
  title: 'CFDI Multi-tenant Premium',
  description: 'SaaS - Sistema de Facturación Electrónica',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
}

import { cookies } from 'next/headers'
import { decrypt } from '../lib/auth'
import CronPinger from './components/CronPinger'
import Sidebar from './components/Sidebar'

export default async function RootLayout({ children }) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value
  const user = sessionCookie ? await decrypt(sessionCookie) : null;

  async function doLogout() {
    'use server';
    const cs = await cookies();
    cs.delete('session');
  }

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
            <Sidebar user={user} doLogout={doLogout} />
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
