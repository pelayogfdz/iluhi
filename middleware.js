import { NextResponse } from 'next/server'
import { decrypt } from './lib/auth'

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Excluir APIs, archivos estáticos o favicon
  if (pathname.startsWith('/api/') || pathname.match(/\.(.*)$/)) {
    return NextResponse.next()
  }

  // Rutas públicas que no requieren autenticación
  const isPublicRoute = 
    pathname === '/' || 
    pathname.startsWith('/arrendadora') || 
    pathname.startsWith('/login') || 
    pathname.startsWith('/registro')

  const sessionCookie = request.cookies.get('session')?.value

  // Si es ruta pública y no es /login, permitir acceso inmediato
  if (isPublicRoute && !pathname.startsWith('/login')) {
    return NextResponse.next()
  }

  // Si no está autenticado y trata de entrar a un panel administrativo/facturación protegido
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Si ya está autenticado e intenta ir al login, mandar al dashboard de facturación
  if (pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  const parsed = await decrypt(sessionCookie);
  if (!parsed) {
    const res = NextResponse.redirect(new URL('/login', request.url))
    res.cookies.delete('session')
    return res;
  }

    // Permisos internos para el SaaS de facturación
    if (pathname.startsWith('/empresas') && !parsed.permisoEmpresas) return NextResponse.redirect(new URL('/dashboard', request.url))
    if (pathname.startsWith('/clientes') && !parsed.permisoClientes) return NextResponse.redirect(new URL('/dashboard', request.url))
    if (pathname.startsWith('/productos') && !parsed.permisoProductos) return NextResponse.redirect(new URL('/dashboard', request.url))
    if (pathname.startsWith('/facturas') && !parsed.permisoFacturas) return NextResponse.redirect(new URL('/dashboard', request.url))
    if (pathname.startsWith('/reportes') && !parsed.permisoReportes) return NextResponse.redirect(new URL('/dashboard', request.url))
    if (pathname.startsWith('/usuarios') && !parsed.permisoUsuarios) return NextResponse.redirect(new URL('/dashboard', request.url))

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
