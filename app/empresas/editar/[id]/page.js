import prisma from '../../../../lib/prisma';
import { redirect } from 'next/navigation'
import EditForm from './EditForm'
import CsdUploader from './CsdUploader'
import LogoUploader from './LogoUploader'
import FielUploader from './FielUploader'
import SociosPanel from './SociosPanel'
import Facturapi from 'facturapi'

const facturapiAdmin = new Facturapi(process.env.FACTURAPI_USER_KEY)

export default async function EditarEmpresaPage({ params }) {
  const { id } = await params
  const empresa = await prisma.empresa.findUnique({
    where: { id }
  })

  if (!empresa) {
    redirect('/empresas')
  }

  // Fetch Facturapi organization to get certificate expiration dates
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

  // Serializar fechas para pasar a client components
  const empresaData = {
    ...empresa,
    fielVigencia: fielExpiresAt ? new Date(fielExpiresAt).toISOString() : (empresa.fielVigencia ? empresa.fielVigencia.toISOString() : null),
    csdVigencia: csdExpiresAt ? new Date(csdExpiresAt).toISOString() : null,
    createdAt: empresa.createdAt.toISOString(),
    updatedAt: empresa.updatedAt.toISOString()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <h1>Modificar Empresa Emisora</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <a href={`/empresas/editar/${id}/expediente`} style={{ textDecoration: 'none' }}>
             <button className="btn" style={{ background: '#10b981' }}>Expediente Corporativo</button>
          </a>
        </div>
      </div>
      <EditForm empresa={empresa} />
      <CsdUploader empresa={empresaData} />
      <FielUploader empresa={empresaData} />
      <LogoUploader empresaId={empresa.id} />
      <SociosPanel empresaId={empresa.id} />
    </div>
  )
}
