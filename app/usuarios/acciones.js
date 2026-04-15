'use server'

import prisma from '../../lib/prisma'
import bcrypt from 'bcryptjs'

export async function getUsuarios() {
  return await prisma.usuario.findMany({
    orderBy: { createdAt: 'desc' },
    include: { empresas: true }
  });
}

export async function getEmpresasResumen() {
  return await prisma.empresa.findMany({
    select: { id: true, razonSocial: true },
    orderBy: { razonSocial: 'asc' }
  });
}

export async function getUsuario(id) {
  return await prisma.usuario.findUnique({
    where: { id },
    include: { empresas: true }
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
        permisoUsuarios: !!data.permisoUsuarios,
        permisoAsignacionClientes: !!data.permisoAsignacionClientes,
        empresas: data.empresaIds && data.empresaIds.length > 0 
          ? { connect: data.empresaIds.map(id => ({ id })) } 
          : undefined
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

export async function actualizarUsuario(id, data) {
  try {
    const updateData = {
      nombre: data.nombre,
      correo: data.correo,
      permisoEmpresas: !!data.permisoEmpresas,
      permisoClientes: !!data.permisoClientes,
      permisoProductos: !!data.permisoProductos,
      permisoFacturas: !!data.permisoFacturas,
      permisoReportes: !!data.permisoReportes,
      permisoUsuarios: !!data.permisoUsuarios,
      permisoAsignacionClientes: !!data.permisoAsignacionClientes,
    };

    if (data.password && data.password.trim() !== '') {
      const salt = bcrypt.genSaltSync(10);
      updateData.passwordHash = bcrypt.hashSync(data.password, salt);
    }

    if (data.empresaIds !== undefined) {
      updateData.empresas = { set: data.empresaIds.map(eId => ({ id: eId })) };
    }

    await prisma.usuario.update({
      where: { id },
      data: updateData
    });
    return { success: true };
  } catch (err) {
    if (err.code === 'P2002') return { success: false, error: "Este correo pertenece a otro usuario." };
    return { success: false, error: err.message };
  }
}
