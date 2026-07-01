import prisma from '../../lib/prisma';
import { getSessionUser } from '../../lib/auth';
import { redirect } from 'next/navigation';
import OperacionesClient from './OperacionesClient';
import { obtenerOperaciones } from './acciones';

export const dynamic = 'force-dynamic';

export default async function OperacionesPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  if (!user.permisoFacturas) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
        <h2>No autorizado</h2>
        <p>No tienes los permisos necesarios para acceder al Panel de Operaciones.</p>
      </div>
    );
  }

  const res = await obtenerOperaciones();
  const operaciones = res.success ? res.operaciones : [];

  return (
    <OperacionesClient 
      user={user} 
      operacionesIniciales={operaciones} 
    />
  );
}
