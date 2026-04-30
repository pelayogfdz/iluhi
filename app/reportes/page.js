import prisma from '../../lib/prisma';
import { getSessionUser } from '../../lib/auth';
import ReportesClient from './ReportesClient';

export const dynamic = 'force-dynamic';

export default async function ReportesPage() {
  const user = await getSessionUser();
  const rpEmpresas = user?.empresasIds?.length > 0 ? { id: { in: user.empresasIds } } : {};

  // Cargar catálogos base para los filtros (Empresas a las que el usuario tiene acceso)
  const empresasRaw = await prisma.empresa.findMany({ 
    where: rpEmpresas, 
    select: { id: true, razonSocial: true },
    orderBy: { razonSocial: 'asc' }
  });
  
  // Cargar clientes a los que el usuario tiene acceso
  // Si el usuario es admin global o tiene permisos especiales, vería todos. Si no, solo los suyos.
  const rpClientes = (user?.permisoAsignacionClientes) ? {} : { usuariosAsignados: { some: { id: user?.id } } };
  const clientesRaw = await prisma.cliente.findMany({
    where: rpClientes,
    select: { id: true, razonSocial: true },
    orderBy: { razonSocial: 'asc' }
  });

  return <ReportesClient empresas={empresasRaw} clientes={clientesRaw} />;
}
