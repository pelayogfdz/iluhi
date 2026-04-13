const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync('admin123', salt);
  
  // Clean up if it exists to avoid unique constraint 
  try { await prisma.usuario.delete({where: {correo: 'admin@facturas.com'}}) } catch(e){}

  await prisma.usuario.create({
    data: {
      nombre: 'Administrador Maestro',
      correo: 'admin@facturas.com',
      passwordHash: hash,
      permisoEmpresas: true,
      permisoClientes: true,
      permisoProductos: true,
      permisoFacturas: true,
      permisoReportes: true,
      permisoUsuarios: true
    }
  })
  console.log("Admin user seeded!")
}
main()
