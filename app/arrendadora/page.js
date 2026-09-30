'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import './arrendadora.css';

// 6 Paquetes y Líneas de Arrendamiento Institucional AXISPOINT
const PAQUETES_ARRENDAMIENTO = [
  {
    id: 'vehicular',
    titulo: 'Arrendamiento Vehicular & Flotillas',
    badge: 'Flotillas & Ejecutivos',
    icono: '🚗',
    imagen: '/assets/fleet-vehicles.jpg',
    descripcion: 'Estructuración de flotillas comerciales, unidades de reparto, pick-ups de trabajo y vehículos ejecutivos/híbridos con gestión integral incluida.',
    activos: ['Sedanes ejecutivos y SUVs directivas', 'Pick-ups 4x4 y vehículos de trabajo', 'Vans de carga y reparto última milla', 'Híbridos y Eléctricos (Tope fiscal ampliado)'],
    beneficioFiscal: '100% deducible de ISR e IVA como gasto de operación directa.',
    montoReferencia: 850000
  },
  {
    id: 'maquinaria',
    titulo: 'Maquinaria Pesada, Construcción & Agro',
    badge: 'Industria & Obra',
    icono: '🚜',
    imagen: '/assets/industrial-plant.jpg',
    descripcion: 'Equipamiento de alto rendimiento para proyectos de infraestructura, minería, construcción y sector agropecuario sin descapitalización.',
    activos: ['Excavadoras de oruga y retroexcavadoras', 'Tractocamiones y equipo de arrastre pesado', 'Tractores agrícolas e implementos', 'Montacargas y grúas industriales'],
    beneficioFiscal: 'Deducción total sin tope al considerarse activo de producción indispensable.',
    montoReferencia: 2800000
  },
  {
    id: 'ti-computo',
    titulo: 'Tecnología, TI & Equipo de Cómputo',
    badge: 'Cero Obsolescencia',
    icono: '💻',
    imagen: '/assets/datacenter-servers.jpg',
    descripcion: 'Modernice la infraestructura tecnológica de su empresa cada 24 a 36 meses con renovación continua de hardware y licencias.',
    activos: ['Servidores de alta densidad y Centros de Datos', 'Laptops y estaciones de trabajo corporativas', 'Switches, routers y redes empresariales Cisco', 'Sistemas de almacenamiento y telecomunicaciones'],
    beneficioFiscal: 'Conversión de CAPEX a OPEX con deducción inmediata del 100%.',
    montoReferencia: 650000
  },
  {
    id: 'oficina-mobiliario',
    titulo: 'Mobiliario, Oficinas & Adecuaciones',
    badge: 'Sedes Corporativas',
    icono: '🏢',
    imagen: '/assets/corporate-boardroom.jpg',
    descripcion: 'Habilitación completa de oficinas, plantas y espacios de trabajo con mobiliario de alta gama y sistemas auxiliares.',
    activos: ['Estaciones de trabajo modulares y salas de consejo', 'Sistemas de climatización industrial HVAC', 'Plantas eléctricas de emergencia y transformadores', 'Paneles solares y sistemas de eficiencia energética'],
    beneficioFiscal: 'Equipamiento llave en mano sin comprometer líneas de crédito bancario.',
    montoReferencia: 450000
  },
  {
    id: 'medico',
    titulo: 'Equipo Médico & Diagnóstico Hospitalario',
    badge: 'Sector Salud',
    icono: '🏥',
    imagen: '/assets/medical-imaging.jpg',
    descripcion: 'Tecnología médica avanzada para hospitales, clínicas privadas, laboratorios de análisis y centros de diagnóstico.',
    activos: ['Tomógrafos y resonadores magnéticos', 'Equipos de ultrasonido 4D y rayos X digitales', 'Torres de laparoscopía y quirófanos modulares', 'Analizadores clínicos y equipo de laboratorio'],
    beneficioFiscal: 'Amortización alineada a los flujos operativos de la institución médica.',
    montoReferencia: 3500000
  },
  {
    id: 'industrial',
    titulo: 'Maquinaria Industrial & Bienes de Capital',
    badge: 'Manufactura',
    icono: '🏭',
    imagen: '/assets/industrial-plant.jpg',
    descripcion: 'Expanda la capacidad instalada de su planta con maquinaria especializada para manufactura, inyección y empaque.',
    activos: ['Inyectoras de plástico y extrusoras', 'Centros de maquinado y tornos CNC', 'Prensas hidráulicas y líneas de corte', 'Robots de paletizado y líneas de envasado'],
    beneficioFiscal: 'Incremento productivo inmediato manteniendo liquidez en tesorería.',
    montoReferencia: 4200000
  }
];

export default function ArrendadoraPage() {
  // Cotizador Financiero Institucional
  const [tipoActivo, setTipoActivo] = useState('vehicular');
  const [modalidadLeasing, setModalidadLeasing] = useState('puro'); // 'puro' (Operating Lease) | 'sale-leaseback' (Sale & Leaseback)
  const [montoActivo, setMontoActivo] = useState(850000);
  const [plazoMeses, setPlazoMeses] = useState(36); // 12, 24, 36, 48, 60
  const [pagoInicialPorc, setPagoInicialPorc] = useState(0); // 0, 10, 20, 30 (Desde 0% para casos que apliquen)

  // Cálculos Financieros Formales de Arrendadora
  const tasaAnual = modalidadLeasing === 'puro' ? 0.138 : 0.149;
  const tasaMensual = tasaAnual / 12;
  const pagoInicialMonto = (montoActivo * pagoInicialPorc) / 100;
  const valorFinanciado = montoActivo - pagoInicialMonto;

  // Valor residual según modalidad y plazo
  const factorResidual = modalidadLeasing === 'puro'
    ? (plazoMeses === 12 ? 0.40 : plazoMeses === 24 ? 0.30 : plazoMeses === 36 ? 0.22 : plazoMeses === 48 ? 0.15 : 0.10)
    : (plazoMeses === 12 ? 0.15 : plazoMeses === 24 ? 0.10 : plazoMeses === 36 ? 0.05 : 0.02);

  const valorResidualMonto = montoActivo * factorResidual;

  // Renta Mensual (Amortización formal con valor residual)
  const rentaMensualBase = (valorFinanciado - (valorResidualMonto / Math.pow(1 + tasaMensual, plazoMeses))) *
    (tasaMensual / (1 - Math.pow(1 + tasaMensual, -plazoMeses)));

  const ivaRenta = rentaMensualBase * 0.16;
  const mensualidadTotal = rentaMensualBase + ivaRenta;

  const comisionApertura = montoActivo * 0.02;
  const desembolsoInicialTotal = pagoInicialMonto + (comisionApertura * 1.16) + mensualidadTotal;

  // Beneficio fiscal estimado (ISR 30% + IVA acreditable)
  const ahorroIsrMensual = modalidadLeasing === 'puro' ? (rentaMensualBase * 0.30) : (rentaMensualBase * 0.15);
  const ivaAcreditableMensual = ivaRenta;
  const beneficioFiscalTotalMensual = ahorroIsrMensual + ivaAcreditableMensual;

  // Formulario Modal Cotización
  const [contactData, setContactData] = useState({
    nombre: '',
    empresa: '',
    telefono: '',
    email: '',
    ciudad: 'Querétaro, Qro.'
  });
  const [showCotizacionModal, setShowCotizacionModal] = useState(false);

  // Wizard de Precalificación
  const [wizardPaso, setWizardPaso] = useState(1);
  const [formData, setFormData] = useState({
    tipoPersona: 'moral',
    nombre: '',
    empresa: '',
    rfc: '',
    email: '',
    telefono: '',
    giro: 'Industria / Logística / Servicios Corporativos',
    facturacionAnual: 'De $5,000,000 a $25,000,000 MXN',
    antiguedad: 'Más de 3 años'
  });
  const [submitting, setSubmitting] = useState(false);
  const [solicitudCompletada, setSolicitudCompletada] = useState(null);

  // Modales y Menú
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPortalClienteModal, setShowPortalClienteModal] = useState(false);
  const [showAdminCrmModal, setShowAdminCrmModal] = useState(false);
  const [crmLeads, setCrmLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Cargar CRM Leads
  const cargarLeadsCrm = async () => {
    setLoadingLeads(true);
    try {
      const res = await fetch('/api/arrendadora/solicitud');
      const data = await res.json();
      if (data.success) {
        setCrmLeads(data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingLeads(false);
  };

  const handleEnviarSolicitud = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        tipoArrendamiento: modalidadLeasing === 'puro' ? 'Arrendamiento Puro (100% Deducible)' : 'Arrendamiento Financiero',
        montoActivo,
        plazoMeses,
        pagoInicialPorc,
        mensualidadEstimada: Math.round(mensualidadTotal),
        ahorroFiscalEstimado: Math.round(beneficioFiscalTotalMensual),
        activoSeleccionado: `Línea de Arrendamiento: $${montoActivo.toLocaleString('es-MX')} MXN (${tipoActivo.toUpperCase()})`
      };

      const res = await fetch('/api/arrendadora/solicitud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSolicitudCompletada(data);
      }
    } catch (error) {
      alert('Ocurrió un error al procesar su solicitud.');
    }
    setSubmitting(false);
  };

  const whatsappMsg = encodeURIComponent(
    `Hola AXISPOINT CONTINENTAL, me interesa estructurar una línea de arrendamiento corporativo.\n\n` +
    `🏢 Empresa: ${contactData.empresa || contactData.nombre || 'Cliente Corporativo'}\n` +
    `💼 Tipo de Activo: ${tipoActivo.toUpperCase()}\n` +
    `💵 Valor del Activo: $${montoActivo.toLocaleString('es-MX')} MXN\n` +
    `📋 Esquema: Arrendamiento ${modalidadLeasing === 'puro' ? 'Puro (100% Deducible)' : 'Financiero'}\n` +
    `⏳ Plazo: ${plazoMeses} Meses • Anticipo: ${pagoInicialPorc}%\n` +
    `💰 Mensualidad Estimada: $${Math.round(mensualidadTotal).toLocaleString('es-MX')} MXN (c/IVA)\n\n` +
    `¿Podría un asesor senior de la Mesa de Crédito atenderme?`
  );

  return (
    <div className="arrendadora-wrapper">
      
      {/* Floating WhatsApp Button */}
      <a 
        href={`https://wa.me/524462653197?text=${whatsappMsg}`}
        target="_blank" 
        rel="noopener noreferrer" 
        className="whatsapp-float"
        title="Atención Directa WhatsApp AXISPOINT"
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
        </svg>
      </a>

      {/* MAIN NAVBAR (White Corporate Header - Baker McKenzie Style) */}
      <header className="main-header">
        <div className="main-header-container">
          
          {/* Brand Logo Pure HD */}
          <Link href="/" className="header-brand">
            <img 
              src="/axispoint-logo-pure.png" 
              alt="AXISPOINT CONTINENTAL" 
              className="header-logo-img"
            />
          </Link>

          {/* Horizontal Nav Links */}
          <nav>
            <ul className="header-nav">
              <li><a href="#nosotros" className="header-nav-link" style={{ color: 'var(--ap-red-primary)', fontWeight: 700 }}>Nosotros</a></li>
              <li><a href="#paquetes" className="header-nav-link">Líneas de Arrendamiento</a></li>
              <li><a href="#cotizador" className="header-nav-link">Simulador Financiero</a></li>
              <li><a href="#modalidades" className="header-nav-link">Modalidades</a></li>
              <li><a href="#comparativa" className="header-nav-link">Comparativa</a></li>
              <li><a href="#beneficios" className="header-nav-link">Ventajas Fiscales</a></li>
              <li><a href="#precalificador" className="header-nav-link">Mesa de Dictamen</a></li>
            </ul>
          </nav>

          {/* Action CTAs */}
          <div className="header-actions">
            <a href="#cotizador" className="btn-header-primary">
              Cotizar Línea ↗
            </a>
            {/* Hamburger Button for Mobile / Responsive */}
            <button 
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menú de Navegación"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>

        </div>

        {/* Mobile Drawer Menu */}
        <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
          <ul className="mobile-nav-list">
            <li><a href="#nosotros" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>🏛️ <strong>Nosotros</strong> (Quiénes Somos, Misión, Visión, Valores)</a></li>
            <li><a href="#paquetes" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>🚗 Líneas de Arrendamiento</a></li>
            <li><a href="#cotizador" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>🧮 Simulador Financiero</a></li>
            <li><a href="#modalidades" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>📋 Modalidades de Arrendamiento</a></li>
            <li><a href="#comparativa" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>⚖️ Matriz Comparativa (Arrendamiento Puro vs Crédito vs Contado)</a></li>
            <li><a href="#beneficios" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>🛡️ Ventajas Fiscales & Deducibilidad</a></li>
            <li><a href="#precalificador" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>⚡ Mesa de Dictamen Rápido</a></li>
          </ul>
          <div className="mobile-actions-group">
            <a href="#cotizador" className="btn-header-primary" style={{ justifyContent: 'center' }} onClick={() => setMobileMenuOpen(false)}>
              Cotizar Línea ↗
            </a>
          </div>
        </div>
      </header>

      {/* HERO SECTION (Executive White & Red Palette) */}
      <section className="hero-section">
        <div className="hero-pattern" />
        <div className="hero-container">
          
          <div className="hero-content-left">
            <div className="hero-badge-container">
              <span className="hero-badge">
                <span>🏛️</span> SOLUCIONES INSTITUCIONALES DE ARRENDAMIENTO PARA EMPRESAS
              </span>
            </div>
            
            <h1 className="hero-title">
              Arrendamiento Puro & Estrategias de <span className="hero-title-highlight">Grado Institucional</span> para Bienes de Capital
            </h1>
            
            <p className="hero-description">
              Financiamiento estratégico a la medida para flotillas vehiculares, maquinaria pesada, equipo de cómputo/TI, equipo médico y mobiliario corporativo. Preserve su capital de trabajo con deducibilidad del 100% de ISR e IVA.
            </p>

            <div className="hero-cta-group">
              <a href="#cotizador" className="btn-hero-primary">
                Simulador Financiero en Tiempo Real ↗
              </a>
              <a href="#paquetes" className="btn-hero-secondary">
                Ver Líneas de Arrendamiento
              </a>
            </div>

            <div className="hero-trust-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className="trust-stat-item">
                <span className="stat-number">Desde 0%</span>
                <span className="stat-label">Anticipo (Casos que apliquen)</span>
              </div>
              <div className="trust-stat-item">
                <span className="stat-number">100%</span>
                <span className="stat-label">Deducible de ISR (Art. 28 LISR)</span>
              </div>
              <div className="trust-stat-item">
                <span className="stat-number">12 a 60</span>
                <span className="stat-label">Meses de Plazo con Valor Residual</span>
              </div>
              <div className="trust-stat-item">
                <span className="stat-number">24 - 48 hrs</span>
                <span className="stat-label">Dictamen y Aprobación de Línea</span>
              </div>
            </div>
          </div>

          <div className="hero-quick-card">
            <div className="quick-card-header">
              <span className="quick-card-title">
                <span>⚡</span> Ventajas de la Arrendadora
              </span>
              <span className="quick-card-tag">Banca Empresarial</span>
            </div>

            <div className="hero-feature-list">
              <div className="hero-feature-item">
                <span className="hero-feature-icon">✓</span>
                <div>
                  <strong>Desde 0% de Anticipo Inicial:</strong> Esquemas accesibles sin desembolso inicial forzoso para empresas con perfil calificado.
                </div>
              </div>
              <div className="hero-feature-item">
                <span className="hero-feature-icon">✓</span>
                <div>
                  <strong>Preservación de Liquidez:</strong> No compromete líneas de crédito bancario tradicional ni inmoviliza capital de trabajo.
                </div>
              </div>
              <div className="hero-feature-item">
                <span className="hero-feature-icon">✓</span>
                <div>
                  <strong>Eficiencia de Balance (Off-Balance Sheet):</strong> El arrendamiento puro no incrementa los pasivos de la empresa, optimizando los ratios de apalancamiento.
                </div>
              </div>
              <div className="hero-feature-item">
                <span className="hero-feature-icon">✓</span>
                <div>
                  <strong>Renovación Continua de Activos:</strong> Sustituya activos por modelos nuevos al término del plazo sin absorber la depreciación de reventa.
                </div>
              </div>
            </div>

            <a href="#cotizador" className="btn-hero-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Iniciar Simulación ↗
            </a>
          </div>

        </div>
      </section>
 
      {/* SECCIÓN CORPORATIVA: NOSOTROS / QUIÉNES SOMOS / MISIÓN / VISIÓN / VALORES / GOBERNANZA */}
      <section id="nosotros" className="section-wrapper">
        <div className="section-header-center">
          <span className="section-tag">Identidad Corporativa & Solvencia</span>
          <h2 className="section-title">Quiénes Somos, Misión, Visión & Gobernanza Institucional</h2>
          <p className="section-subtitle">
            Conozca los principios institucionales, solidez financiera, gobernanza y modelo de negocio que respaldan a AXISPOINT CONTINENTAL como su arrendadora de confianza en México.
          </p>
        </div>

        <div className="corporate-about-box">
          
          {/* Quiénes Somos Hero Grid con Fotografía Corporativa */}
          <div className="about-hero-grid">
            <div>
              <span className="mv-badge">Solidez Financiera & Especialización</span>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--ap-navy-primary)', margin: '0.5rem 0 1rem 0', lineHeight: 1.25 }}>
                Arrendadora Especializada en Activos Productivos y Bienes de Capital
              </h3>
              <p className="about-text-lead">
                <strong>AXISPOINT CONTINENTAL, S.A. DE C.V.</strong> es una entidad financiera mexicana dedicada exclusivamente a la estructuración de <strong>Arrendamiento Puro (Operating Lease)</strong> y programas de <strong>Sale & Leaseback (Monetización de Activos)</strong> para personas morales y personas físicas con actividad empresarial en todo el territorio nacional.
              </p>
              <p style={{ fontSize: '0.95rem', color: 'var(--ap-text-secondary)', lineHeight: 1.7, marginTop: '1rem' }}>
                Nuestro objetivo primordial es proporcionar a las empresas herramientas de financiamiento inteligente que les permitan adquirir y renovar activos indispensables (flotillas vehiculares, maquinaria pesada, infraestructura de TI, equipo médico y bienes industriales) maximizando la deducibilidad fiscal conforme a la LISR y preservando la liquidez en tesorería.
              </p>

              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ borderLeft: '3px solid var(--ap-red-primary)', paddingLeft: '0.75rem' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--ap-navy-primary)' }}>+$500M MXN</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ap-text-muted)', fontWeight: 600 }}>Capacidad de Originación de Activos</div>
                </div>
                <div style={{ borderLeft: '3px solid var(--ap-red-primary)', paddingLeft: '0.75rem' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--ap-navy-primary)' }}>24 - 48 hrs</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ap-text-muted)', fontWeight: 600 }}>Tiempo Promedio de Dictamen</div>
                </div>
                <div style={{ borderLeft: '3px solid var(--ap-red-primary)', paddingLeft: '0.75rem' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--ap-navy-primary)' }}>100% Legal</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ap-text-muted)', fontWeight: 600 }}>Contratos Notariados LGTOC</div>
                </div>
              </div>
            </div>

            {/* Visual Corporate Photo Card */}
            <div className="about-photo-wrapper">
              <img 
                src="/assets/team-consulting.jpg" 
                alt="Comité de Crédito y Dirección Financiera AXISPOINT" 
                className="about-photo-img"
              />
              <div className="about-photo-overlay">
                <div className="about-photo-tag">Comité Directivo & Mesa de Crédito</div>
                <div className="about-photo-title">Estructuración Financiera de Grado Institucional</div>
              </div>
            </div>
          </div>

          {/* Pilares de Gobernanza y Certeza Jurídica */}
          <div className="governance-section">
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <span className="mv-badge">Marco de Cumplimiento & Riesgos</span>
              <h4 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--ap-navy-primary)', marginTop: '0.25rem' }}>
                4 Pilares de Gobernanza Institucional
              </h4>
            </div>

            <div className="governance-grid">
              <div className="gov-card">
                <div className="gov-card-icon">🏛️</div>
                <div className="gov-card-title">Comité de Crédito</div>
                <p className="gov-card-desc">
                  Evaluación técnica y ágil de estados financieros, flujos proyectados y garantías prendarias sin excesiva burocracia bancaria.
                </p>
              </div>

              <div className="gov-card">
                <div className="gov-card-icon">🛡️</div>
                <div className="gov-card-title">Certeza Jurídica LGTOC</div>
                <p className="gov-card-desc">
                  Contratos formalizados y ratificados conforme a la Ley General de Títulos y Operaciones de Crédito para total seguridad de ambas partes.
                </p>
              </div>

              <div className="gov-card">
                <div className="gov-card-icon">📑</div>
                <div className="gov-card-title">CFDI 4.0 Timbrado SAT</div>
                <p className="gov-card-desc">
                  Facturación fiscal inmediata con desglose preciso de renta e IVA acreditable para asegurar el 100% de deducibilidad ante la SHCP.
                </p>
              </div>

              <div className="gov-card">
                <div className="gov-card-icon">📍</div>
                <div className="gov-card-title">Sede Querétaro</div>
                <p className="gov-card-desc">
                  Atención corporativa directa y personalizada desde nuestras oficinas centrales para clientes empresariales de todo el país.
                </p>
              </div>
            </div>
          </div>

          {/* Misión y Visión Grid */}
          <div className="mv-grid">
            <div className="mv-card">
              <div className="mv-badge">Propósito Institucional</div>
              <h4 className="mv-title">🎯 Nuestra Misión</h4>
              <p className="mv-desc">
                Proveer soluciones integrales de arrendamiento de activos productivos que potencien el crecimiento, la rentabilidad y la competitividad de las empresas en México. Brindamos asesoría fiscal y financiera especializada, esquemas flexibles de valor residual y procesos ágiles de dictamen, constituyendo una alternativa formal y superior a la banca tradicional.
              </p>
            </div>

            <div className="mv-card">
              <div className="mv-badge">Visión Estratégica</div>
              <h4 className="mv-title">🚀 Nuestra Visión</h4>
              <p className="mv-desc">
                Consolidarnos como la arrendadora corporativa y financiera independiente líder en México, reconocida por su excelencia operativa, solvencia institucional, transparencia contractual y por ser el socio estratégico indispensable en la modernización de infraestructura y bienes de capital del sector productivo nacional.
              </p>
            </div>
          </div>

          {/* Valores Corporativos */}
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <span className="mv-badge">Cultura & Ética de Negocios</span>
              <h4 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--ap-navy-primary)', marginTop: '0.25rem' }}>
                Nuestros Valores Corporativos
              </h4>
            </div>

            <div className="valores-grid">
              <div className="valor-card">
                <div className="valor-icon">🏛️</div>
                <h5 className="valor-title">Integridad y Solidez</h5>
                <p className="valor-desc">
                  Operamos bajo los más estrictos estándares éticos, regulatorios y fiscales de México, garantizando contratos con certeza jurídica y total apego a la legislación fiscal vigente.
                </p>
              </div>

              <div className="valor-card">
                <div className="valor-icon">⚡</div>
                <h5 className="valor-title">Agilidad y Respuesta</h5>
                <p className="valor-desc">
                  Comprendemos que las oportunidades de negocio no esperan. Nuestro comité de crédito dictamina solicitudes de arrendamiento en 24 a 48 horas con mínimas trabas burocráticas.
                </p>
              </div>

              <div className="valor-card">
                <div className="valor-icon">🤝</div>
                <h5 className="valor-title">Compromiso Consultivo</h5>
                <p className="valor-desc">
                  Estructuramos cada contrato en función del flujo de efectivo, estacionalidad y objetivos fiscales de su empresa, actuando como un aliado financiero de largo plazo.
                </p>
              </div>

              <div className="valor-card">
                <div className="valor-icon">🔍</div>
                <h5 className="valor-title">Transparencia Total</h5>
                <p className="valor-desc">
                  Cero letras chiquitas ni comisiones ocultas. Claridad absoluta en tasas, valores residuales, amortizaciones y opciones al término del arrendamiento.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* PAQUETES & LÍNEAS DE ARRENDAMIENTO CON FOTOGRAFÍA */}
      <section id="paquetes" className="section-wrapper section-wrapper-alt">
        <div className="section-header-center">
          <span className="section-tag">Portafolio de Activos Financiables</span>
          <h2 className="section-title">Líneas de Arrendamiento por Tipo de Activo</h2>
          <p className="section-subtitle">
            Diseñamos soluciones financieras especializadas con activos de primera línea para cada requerimiento operativo de su empresa.
          </p>
        </div>

        <div className="packages-grid">
          {PAQUETES_ARRENDAMIENTO.map((pkg) => (
            <div key={pkg.id} className="package-card">
              {/* Image Header */}
              <div className="package-card-img-wrapper">
                <img src={pkg.imagen} alt={pkg.titulo} className="package-card-img" />
                <span className="package-card-badge">{pkg.badge}</span>
              </div>

              <div className="package-card-body">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.3rem' }}>{pkg.icono}</span>
                    <h3 className="package-title" style={{ margin: 0, fontSize: '1.15rem' }}>{pkg.titulo}</h3>
                  </div>
                  <p className="package-desc">{pkg.descripcion}</p>

                  <ul className="package-features">
                    {pkg.activos.map((act, i) => (
                      <li key={i} className="package-feature-item">
                        <span>✓</span> {act}
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ marginTop: '1.25rem' }}>
                  <div style={{ background: 'var(--ap-bg-subtle)', padding: '0.85rem 1rem', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--ap-navy-primary)', fontWeight: 600, marginBottom: '1.25rem' }}>
                    🛡️ <strong>Impacto Fiscal:</strong> {pkg.beneficioFiscal}
                  </div>
                  <button 
                    onClick={() => {
                      setTipoActivo(pkg.id);
                      setMontoActivo(pkg.montoReferencia);
                      const el = document.getElementById('cotizador');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="btn-header-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Cotizar este Segmento ↗
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SIMULADOR FINANCIERO DE ARRENDADORA FORMAL */}
      <section id="cotizador" className="section-wrapper section-wrapper-alt">
        <div className="section-header-center">
          <span className="section-tag">Simulador Institucional</span>
          <h2 className="section-title">Cotizador Financiero de Arrendamiento</h2>
          <p className="section-subtitle">
            Configure los parámetros de su operación para obtener una estimación formal de rentas mensuales, desembolso inicial y deducción fiscal.
          </p>
        </div>

        <div className="cotizador-box">
          
          {/* Panel Izquierdo: Parámetros Financieros */}
          <div className="cotizador-inputs">
            
            {/* Selector de Tipo de Activo */}
            <div className="form-group-custom">
              <label className="form-label-custom">
                <span>1. Categoría de Activo a Financiar</span>
              </label>
              <div className="category-tabs-leasing">
                {[
                  { id: 'vehicular', label: '🚗 Flotillas & Autos', val: 850000 },
                  { id: 'maquinaria', label: '🚜 Maquinaria Pesada', val: 2800000 },
                  { id: 'ti-computo', label: '💻 Cómputo & TI', val: 650000 },
                  { id: 'oficina-mobiliario', label: '🏢 Mobiliario & Oficinas', val: 450000 },
                  { id: 'medico', label: '🏥 Equipo Médico', val: 3500000 },
                  { id: 'industrial', label: '🏭 Equipo Industrial', val: 4200000 }
                ].map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => { setTipoActivo(cat.id); setMontoActivo(cat.val); }}
                    className={`category-tab-leasing ${tipoActivo === cat.id ? 'active' : ''}`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modalidad de Arrendamiento */}
            <div className="form-group-custom">
              <label className="form-label-custom">
                <span>2. Modalidad Contractual</span>
              </label>
              <div className="lease-type-grid">
                <div 
                  onClick={() => setModalidadLeasing('puro')}
                  className={`lease-type-option ${modalidadLeasing === 'puro' ? 'active' : ''}`}
                >
                  <div className="lease-type-title">Arrendamiento Puro (Operating Lease)</div>
                  <div className="lease-type-desc">100% Gasto Deducible de ISR. Menor desembolso con valor residual al término del contrato.</div>
                </div>
                <div 
                  onClick={() => setModalidadLeasing('sale-leaseback')}
                  className={`lease-type-option ${modalidadLeasing === 'sale-leaseback' ? 'active' : ''}`}
                >
                  <div className="lease-type-title">Sale & Leaseback (Monetización)</div>
                  <div className="lease-type-desc">Inyección inmediata de capital sobre activos en posesión con uso ininterrumpido.</div>
                </div>
              </div>
            </div>

            {/* Slider de Valor del Activo */}
            <div className="form-group-custom">
              <div className="form-label-custom">
                <span>3. Valor Total del Activo (con IVA)</span>
                <span className="form-label-value">${montoActivo.toLocaleString('es-MX')} MXN</span>
              </div>
              <input 
                type="range" 
                min={200000} 
                max={10000000} 
                step={50000}
                value={montoActivo}
                onChange={(e) => setMontoActivo(Number(e.target.value))}
                className="range-slider"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--ap-text-muted)', marginTop: '0.4rem' }}>
                <span>$200,000 MXN</span>
                <span>$5,000,000 MXN</span>
                <span>$10,000,000 MXN</span>
              </div>
            </div>

            {/* Selector de Plazo */}
            <div className="form-group-custom">
              <label className="form-label-custom">
                <span>4. Plazo del Arrendamiento</span>
                <span style={{ color: 'var(--ap-navy-primary)', fontWeight: 700 }}>{plazoMeses} Meses</span>
              </label>
              <div className="option-grid">
                {[12, 24, 36, 48, 60].map((m) => (
                  <button 
                    key={m}
                    onClick={() => setPlazoMeses(m)}
                    className={`btn-option ${plazoMeses === m ? 'active' : ''}`}
                  >
                    {m} Meses
                  </button>
                ))}
              </div>
            </div>

            {/* Anticipo / Depósito en Garantía */}
            <div className="form-group-custom" style={{ marginBottom: 0 }}>
              <label className="form-label-custom">
                <span>5. Anticipo / Depósito Inicial</span>
                <span style={{ color: 'var(--ap-navy-primary)', fontWeight: 700 }}>
                  {pagoInicialPorc === 0 ? '0% ($0 MXN - Casos que apliquen)' : `${pagoInicialPorc}% ($${Math.round(pagoInicialMonto).toLocaleString('es-MX')} MXN)`}
                </span>
              </label>
              <div className="option-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {[0, 10, 20, 30].map((p) => (
                  <button 
                    key={p}
                    onClick={() => setPagoInicialPorc(p)}
                    className={`btn-option ${pagoInicialPorc === p ? 'active' : ''}`}
                  >
                    {p === 0 ? '0% Anticipo' : `${p}% Anticipo`}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--ap-emerald)', fontWeight: 600, marginTop: '0.45rem' }}>
                ⚡ <strong>Tasa 0% de anticipo:</strong> Disponible para personas morales y físicas con buen historial y dictamen favorable.
              </div>
            </div>

          </div>

          {/* Panel Derecho: Desglose Financiero & Fiscal */}
          <div className="cotizador-results">
            <div>
              <div className="result-header">
                <div className="result-header-title">Renta Mensual Estimada</div>
                <div className="result-main-price">${Math.round(mensualidadTotal).toLocaleString('es-MX')} <span style={{ fontSize: '1.1rem', fontWeight: 500 }}>MXN</span></div>
                <div className="result-main-sub">Renta base: ${Math.round(rentaMensualBase).toLocaleString('es-MX')} + IVA (${Math.round(ivaRenta).toLocaleString('es-MX')})</div>
              </div>

              <div className="result-details-grid">
                <div className="result-row">
                  <span>Valor Total del Activo:</span>
                  <span className="result-row-strong">${montoActivo.toLocaleString('es-MX')} MXN</span>
                </div>
                <div className="result-row">
                  <span>Anticipo Inicial ({pagoInicialPorc}%):</span>
                  <span className="result-row-strong">${Math.round(pagoInicialMonto).toLocaleString('es-MX')} MXN</span>
                </div>
                <div className="result-row">
                  <span>Comisión por Apertura (2% + IVA):</span>
                  <span className="result-row-strong">${Math.round(comisionApertura * 1.16).toLocaleString('es-MX')} MXN</span>
                </div>
                <div className="result-row">
                  <span>Desembolso Inicial Total:</span>
                  <span className="result-row-strong" style={{ color: '#fca5a5' }}>${Math.round(desembolsoInicialTotal).toLocaleString('es-MX')} MXN</span>
                </div>
                <div className="result-row">
                  <span>Valor Residual al Cierre:</span>
                  <span className="result-row-strong">${Math.round(valorResidualMonto).toLocaleString('es-MX')} MXN ({Math.round(factorResidual * 100)}%)</span>
                </div>
              </div>

              <div className="result-tax-badge">
                <strong>🛡️ Beneficio Fiscal Mensual Estimado:</strong><br />
                Ahorro aproximado de <strong>${Math.round(beneficioFiscalTotalMensual).toLocaleString('es-MX')} MXN</strong> combinando deducción de ISR (30%) e IVA mensual acreditable.
              </div>
            </div>

            <div>
              <button 
                onClick={() => setShowCotizacionModal(true)}
                className="result-cta-btn"
              >
                Solicitar Corrida Financiera Membretada ↗
              </button>
              <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                Sujeto a dictamen y aprobación de la Mesa de Crédito. Tasas corporativas referenciales.
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* MODALIDADES DE CRÉDITO Y ESTRUCTURAS */}
      <section id="modalidades" className="section-wrapper">
        <div className="section-header-center">
          <span className="section-tag">Estructuras Financieras</span>
          <h2 className="section-title">Modalidades de Arrendamiento Corporativo</h2>
          <p className="section-subtitle">
            Soluciones diseñadas para directores de finanzas (CFOs), tesoreros y comités de inversión con esquemas flexibles a la medida.
          </p>
        </div>

        <div className="modalidades-two-grid">
          
          {/* Card 1: Arrendamiento Puro (Operating Lease) */}
          <div className="modalidad-card-lg">
            <div>
              <div className="modalidad-icon-lg">📄</div>
              <div className="modalidad-badge">100% Gasto Operativo Deducible</div>
              <h3 className="modalidad-title-lg">Arrendamiento Puro (Operating Lease)</h3>
              <p className="modalidad-desc-lg">
                Uso y goce temporal de flotillas vehiculares, maquinaria pesada y equipos estratégicos sin registrar pasivos pesados en balance general. Las rentas mensuales se deducen íntegramente de ISR e IVA como gasto operativo directo.
              </p>

              <ul className="modalidad-checklist">
                <li className="modalidad-check-item">
                  <span>✓</span>
                  <div>
                    <strong>Deducción Fiscal al 100%:</strong> Renta mensual 100% deducible de ISR conforme al Art. 28 de la LISR e IVA acreditable mes a mes.
                  </div>
                </li>
                <li className="modalidad-check-item">
                  <span>✓</span>
                  <div>
                    <strong>Efecto Fuera de Balance (Off-Balance Sheet):</strong> No satura sus líneas de crédito bancario ni afecta los índices de endeudamiento corporativo.
                  </div>
                </li>
                <li className="modalidad-check-item">
                  <span>✓</span>
                  <div>
                    <strong>Renovación Continua sin Riesgo:</strong> Sustitución de activos cada 24, 36 o 48 meses transfiriendo el riesgo de depreciación a la arrendadora.
                  </div>
                </li>
                <li className="modalidad-check-item">
                  <span>✓</span>
                  <div>
                    <strong>Opciones Flexibles al Cierre:</strong> Adquisición al valor residual pactado, renovación por unidades de última generación o extensión contractual.
                  </div>
                </li>
              </ul>
            </div>

            <div style={{ background: 'var(--ap-bg-subtle)', padding: '1.25rem 1.5rem', borderRadius: '10px', border: '1px solid var(--ap-border)', marginTop: '1rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--ap-navy-primary)', marginBottom: '0.25rem' }}>🎯 Perfil Ideal:</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--ap-text-secondary)', lineHeight: 1.5 }}>Empresas que buscan optimizar su carga impositiva, renovar activos periódicamente y conservar el 100% de su liquidez operativa.</div>
            </div>
          </div>

          {/* Card 2: Sale & Leaseback (Monetización) */}
          <div className="modalidad-card-lg">
            <div>
              <div className="modalidad-icon-lg">🔄</div>
              <div className="modalidad-badge">Inyección Inmediata de Capital</div>
              <h3 className="modalidad-title-lg">Sale & Leaseback (Monetización de Activos)</h3>
              <p className="modalidad-desc-lg">
                Estructura financiera de monetización donde <strong>AXISPOINT CONTINENTAL</strong> adquiere los activos existentes y productivos de su empresa (flotillas, maquinaria o equipos), inyectando liquidez inmediata a su tesorería y arrendándoselos de vuelta en uso continuo.
              </p>

              <ul className="modalidad-checklist">
                <li className="modalidad-check-item">
                  <span>✓</span>
                  <div>
                    <strong>Inyección Inmediata de Liquidez:</strong> Obtenga recursos frescos de capital de trabajo sobre el valor comercial de sus activos actuales.
                  </div>
                </li>
                <li className="modalidad-check-item">
                  <span>✓</span>
                  <div>
                    <strong>Operación Ininterrumpida:</strong> Su empresa continúa utilizando los mismos vehículos y maquinaria sin parar un solo día de trabajo.
                  </div>
                </li>
                <li className="modalidad-check-item">
                  <span>✓</span>
                  <div>
                    <strong>Conversión de Activo a Gasto Deducible:</strong> Transforma activos fijos inmovilizados en rentas mensuales deducibles de impuestos.
                  </div>
                </li>
                <li className="modalidad-check-item">
                  <span>✓</span>
                  <div>
                    <strong>Saneamiento de Estructura Financiera:</strong> Mejora los ratios de liquidez corriente y capital de trabajo en el balance general.
                  </div>
                </li>
              </ul>
            </div>

            <div style={{ background: 'var(--ap-bg-subtle)', padding: '1.25rem 1.5rem', borderRadius: '10px', border: '1px solid var(--ap-border)', marginTop: '1rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--ap-navy-primary)', marginBottom: '0.25rem' }}>🎯 Perfil Ideal:</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--ap-text-secondary)', lineHeight: 1.5 }}>Empresas con activos en propiedad que requieren capitalizar proyectos de expansión, pagar pasivos costosos o fondear nuevas inversiones.</div>
            </div>
          </div>

        </div>

        {/* INFOGRAFÍA 1: CICLO OPERATIVO DEL ARRENDAMIENTO */}
        <div className="infographic-timeline-box">
          <div style={{ textAlign: 'center' }}>
            <span className="mv-badge">Infografía de Proceso Operativo</span>
            <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--ap-navy-primary)', marginTop: '0.25rem' }}>
              Ciclo de Vida de una Operación de Arrendamiento AXISPOINT
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--ap-text-secondary)', maxWidth: '680px', margin: '0.5rem auto 0 auto' }}>
              De la cotización inicial a la renovación de flota o maquinaria: trazabilidad institucional en 5 etapas fluidas.
            </p>
          </div>

          <div className="timeline-steps-grid">
            <div className="timeline-step-item">
              <div className="timeline-step-num">1</div>
              <div className="timeline-step-title">Cotización & Selección</div>
              <div className="timeline-step-desc">
                El cliente define los activos requeridos directamente con la agencia o proveedor de su elección.
              </div>
            </div>

            <div className="timeline-step-item">
              <div className="timeline-step-num">2</div>
              <div className="timeline-step-title">Dictamen de Crédito</div>
              <div className="timeline-step-desc">
                Evaluación financiera ágil y emisión de resolución formal en un plazo de 24 a 48 horas.
              </div>
            </div>

            <div className="timeline-step-item">
              <div className="timeline-step-num">3</div>
              <div className="timeline-step-title">Firma & Entrega</div>
              <div className="timeline-step-desc">
                AXISPOINT liquida al proveedor y entrega el bien listo para operar con póliza y placas.
              </div>
            </div>

            <div className="timeline-step-item">
              <div className="timeline-step-num">4</div>
              <div className="timeline-step-title">Renta & Deducibilidad</div>
              <div className="timeline-step-desc">
                Emisión mensual de CFDI 4.0 para deducción del 100% de ISR y acreditamiento de IVA.
              </div>
            </div>

            <div className="timeline-step-item">
              <div className="timeline-step-num">5</div>
              <div className="timeline-step-title">Opciones al Cierre</div>
              <div className="timeline-step-desc">
                Opción de compra al valor residual, renovación por unidad nueva o extensión de contrato.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MATRIZ COMPARATIVA CORPORATIVA */}
      <section id="comparativa" className="section-wrapper section-wrapper-alt">
        <div className="section-header-center">
          <span className="section-tag">Análisis Comparativo</span>
          <h2 className="section-title">Matriz Comparativa de Adquisición</h2>
          <p className="section-subtitle">
            Evaluación técnica entre el Arrendamiento Puro AXISPOINT, el Crédito Bancario Tradicional y la Compra Directa de Contado.
          </p>
        </div>

        <div className="table-container">
          <table className="comparison-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Criterio Financiero & Operativo</th>
                <th className="highlight-col" style={{ width: '26%' }}>AXISPOINT Arrendamiento Puro</th>
                <th style={{ width: '23%' }}>Crédito Bancario Tradicional</th>
                <th style={{ width: '23%' }}>Compra Directa de Contado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Descapitalización Inicial</strong></td>
                <td className="highlight-col"><strong>Mínima o Nula (Desde 0% de anticipo para casos que apliquen)</strong></td>
                <td>Media (Enganche 25-35% + comisiones)</td>
                <td>Total (100% desembolso de caja)</td>
              </tr>
              <tr>
                <td><strong>Deducibilidad Fiscal (LISR)</strong></td>
                <td className="highlight-col"><strong>100% Gasto Deducible Mensual</strong></td>
                <td>Depreciación anual 25% (Tope $175k autos)</td>
                <td>Depreciación lenta en 4 años</td>
              </tr>
              <tr>
                <td><strong>Impacto en Balance General</strong></td>
                <td className="highlight-col"><strong>Fuera de Balance (Sin deuda bancaria)</strong></td>
                <td>Aparece como pasivo bancario pesado</td>
                <td>Inmoviliza activo fijo y reduce liquidez</td>
              </tr>
              <tr>
                <td><strong>Acreditamiento de IVA</strong></td>
                <td className="highlight-col"><strong>Mes con mes sobre el 100% de la renta</strong></td>
                <td>Únicamente sobre intereses cobrados</td>
                <td>De golpe en mes 1 (afecta flujo)</td>
              </tr>
              <tr>
                <td><strong>Riesgo de Depreciación y Obsolescencia</strong></td>
                <td className="highlight-col"><strong>Nulo (Transfiere el riesgo a la arrendadora)</strong></td>
                <td>Alto (La empresa asume la pérdida)</td>
                <td>Alto (Pérdida al momento de vender)</td>
              </tr>
              <tr>
                <td><strong>Renovación de Activos</strong></td>
                <td className="highlight-col"><strong>Automática cada 24, 36 o 48 meses</strong></td>
                <td>Compleja tras liquidar el crédito</td>
                <td>Lenta y costosa para la tesorería</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* INFOGRAFÍA 2: COMPARATIVA FINANCIERA CAPEX VS OPEX */}
        <div className="infographic-capex-box">
          <div style={{ textAlign: 'center' }}>
            <span className="mv-badge">Infografía Financiera de Balance</span>
            <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--ap-navy-primary)', marginTop: '0.25rem' }}>
              Impacto en Flujo de Caja: CAPEX vs. OPEX
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--ap-text-secondary)', maxWidth: '680px', margin: '0.5rem auto 0 auto' }}>
              Vea cómo la conversión de gasto de capital a gasto operativo optimiza el Retorno sobre Activos (ROA) de su empresa.
            </p>
          </div>

          <div className="capex-grid">
            <div className="capex-col">
              <div>
                <span className="capex-pill gray">Modelo Tradicional</span>
                <div className="capex-header">Compra de Contado</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--ap-text-muted)', marginBottom: '1.25rem' }}>
                  Desembolso del 100% del valor en un solo pago. Inmoviliza capital y castiga la tesorería.
                </p>
                <div className="capex-metric-row">
                  <span>Desembolso Mes 1:</span>
                  <strong>100% del Activo</strong>
                </div>
                <div className="capex-metric-row">
                  <span>Deducción Fiscal:</span>
                  <span style={{ color: '#b91c1c', fontWeight: 700 }}>Depreciación Lenta (4-10 años)</span>
                </div>
                <div className="capex-metric-row">
                  <span>Impacto en Balance:</span>
                  <span>Inmoviliza Capital de Trabajo</span>
                </div>
              </div>
            </div>

            <div className="capex-col">
              <div>
                <span className="capex-pill gray">Financiamiento Bancario</span>
                <div className="capex-header">Crédito Automotriz / Simple</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--ap-text-muted)', marginBottom: '1.25rem' }}>
                  Apalancamiento que satura líneas de crédito y queda registrado como deuda en balance.
                </p>
                <div className="capex-metric-row">
                  <span>Enganche Inicial:</span>
                  <strong>25% a 35% + Gastos</strong>
                </div>
                <div className="capex-metric-row">
                  <span>Deducción Fiscal:</span>
                  <span style={{ color: '#b91c1c', fontWeight: 700 }}>Sólo Intereses (Tope SAT)</span>
                </div>
                <div className="capex-metric-row">
                  <span>Impacto en Balance:</span>
                  <span>Incrementa Pasivo Bancario</span>
                </div>
              </div>
            </div>

            <div className="capex-col highlight">
              <div>
                <span className="capex-pill red">Estrategia Óptima AXISPOINT</span>
                <div className="capex-header" style={{ color: 'var(--ap-red-primary)' }}>Arrendamiento Puro (OPEX)</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--ap-text-secondary)', marginBottom: '1.25rem' }}>
                  Cero deuda registrada. Renta mensual deducible al 100% con preservación total de liquidez.
                </p>
                <div className="capex-metric-row">
                  <span>Pago Inicial:</span>
                  <strong style={{ color: 'var(--ap-emerald)' }}>Desde 0% (Casos que apliquen)</strong>
                </div>
                <div className="capex-metric-row">
                  <span>Deducción Fiscal:</span>
                  <strong style={{ color: 'var(--ap-emerald)' }}>100% del Pago Mensual</strong>
                </div>
                <div className="capex-metric-row">
                  <span>Impacto en Balance:</span>
                  <strong style={{ color: 'var(--ap-emerald)' }}>Fuera de Balance (Off-Balance)</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARCO LEGAL & FISCAL */}
      <section id="beneficios" className="section-wrapper">
        <div className="section-header-center">
          <span className="section-tag">Fundamento Jurídico</span>
          <h2 className="section-title">Marco Legal y Ventajas Fiscales LISR</h2>
          <p className="section-subtitle">
            Alineación con la Ley del Impuesto Sobre la Renta y la Ley General de Títulos y Operaciones de Crédito.
          </p>
        </div>

        <div className="packages-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          
          <div className="package-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ap-navy-primary)', marginBottom: '0.75rem' }}>
              ⚖️ Artículo 28 Fracc. XIII LISR
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--ap-text-secondary)', lineHeight: 1.6 }}>
              Las unidades de transporte, carga, maquinaria y equipo productivo son deducibles al <strong>100% sin tope monetario</strong> al considerarse activos estrictamente indispensables para la actividad económica de la empresa.
            </p>
          </div>

          <div className="package-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ap-navy-primary)', marginBottom: '0.75rem' }}>
              ⚡ Vehículos Híbridos y Eléctricos
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--ap-text-secondary)', lineHeight: 1.6 }}>
              Gozan de un tope ampliado de deducción de hasta <strong>$285,000 MXN</strong>, exención permanente de Impuesto Sobre Automóviles Nuevos (ISAN) y tenencia cero en las 32 entidades federativas.
            </p>
          </div>

          <div className="package-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ap-navy-primary)', marginBottom: '0.75rem' }}>
              💳 Acreditamiento Integral de IVA
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--ap-text-secondary)', lineHeight: 1.6 }}>
              A diferencia de la compra tradicional donde el IVA se absorbe de golpe, en el arrendamiento el <strong>16% de IVA se acredita mes con mes</strong> contra el IVA trasladado de su facturación regular.
            </p>
          </div>

        </div>

        {/* ECOSISTEMA INTEGRAL DE SERVICIOS Y DEDUCIBILIDAD (100% NATIVO) */}
        <div className="ecosystem-section-box">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <span className="mv-badge">Solución Llave en Mano</span>
            <h3 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--ap-navy-primary)', marginTop: '0.25rem' }}>
              Ecosistema Integral de Movilidad, Gestión & Deducibilidad Fiscal
            </h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--ap-text-secondary)', maxWidth: '720px', margin: '0.5rem auto 0 auto', lineHeight: 1.6 }}>
              En <strong>AXISPOINT CONTINENTAL</strong> estructuramos soluciones integrales que combinan financiamiento estratégico, administración operativa de activos y máxima eficiencia tributaria en un solo contrato institucional.
            </p>
          </div>

          <div className="ecosystem-services-grid">
            
            {/* Card 1: Gestión de Mantenimiento */}
            <div className="eco-card">
              <div>
                <div className="eco-card-top">
                  <div className="eco-icon">🔧</div>
                  <span className="eco-badge">Mantenimiento Total</span>
                </div>
                <div className="eco-title">Gestión de Mantenimiento & Flotas</div>
                <p className="eco-desc">
                  Servicios preventivos y correctivos programados con cobertura nacional en agencias y talleres certificados, reduciendo tiempos muertos.
                </p>
              </div>
              <ul className="eco-features-list">
                <li className="eco-feature-item"><span>✓</span> Red nacional de servicio</li>
                <li className="eco-feature-item"><span>✓</span> Facturación consolidada en la renta</li>
                <li className="eco-feature-item"><span>✓</span> Refacciones 100% originales</li>
              </ul>
            </div>

            {/* Card 2: Telemetría & GPS */}
            <div className="eco-card">
              <div>
                <div className="eco-card-top">
                  <div className="eco-icon">🛰️</div>
                  <span className="eco-badge">Control en Tiempo Real</span>
                </div>
                <div className="eco-title">Telemetría Avanzada & Rastreo GPS</div>
                <p className="eco-desc">
                  Plataforma digital para monitoreo en vivo de ubicaciones, control de velocidades, alertas de geocercas y optimización de consumo de combustible.
                </p>
              </div>
              <ul className="eco-features-list">
                <li className="eco-feature-item"><span>✓</span> App web y móvil 24/7</li>
                <li className="eco-feature-item"><span>✓</span> Paro de motor remoto en emergencia</li>
                <li className="eco-feature-item"><span>✓</span> Reportes de rendimiento operativo</li>
              </ul>
            </div>

            {/* Card 3: Seguros Corporativos */}
            <div className="eco-card">
              <div>
                <div className="eco-card-top">
                  <div className="eco-icon">🛡️</div>
                  <span className="eco-badge">Protección Total</span>
                </div>
                <div className="eco-title">Pólizas de Seguro Institucional</div>
                <p className="eco-desc">
                  Seguros de cobertura amplia con tarifas preferenciales corporativas, deducibles fijos y gestión ejecutiva de siniestros incluida.
                </p>
              </div>
              <ul className="eco-features-list">
                <li className="eco-feature-item"><span>✓</span> Asistencia legal y jurídica especializada</li>
                <li className="eco-feature-item"><span>✓</span> Cobertura de responsabilidad civil extendida</li>
                <li className="eco-feature-item"><span>✓</span> Gestión integral ante aseguradoras</li>
              </ul>
            </div>

            {/* Card 4: Gestoría Legal */}
            <div className="eco-card">
              <div>
                <div className="eco-card-top">
                  <div className="eco-icon">📋</div>
                  <span className="eco-badge">Cero Trámites</span>
                </div>
                <div className="eco-title">Gestoría Vehicular & Placas</div>
                <p className="eco-desc">
                  Administración de alta de placas en las 32 entidades federativas, tenencias, refrendos y verificaciones ambientales sin carga administrativa.
                </p>
              </div>
              <ul className="eco-features-list">
                <li className="eco-feature-item"><span>✓</span> Trámites multi-estado centralizados</li>
                <li className="eco-feature-item"><span>✓</span> Expediente digital de cada unidad</li>
                <li className="eco-feature-item"><span>✓</span> Calendario de vencimientos automatizado</li>
              </ul>
            </div>

            {/* Card 5: Facturación Fiscal */}
            <div className="eco-card">
              <div>
                <div className="eco-card-top">
                  <div className="eco-icon">📑</div>
                  <span className="eco-badge">Deducción 100% LISR</span>
                </div>
                <div className="eco-title">Facturación CFDI 4.0 Consolidada</div>
                <p className="eco-desc">
                  Un solo comprobante fiscal mensual que agrupa renta de activos, seguros, telemetría y servicios, simplificando la contabilidad y auditoría.
                </p>
              </div>
              <ul className="eco-features-list">
                <li className="eco-feature-item"><span>✓</span> Timbrado inmediato ante el SAT</li>
                <li className="eco-feature-item"><span>✓</span> IVA mensual 100% acreditable</li>
                <li className="eco-feature-item"><span>✓</span> Apego estricto al Art. 28 LISR</li>
              </ul>
            </div>

            {/* Card 6: Sustitución de Unidades */}
            <div className="eco-card">
              <div>
                <div className="eco-card-top">
                  <div className="eco-icon">🔄</div>
                  <span className="eco-badge">Continuidad Operativa</span>
                </div>
                <div className="eco-title">Garantía de Sustitución de Activos</div>
                <p className="eco-desc">
                  Flotilla de respaldo y reemplazo ágil de unidades ante siniestros o mantenimientos mayores para que su operación nunca se detenga.
                </p>
              </div>
              <ul className="eco-features-list">
                <li className="eco-feature-item"><span>✓</span> Unidades sustitutas inmediatas</li>
                <li className="eco-feature-item"><span>✓</span> Cero afectación en líneas de distribución</li>
                <li className="eco-feature-item"><span>✓</span> Soporte telefónico dedicado 446 265 3197</li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* WIZARD DE PRECALIFICACION */}
      <section id="precalificador" className="section-wrapper section-wrapper-alt">
        <div className="section-header-center">
          <span className="section-tag">Originación Digital</span>
          <h2 className="section-title">Mesa de Dictamen & Precalificación</h2>
          <p className="section-subtitle">
            Complete el expediente básico de su empresa para recibir una pre-aprobación formal en menos de 24 horas.
          </p>
        </div>

        <div className="wizard-card">
          
          <div className="wizard-steps-header">
            {[
              { num: 1, label: 'Perfil Fiscal' },
              { num: 2, label: 'Activo & Plazo' },
              { num: 3, label: 'Datos Empresa' },
              { num: 4, label: 'Dictamen' }
            ].map(p => (
              <div 
                key={p.num} 
                className={`wizard-step-node ${wizardPaso === p.num ? 'active' : wizardPaso > p.num ? 'completed' : ''}`}
              >
                <div className="wizard-step-circle">{wizardPaso > p.num ? '✓' : p.num}</div>
                <span className="wizard-step-label">{p.label}</span>
              </div>
            ))}
          </div>

          {solicitudCompletada ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
              <h3 style={{ fontSize: '1.6rem', color: 'var(--ap-navy-primary)', fontWeight: 800, marginBottom: '0.5rem' }}>
                ¡Expediente Registrado en Mesa de Crédito!
              </h3>
              <p style={{ color: 'var(--ap-text-secondary)', marginBottom: '1.5rem', fontSize: '1.05rem' }}>
                Su solicitud ha sido generada con folio oficial:
              </p>
              <div style={{ display: 'inline-block', background: 'var(--ap-red-soft)', border: '2px solid var(--ap-red-border)', padding: '0.75rem 1.5rem', borderRadius: '8px', fontSize: '1.3rem', fontWeight: 800, color: 'var(--ap-red-primary)', marginBottom: '2rem' }}>
                {solicitudCompletada.folio || 'SOL-2026-8942'}
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--ap-text-muted)', maxWidth: '520px', margin: '0 auto 2rem auto' }}>
                Un Oficial de la Mesa de Crédito de <strong>AXISPOINT CONTINENTAL</strong> se comunicará al teléfono y correo proporcionados para validar la entrega del expediente.
              </p>
              <button 
                onClick={() => { setSolicitudCompletada(null); setWizardPaso(1); }}
                className="btn-header-primary"
              >
                Registrar Otra Solicitud ↗
              </button>
            </div>
          ) : (
            <form onSubmit={handleEnviarSolicitud}>
              
              {wizardPaso === 1 && (
                <div>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ap-navy-primary)', marginBottom: '1.5rem' }}>
                    1. Régimen Fiscal del Solicitante
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                    <div 
                      onClick={() => setFormData({ ...formData, tipoPersona: 'moral' })}
                      className={`lease-type-option ${formData.tipoPersona === 'moral' ? 'active' : ''}`}
                    >
                      <div className="lease-type-title">🏢 Persona Moral (S.A. / S.A.P.I. / S. de R.L.)</div>
                      <div className="lease-type-desc">Deducción de hasta el 100% de la renta según el tipo de activo.</div>
                    </div>
                    <div 
                      onClick={() => setFormData({ ...formData, tipoPersona: 'fisica' })}
                      className={`lease-type-option ${formData.tipoPersona === 'fisica' ? 'active' : ''}`}
                    >
                      <div className="lease-type-title">👤 Persona Física con Actividad Empresarial</div>
                      <div className="lease-type-desc">Deducción para profesionistas independientes y socios de negocio.</div>
                    </div>
                  </div>

                  <div className="form-group-custom">
                    <label className="form-label-custom">Antigüedad de la Empresa</label>
                    <div className="option-grid">
                      {['Menos de 1 año', '1 a 2 años', '3 a 5 años', 'Más de 5 años'].map(ant => (
                        <button 
                          key={ant}
                          type="button"
                          onClick={() => setFormData({ ...formData, antiguedad: ant })}
                          className={`btn-option ${formData.antiguedad === ant ? 'active' : ''}`}
                        >
                          {ant}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                    <button 
                      type="button" 
                      onClick={() => setWizardPaso(2)}
                      className="btn-hero-primary"
                    >
                      Continuar a Activo & Plazo ↗
                    </button>
                  </div>
                </div>
              )}

              {wizardPaso === 2 && (
                <div>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ap-navy-primary)', marginBottom: '1.5rem' }}>
                    2. Requerimientos de Arrendamiento
                  </h4>

                  <div className="form-group-custom">
                    <label className="form-label-custom">Tipo de Activo Prioritario</label>
                    <select 
                      value={tipoActivo}
                      onChange={(e) => setTipoActivo(e.target.value)}
                      className="input-corporate"
                    >
                      <option value="vehicular">🚗 Flotillas & Vehículos Ejecutivos</option>
                      <option value="maquinaria">🚜 Maquinaria Pesada & Construcción</option>
                      <option value="ti-computo">💻 Equipo de Cómputo & TI</option>
                      <option value="oficina-mobiliario">🏢 Mobiliario & Oficinas</option>
                      <option value="medico">🏥 Equipo Médico & Laboratorio</option>
                      <option value="industrial">🏭 Maquinaria Industrial</option>
                    </select>
                  </div>

                  <div className="form-group-custom">
                    <label className="form-label-custom">Rango de Facturación Anual Estimada</label>
                    <select 
                      value={formData.facturacionAnual}
                      onChange={(e) => setFormData({ ...formData, facturacionAnual: e.target.value })}
                      className="input-corporate"
                    >
                      <option>Hasta $5,000,000 MXN</option>
                      <option>De $5,000,000 a $25,000,000 MXN</option>
                      <option>De $25,000,000 a $100,000,000 MXN</option>
                      <option>Más de $100,000,000 MXN</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                    <button 
                      type="button" 
                      onClick={() => setWizardPaso(1)}
                      className="btn-header-secondary"
                    >
                      ← Volver
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setWizardPaso(3)}
                      className="btn-hero-primary"
                    >
                      Continuar a Datos Empresa ↗
                    </button>
                  </div>
                </div>
              )}

              {wizardPaso === 3 && (
                <div>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ap-navy-primary)', marginBottom: '1.5rem' }}>
                    3. Datos de la Empresa y Contacto
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>Razón Social / Empresa</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ej. Continental Logistics S.A. de C.V."
                        value={formData.empresa}
                        onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                        className="input-corporate"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>RFC de la Empresa</label>
                      <input 
                        type="text" 
                        required
                        placeholder="CLO190325AAA"
                        value={formData.rfc}
                        onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                        className="input-corporate"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>Nombre del Contacto / Cargo</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Lic. Roberto Garza (Dir. Finanzas)"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        className="input-corporate"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>Teléfono Móvil / WhatsApp</label>
                      <input 
                        type="tel" 
                        required
                        placeholder="446 265 3197"
                        value={formData.telefono}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                        className="input-corporate"
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>Correo Electrónico Institucional</label>
                    <input 
                      type="email" 
                      required
                      placeholder="gerencia@empresa.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input-corporate"
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                    <button 
                      type="button" 
                      onClick={() => setWizardPaso(2)}
                      className="btn-header-secondary"
                    >
                      ← Volver
                    </button>
                    <button 
                      type="submit" 
                      disabled={submitting}
                      className="btn-hero-primary"
                    >
                      {submitting ? 'Emitiendo Dictamen...' : 'Emitir Solicitud Formal ↗'}
                    </button>
                  </div>
                </div>
              )}

            </form>
          )}

        </div>
      </section>

      {/* FOOTER CORPORATIVO OFICIAL */}
      <footer className="corporate-footer">
        <div className="footer-container">
          
          <div className="footer-top-grid">
            
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <img 
                  src="/axispoint-logo-pure.png" 
                  alt="AXISPOINT CONTINENTAL" 
                  style={{ height: '36px', width: 'auto', borderRadius: '4px', background: '#fff', padding: '2px 8px' }}
                />
              </div>
              <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                <strong>AXISPOINT CONTINENTAL, S.A. DE C.V.</strong><br />
                Entidad financiera especializada en arrendamiento puro, Sale & Leaseback y estructuración de activos para empresas en México.
              </p>
              <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                <strong>Sede Corporativa:</strong> Querétaro, Querétaro.<br />
                <strong>Teléfono Oficial:</strong> 446 265 3197<br />
                <strong>Atención:</strong> gerencia@axispointc.com • contabilidad@axispointc.com
              </div>
            </div>

            <div>
              <h4 className="footer-col-title">Líneas de Arrendamiento</h4>
              <ul className="footer-links-list">
                <li><a href="#paquetes" className="footer-link">Flotillas & Vehículos</a></li>
                <li><a href="#paquetes" className="footer-link">Maquinaria Pesada & Agro</a></li>
                <li><a href="#paquetes" className="footer-link">Equipo de Cómputo & TI</a></li>
                <li><a href="#paquetes" className="footer-link">Mobiliario de Oficinas</a></li>
                <li><a href="#paquetes" className="footer-link">Equipo Médico</a></li>
                <li><a href="#paquetes" className="footer-link">Maquinaria Industrial</a></li>
              </ul>
            </div>

            <div>
              <h4 className="footer-col-title">Institucional</h4>
              <ul className="footer-links-list">
                <li><a href="#nosotros" className="footer-link">Quiénes Somos</a></li>
                <li><a href="#nosotros" className="footer-link">Misión y Visión</a></li>
                <li><a href="#nosotros" className="footer-link">Valores Corporativos</a></li>
                <li><a href="#nosotros" className="footer-link">Credenciales y Solvencia</a></li>
                <li><a href="tel:+524462653197" className="footer-link">Línea Directa (446 265 3197)</a></li>
              </ul>
            </div>

            <div>
              <h4 className="footer-col-title">Mesa de Dictamen</h4>
              <ul className="footer-links-list">
                <li><a href="#cotizador" className="footer-link">Simulador Financiero</a></li>
                <li><a href="#modalidades" className="footer-link">Modalidades: Puro & Sale & Leaseback</a></li>
                <li><a href="#comparativa" className="footer-link">Matriz Comparativa</a></li>
                <li><a href="#beneficios" className="footer-link">Ventajas Fiscales (LISR)</a></li>
                <li><a href="#precalificador" className="footer-link">Precalificación en Línea</a></li>
              </ul>
            </div>

          </div>

          <div className="footer-bottom-bar">
            <div>
              © 2026 AXISPOINT CONTINENTAL, S.A. DE C.V. Todos los derechos reservados. • CFDI 4.0 Timbrado SAT • Deducción Art. 28 LISR
            </div>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <span>Aviso Legal</span>
              <span>Privacidad de Datos</span>
              <span>Mesa de Transparencia</span>
            </div>
          </div>

        </div>
      </footer>

      {/* MODAL: Cotización Formal Membretada */}
      {showCotizacionModal && (
        <div className="modal-overlay" onClick={() => setShowCotizacionModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--ap-border)', paddingBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--ap-navy-primary)' }}>
                Solicitar Corrida Financiera Membretada
              </h3>
              <button 
                onClick={() => setShowCotizacionModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: 'var(--ap-bg-alt)', border: '1px solid var(--ap-border)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.88rem' }}>
              <div><strong>Activo:</strong> {tipoActivo.toUpperCase()} (${montoActivo.toLocaleString('es-MX')} MXN)</div>
              <div><strong>Esquema:</strong> Arrendamiento {modalidadLeasing === 'puro' ? 'Puro (100% Deducible)' : 'Financiero'} • <strong>Plazo:</strong> {plazoMeses} Meses</div>
              <div><strong>Renta Mensual Estimada:</strong> <span style={{ color: 'var(--ap-red-primary)', fontWeight: 800 }}>${Math.round(mensualidadTotal).toLocaleString('es-MX')} MXN (c/IVA)</span></div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              alert(`¡Gracias ${contactData.nombre || contactData.empresa}! La corrida financiera formal membretada de AXISPOINT CONTINENTAL ha sido generada y enviada a ${contactData.email}.`);
              setShowCotizacionModal(false);
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Nombre Completo</label>
                <input 
                  type="text" 
                  required
                  placeholder="Lic. Fernando Torres"
                  value={contactData.nombre}
                  onChange={(e) => setContactData({ ...contactData, nombre: e.target.value })}
                  className="input-corporate"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Empresa o Razón Social</label>
                <input 
                  type="text" 
                  required
                  placeholder="Industrias del Centro S.A. de C.V."
                  value={contactData.empresa}
                  onChange={(e) => setContactData({ ...contactData, empresa: e.target.value })}
                  className="input-corporate"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Teléfono / WhatsApp</label>
                  <input 
                    type="tel" 
                    required
                    placeholder="446 265 3197"
                    value={contactData.telefono}
                    onChange={(e) => setContactData({ ...contactData, telefono: e.target.value })}
                    className="input-corporate"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Correo Institucional</label>
                  <input 
                    type="email" 
                    required
                    placeholder="direccion@empresa.com"
                    value={contactData.email}
                    onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                    className="input-corporate"
                  />
                </div>
              </div>

              <button type="submit" className="result-cta-btn">
                Enviar y Descargar PDF Membretado ↗
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Mesa de Control CRM */}
      {showAdminCrmModal && (
        <div className="modal-overlay" onClick={() => setShowAdminCrmModal(false)}>
          <div className="modal-card" style={{ maxWidth: '850px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--ap-border)', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--ap-navy-primary)' }}>
                  📊 Mesa de Control • AXISPOINT CONTINENTAL
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--ap-text-muted)' }}>Expedientes de arrendamiento registrados</span>
              </div>
              <button 
                onClick={() => setShowAdminCrmModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            {loadingLeads ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ap-text-muted)' }}>Cargando expedientes...</div>
            ) : crmLeads.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ap-text-muted)' }}>
                No hay solicitudes registradas aún. Las solicitudes enviadas aparecerán aquí de inmediato.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--ap-bg-subtle)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--ap-border)' }}>Folio</th>
                      <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--ap-border)' }}>Empresa / RFC</th>
                      <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--ap-border)' }}>Línea / Activo</th>
                      <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--ap-border)' }}>Plazo</th>
                      <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--ap-border)' }}>Renta Mensual</th>
                      <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--ap-border)' }}>Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crmLeads.map((lead, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--ap-border)' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--ap-red-primary)' }}>{lead.folio}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <strong>{lead.empresa || lead.nombre}</strong><br />
                          <span style={{ fontSize: '0.75rem', color: 'var(--ap-text-muted)' }}>{lead.rfc || lead.email}</span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>{lead.activoSeleccionado || '$' + lead.montoActivo?.toLocaleString('es-MX')}</td>
                        <td style={{ padding: '0.75rem' }}>{lead.plazoMeses}m</td>
                        <td style={{ padding: '0.75rem', fontWeight: 700 }}>${lead.mensualidadEstimada?.toLocaleString('es-MX')} MXN</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ background: '#dbeafe', color: '#1e40af', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {lead.estatus || 'En Revisión'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Portal Clientes Demo */}
      {showPortalClienteModal && (
        <div className="modal-overlay" onClick={() => setShowPortalClienteModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--ap-border)', paddingBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--ap-navy-primary)' }}>
                👤 Portal de Clientes Corporativos
              </h3>
              <button 
                onClick={() => setShowPortalClienteModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--ap-text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Descarga de CFDIs 4.0 mensuales, estados de cuenta, pólizas de seguro vigentes y reportes de contratos activos.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>RFC de la Empresa</label>
              <input type="text" placeholder="RFC de la Empresa" className="input-corporate" defaultValue="CLO190325AAA" />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Contraseña</label>
              <input type="password" placeholder="••••••••••••" className="input-corporate" defaultValue="password123" />
            </div>

            <button 
              onClick={() => {
                alert('Acceso verificado. Mostrando 4 contratos de arrendamiento activos.');
                setShowPortalClienteModal(false);
              }}
              className="btn-hero-primary" 
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Ingresar al Portal ↗
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
