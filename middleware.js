import { NextResponse } from 'next/server'
import { decrypt } from './lib/auth'

export async function middleware(request) {
  // Excluir protección para el propio script de cron o webhooks si existieran
  if (request.nextUrl.pathname.startsWith('/api/') || request.nextUrl.pathname.match(/\.(.*)$/)) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get('session')?.value

  if (!sessionCookie && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (sessionCookie && request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (sessionCookie) {
     const parsed = await decrypt(sessionCookie);
     if (!parsed) {
       const res = NextResponse.redirect(new URL('/login', request.url))
       res.cookies.delete('session')
       return res;
     }

     // Lógica visual de bloqueo cruzado de módulos basada en los permisos del Payload
     const p = request.nextUrl.pathname
     if (p.startsWith('/empresas') && !parsed.permisoEmpresas) return NextResponse.redirect(new URL('/', request.url))
     if (p.startsWith('/clientes') && !parsed.permisoClientes) return NextResponse.redirect(new URL('/', request.url))
     if (p.startsWith('/productos') && !parsed.permisoProductos) return NextResponse.redirect(new URL('/', request.url))
     if (p.startsWith('/facturas') && !parsed.permisoFacturas) return NextResponse.redirect(new URL('/', request.url))
     if (p.startsWith('/reportes') && !parsed.permisoReportes) return NextResponse.redirect(new URL('/', request.url))
     if (p.startsWith('/usuarios') && !parsed.permisoUsuarios) return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
