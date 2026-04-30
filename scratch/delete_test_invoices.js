import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const idsToDelete = [
    "b53dbe63-f14d-4cfd-9f32-7a360a032de0",
    "05757ecd-3958-42af-91ba-7975b493a465",
    "008e8c11-f95c-4ad1-996f-f2914468a11f"
  ];
  
  const result = await prisma.factura.deleteMany({
    where: {
      id: {
        in: idsToDelete
      }
    }
  });
  
  console.log(`Deleted ${result.count} test invoices.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
