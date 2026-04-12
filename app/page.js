import Link from 'next/link'

export default function Dashboard() {
  return (
    <div>
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>Bienvenido al Hub Central</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Plataforma SaaS Multi-tenant de Emisión CFDI 4.0</p>
      </header>

      <h2>Accesos Rápidos</h2>
      <div className="dashboard-grid">
        
        <Link href="/facturas/nuevo" className="glass-panel card">
          <h3>
            Emitir Nueva Factura 
            <span style={{ fontSize: '1.5rem' }}>↗</span>
          </h3>
          <p style={{ marginTop: '0.5rem' }}>Abre el motor de ensamble para crear un CFDI 4.0 al vuelo.</p>
        </Link>
        
        <Link href="/empresas" className="glass-panel card">
          <h3>
            Emisores (Tenants) 
            <span style={{ fontSize: '1.5rem' }}>↗</span>
          </h3>
          <p style={{ marginTop: '0.5rem' }}>Gestiona las empresas que usan tu SaaS para timbrar.</p>
        </Link>
        
        <Link href="/clientes" className="glass-panel card">
          <h3>
            Receptores 
            <span style={{ fontSize: '1.5rem' }}>↗</span>
          </h3>
          <p style={{ marginTop: '0.5rem' }}>Directorio masivo de clientes a los cuales se les cobra.</p>
        </Link>
        
        <Link href="/productos" className="glass-panel card">
          <h3>
            Catálogo SAT 
            <span style={{ fontSize: '1.5rem' }}>↗</span>
          </h3>
          <p style={{ marginTop: '0.5rem' }}>Agrega productos y empareja claves predictivas.</p>
        </Link>

      </div>

      <div className="glass-panel" style={{ marginTop: '3rem', border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.05)' }}>
        <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>Estado del Motor de Timbrado (PAC)</h3>
        <p>
          La estructura Lógica hacia Facturapi está completada al 100%. El sistema está configurado en 
          <span style={{ color: 'yellow', marginLeft: '5px', fontWeight: 'bold' }}>MODO PRUEBAS (Sandbox Dummy)</span>.
          Para empezar a timbrar verdaderamente en el SAT, actualiza tu SDK con tu Secret Text Privado.
        </p>
      </div>

    </div>
  )
}
