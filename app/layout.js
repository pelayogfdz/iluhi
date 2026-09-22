import './globals.css'
import { cookies, headers } from 'next/headers'
import { decrypt } from '../lib/auth'
import CronPinger from './components/CronPinger'
import Sidebar from './components/Sidebar'
import LogoAlert from './components/LogoAlert'

export const metadata = {
  title: 'AXIS POINT | Arrendamiento Puro y Financiero de Flotillas y Equipo',
  description: 'Soluciones corporativas de arrendamiento vehicular, maquinaria y flotillas comerciales en México. Deducibilidad fiscal y liquidez operativa.',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
}

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
        <link rel="icon" href="/axispoint-logo.jpg" />
      </head>
      <body>
        <CronPinger />
        {!user ? (
          <main style={{ width: '100%', minHeight: '100vh', margin: 0, padding: 0 }}>{children}</main>
        ) : (
          <div className="layout-wrapper">
            <Sidebar user={user} doLogout={doLogout} />
            <main className="main-content">
              <LogoAlert />
              {children}
            </main>
          </div>
        )}
      </body>
    </html>
  )
}
