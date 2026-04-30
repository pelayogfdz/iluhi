import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const facs = await prisma.factura.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      uuid: true,
      estatus: true,
      total: true,
      cliente: {
        select: { razonSocial: true }
      }
    }
  })
  
  console.log(JSON.stringify(facs, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
