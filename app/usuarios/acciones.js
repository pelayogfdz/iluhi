'use server'

import prisma from '../../lib/prisma'
import bcrypt from 'bcryptjs'

export async function getUsuarios() {
  return await prisma.usuario.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

export async function crearUsuario(data) {
  try {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(data.password, salt);
    
    await prisma.usuario.create({
      data: {
        nombre: data.nombre,
        correo: data.correo,
        passwordHash: hash,
        permisoEmpresas: !!data.permisoEmpresas,
        permisoClientes: !!data.permisoClientes,
        permisoProductos: !!data.permisoProductos,
        permisoFacturas: !!data.permisoFacturas,
        permisoReportes: !!data.permisoReportes,
        permisoUsuarios: !!data.permisoUsuarios
      }
    });
    return { success: true };
  } catch (err) {
    if (err.code === 'P2002') return { success: false, error: "Este correo ya está registrado." }
    return { success: false, error: err.message };
  }
}

export async function eliminarUsuario(id) {
  try {
    await prisma.usuario.delete({ where: { id } });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
