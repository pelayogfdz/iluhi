import prisma from '../../lib/prisma';

export const dynamic = 'force-dynamic';

import { getSessionUser } from '../../lib/auth';

export default async function ReportesPage() {
  const user = await getSessionUser();
  const rpFacturas = user?.empresasIds?.length > 0 ? { empresaId: { in: user.empresasIds } } : {};
  const rpEmpresas = user?.empresasIds?.length > 0 ? { id: { in: user.empresasIds } } : {};

  const facturas = await prisma.factura.findMany({ where: rpFacturas, select: { total: true } });
  const clientes = await prisma.cliente.count();
  const empresas = await prisma.empresa.count({ where: rpEmpresas });
  const usuarios = await prisma.usuario.count();

  const ventasGlobales = facturas.reduce((acc, curr) => acc + curr.total, 0);
  const facturasGeneradas = facturas.length;

  return (
    <div className="fade-in">
      <h2 style={{ color: 'var(--primary)', marginBottom: '2rem' }}>📊 Métricas Maestras y Reportes</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <h4 style={{ color: 'var(--text-secondary)' }}>Ventas Históricas Globales</h4>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)', marginTop: '0.5rem' }}>
            ${ventasGlobales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <h4 style={{ color: 'var(--text-secondary)' }}>Facturas Timbradas</h4>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00ff88', marginTop: '0.5rem' }}>
            {facturasGeneradas}
          </div>
        </div>

        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <h4 style={{ color: 'var(--text-secondary)' }}>Directorio de Clientes</h4>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffb300', marginTop: '0.5rem' }}>
            {clientes}
          </div>
        </div>

      </div>

      <div className="glass-panel">
         <h3>Resumen Estructural del SaaS</h3>
         <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '1rem 0' }} />
         <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
           <li>🏢 Operando bajo <strong>{empresas}</strong> empresas matrices diferentes.</li>
           <li>🔑 Administrado por <strong>{usuarios}</strong> usuarios de sistema con permisos granulares.</li>
         </ul>
      </div>
    </div>
  )
}
