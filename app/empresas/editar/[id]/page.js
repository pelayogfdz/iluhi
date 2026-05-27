import prisma from '../../../../lib/prisma';
import { redirect } from 'next/navigation'
import EditForm from './EditForm'
import CsdUploader from './CsdUploader'
import FielUploader from './FielUploader'
import ImssUploader from './ImssUploader'
import SociosPanel from './SociosPanel'
import Facturapi from 'facturapi'

export const dynamic = 'force-dynamic'

const facturapiAdmin = new Facturapi(process.env.FACTURAPI_USER_KEY)

export default async function EditarEmpresaPage({ params }) {
  const { id } = await params
  const empresa = await prisma.empresa.findUnique({
    where: { id }
  })

  if (!empresa) {
    redirect('/empresas')
  }

  // Fetch Facturapi organization to get certificate expiration dates & logo
  let facturapiOrg = null;
  try {
    if (empresa.facturapiId) {
      facturapiOrg = await facturapiAdmin.organizations.retrieve(empresa.facturapiId);
    }
  } catch (err) {
    console.error("Error fetching Facturapi Org details:", err.message);
  }

  const csdExpiresAt = facturapiOrg?.certificate?.expires_at || null;
  const fielExpiresAt = facturapiOrg?.fiel?.expires_at || null;
  const logoUrl = facturapiOrg?.logo_url || null;

  // Serializar fechas para pasar a client components
  const empresaData = {
    ...empresa,
    fielVigencia: fielExpiresAt ? new Date(fielExpiresAt).toISOString() : (empresa.fielVigencia ? empresa.fielVigencia.toISOString() : null),
    csdVigencia: csdExpiresAt ? new Date(csdExpiresAt).toISOString() : null,
    createdAt: empresa.createdAt.toISOString(),
    updatedAt: empresa.updatedAt.toISOString(),
    logoUrl
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {empresaData.logoUrl && (
             <img src={empresaData.logoUrl} alt="Logo de Empresa" style={{ height: '60px', width: '60px', objectFit: 'contain', background: 'white', borderRadius: '8px', padding: '4px' }} />
          )}
          <h1 style={{ margin: 0 }}>Modificar Empresa Emisora</h1>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <a href={`/api/empresas/${id}/exportar-expediente`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
             <button className="btn" style={{ background: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📄 Exportar Info</button>
          </a>
          <a href={`/empresas/editar/${id}/expediente`} style={{ textDecoration: 'none' }}>
             <button className="btn" style={{ background: '#10b981' }}>Anexos Extras</button>
          </a>
        </div>
      </div>
      
      <EditForm empresa={empresaData} />
      
      <h3 style={{ marginTop: '3rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>Credenciales, Certificados y Facturapi</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'stretch' }}>
        <CsdUploader empresa={empresaData} />
        <FielUploader empresa={empresaData} />
        <ImssUploader empresa={empresaData} />
      </div>

      <div style={{ marginTop: '3rem' }}>
        <SociosPanel empresaId={empresa.id} />
      </div>
    </div>
  )
}
