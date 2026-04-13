import { redirect } from 'next/navigation'
import Link from 'next/link'
import prisma from '../../../lib/prisma';

async function createCliente(formData) {
  'use server'


  
  const rfc = formData.get('rfc')
  const razonSocial = formData.get('razonSocial')
  const regimen = formData.get('regimen')
  const codigoPostal = formData.get('codigoPostal')
  const usoCfdi = formData.get('usoCfdi')
  
  await prisma.cliente.create({
    data: {
      rfc,
      razonSocial,
      regimen,
      codigoPostal,
      usoCfdi
    }
  })
  
  redirect('/clientes')
}

export default async function NuevoClientePage() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <h1>Alta de Cliente CFDI 4.0</h1>
         <Link href="/clientes"><button className="btn btn-secondary">Regresar</button></Link>
      </div>
      
      <div className="glass-panel" style={{ marginTop: '2rem', maxWidth: '600px' }}>
        <form action={createCliente} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          <div className="form-group">
            <label htmlFor="rfc">RFC del Cliente</label>
            <input type="text" id="rfc" name="rfc" className="form-control" required placeholder="Ej. XAXX010101000" />
            <small style={{ color: 'var(--text-secondary)' }}>Debe tener 12 o 13 caracteres.</small>
          </div>

          <div className="form-group">
            <label htmlFor="razonSocial">Razón Social (idéntica a Constancia Fiscal)</label>
            <input type="text" id="razonSocial" name="razonSocial" className="form-control" required placeholder="Ej. PUBLICO EN GENERAL" />
            <small style={{ color: 'var(--text-secondary)' }}>Sin régimen societario (S.A. de C.V.) para CFDI 4.0</small>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="regimen">Régimen Fiscal Receptor</label>
                <input type="text" id="regimen" name="regimen" className="form-control" required placeholder="Ej. 616" />
              </div>

              <div className="form-group">
                <label htmlFor="codigoPostal">Domicilio Fiscal (C.P.)</label>
                <input type="text" id="codigoPostal" name="codigoPostal" className="form-control" required placeholder="Ej. 11000" />
              </div>
          </div>

          <div className="form-group">
            <label htmlFor="usoCfdi">Uso de CFDI por defecto</label>
            <select id="usoCfdi" name="usoCfdi" className="form-control" required style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <option value="G03">G03 - Gastos en general</option>
              <option value="S01">S01 - Sin efectos fiscales</option>
              <option value="P01">P01 - Por definir</option>
              <option value="D01">D01 - Honorarios médicos, dentales y hospitalarios</option>
              <option value="I08">I08 - Otra maquinaria y equipo</option>
            </select>
          </div>

          <button type="submit" className="btn">Guardar Cliente</button>
        </form>
      </div>
    </div>
  )
}
