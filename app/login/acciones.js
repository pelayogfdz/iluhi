'use server'

import prisma from '../../lib/prisma'
import bcrypt from 'bcryptjs'
import { encrypt } from '../../lib/auth'
import { cookies } from 'next/headers'

export async function loginUser(correo, password) {
  try {
    const user = await prisma.usuario.findUnique({ 
      where: { correo },
      include: {
        empresas: {
          select: { id: true }
        }
      }
    })
    if (!user) return { success: false, error: 'Credenciales inválidas' }

    const match = bcrypt.compareSync(password, user.passwordHash)
    if (!match) return { success: false, error: 'Credenciales inválidas' }

    // Payload para JWT
    const parsedUser = {
      id: user.id,
      nombre: user.nombre,
      correo: user.correo,
      permisoEmpresas: user.permisoEmpresas,
      permisoClientes: user.permisoClientes,
      permisoProductos: user.permisoProductos,
      permisoFacturas: user.permisoFacturas,
      permisoReportes: user.permisoReportes,
      permisoUsuarios: user.permisoUsuarios,
      permisoAsignacionClientes: user.permisoAsignacionClientes,
      empresasIds: user.empresas.map(e => e.id)
    }

    const sessionData = await encrypt(parsedUser);
    
    const cookieStore = await cookies();
    cookieStore.set('session', sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 10 // 10 horas
    });

    return { success: true }
  } catch(err) {
    return { success: false, error: err.message }
  }
}
