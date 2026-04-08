export default function Home() {
  return (
    <div>
      <h1>Dashboard Principal</h1>
      
      <div className="glass-panel">
        <h3>Bienvenido al Sistema de Facturación Multi-Empresa</h3>
        <p style={{marginTop: '1rem', color: 'var(--text-secondary)'}}>
          Este portal está diseñado bajo la arquitectura Next.js para gestionar múltiples razones sociales, catálogos de CFDI 4.0 y la emisión de facturas electrónicas.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div className="glass-panel">
          <h3>Estadísticas Rápidas</h3>
          <p style={{marginTop: '1rem'}}>Empresas Registradas: 0</p>
          <p>Facturas Emitidas Hoy: 0</p>
        </div>
        <div className="glass-panel">
          <h3>Accesos Rápidos</h3>
          <div style={{marginTop: '1rem', display: 'flex', gap: '1rem' }}>
             <button className="btn">Alta de Empresa</button>
             <button className="btn">Nueva Factura</button>
          </div>
        </div>
      </div>
    </div>
  );
}
