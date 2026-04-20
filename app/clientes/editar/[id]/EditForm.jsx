'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { actualizarCliente } from '../../acciones'

export default function EditForm({ cliente }) {
  const router = useRouter()
  const [cargando, setCargando] = useState(false)
  const [msg, setMsg] = useState(null)
  
  const [formData, setFormData] = useState({
    rfc: cliente.rfc || '',
    razonSocial: cliente.razonSocial || '',
    regimen: cliente.regimen || '',
    codigoPostal: cliente.codigoPostal || '',
    usoCfdi: cliente.usoCfdi || 'G03',
    correoDestino: cliente.correoDestino || '',
    correoDestino2: cliente.correoDestino2 || '',
    correoDestino3: cliente.correoDestino3 || '',
    calle: cliente.calle || '',
    numExterior: cliente.numExterior || '',
    numInterior: cliente.numInterior || '',
    colonia: cliente.colonia || '',
    municipio: cliente.municipio || '',
    ciudad: cliente.ciudad || '',
    estado: cliente.estado || '',
    contactoPrincipal: cliente.contactoPrincipal || '',
    telefono: cliente.telefono || '',
    condicionesPago: cliente.condicionesPago || '',
    cuentaBancaria: cliente.cuentaBancaria || ''
  })

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)
    setMsg(null)

    const result = await actualizarCliente(cliente.id, formData)
    
    if (result.success) {
      setMsg({ type: 'success', text: '✅ Cliente actualizado exitosamente.' })
      setTimeout(() => {
        router.push('/clientes')
        router.refresh()
      }, 1500)
    } else {
      setMsg({ type: 'error', text: '❌ Error: ' + result.error })
      setCargando(false)
    }
  }

  return (
    <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="form-group">
            <label>RFC (Identificador Fiscal)</label>
            <input required type="text" name="rfc" value={formData.rfc} onChange={handleChange} className="form-control" />
          </div>
          <div className="form-group">
            <label>Razón Social Oficial</label>
            <input required type="text" name="razonSocial" value={formData.razonSocial} onChange={handleChange} className="form-control" />
          </div>
          <div className="form-group">
            <label>Régimen Fiscal (Clave SAT)</label>
            <select name="regimen" value={formData.regimen} onChange={handleChange} className="form-control" required style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                  <option value="">-- Seleccionar Régimen --</option>
                  <option value="601">601 - General de Ley Personas Morales</option>
                  <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
                  <option value="605">605 - Sueldos y Salarios e Ingresos Asimilados a Salarios</option>
                  <option value="606">606 - Arrendamiento</option>
                  <option value="607">607 - Régimen de Enajenación o Adquisición de Bienes</option>
                  <option value="608">608 - Demás ingresos</option>
                  <option value="609">609 - Consolidación</option>
                  <option value="610">610 - Residentes en el Extranjero sin E.P. en México</option>
                  <option value="611">611 - Ingresos por Dividendos (socios y accionistas)</option>
                  <option value="612">612 - Personas Físicas con Actividades Empresariales y Profesionales</option>
                  <option value="614">614 - Ingresos por intereses</option>
                  <option value="615">615 - Régimen de los ingresos por obtención de premios</option>
                  <option value="616">616 - Sin obligaciones fiscales</option>
                  <option value="620">620 - Sociedades Cooperativas de Producción</option>
                  <option value="621">621 - Incorporación Fiscal</option>
                  <option value="622">622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras</option>
                  <option value="623">623 - Opcional para Grupos de Sociedades</option>
                  <option value="624">624 - Coordinados</option>
                  <option value="625">625 - Régimen de las Actividades Emp. Plataformas Tecnológicas</option>
                  <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Código Postal Fiscal</label>
            <input required type="text" name="codigoPostal" value={formData.codigoPostal} onChange={handleChange} className="form-control" maxLength="5" />
          </div>
          <div className="form-group">
             <label>Uso de CFDI Predefinido</label>
             <select name="usoCfdi" value={formData.usoCfdi} onChange={handleChange} className="form-control" required>
                <option value="G03">G03 - Gastos en general</option>
                <option value="G01">G01 - Adquisición de mercancias</option>
                <option value="I08">I08 - Otra maquinaria o Eq.</option>
                <option value="S01">S01 - Sin efectos fiscales</option>
             </select>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />

        <h3 style={{ color: 'var(--primary)' }}>Contacto y Comercial (CRM)</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem' }}>
          <div className="form-group">
            <label>Contacto Principal</label>
            <input type="text" name="contactoPrincipal" value={formData.contactoPrincipal} onChange={handleChange} className="form-control" />
          </div>
          <div className="form-group">
            <label>Teléfono Principal</label>
            <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} className="form-control" />
          </div>
          <div className="form-group">
            <label>Condiciones de Pago (Días)</label>
            <select name="condicionesPago" value={formData.condicionesPago} onChange={handleChange} className="form-control" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <option value="">-- Seleccionar --</option>
              <option value="Contado">Contado</option>
              <option value="15 Días">15 Días</option>
              <option value="30 Días">30 Días</option>
              <option value="45 Días">45 Días</option>
              <option value="60 Días">60 Días</option>
              <option value="90 Días">90 Días</option>
            </select>
          </div>
          <div className="form-group">
            <label>Cuenta Bancaria principal (Opcional)</label>
            <input type="text" name="cuentaBancaria" value={formData.cuentaBancaria} onChange={handleChange} className="form-control" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Correos Electrónicos para Facturación y Notificaciones</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: '1rem' }}>
              <input type="email" name="correoDestino" value={formData.correoDestino} onChange={handleChange} className="form-control" placeholder="Correo principal" />
              <input type="email" name="correoDestino2" value={formData.correoDestino2} onChange={handleChange} className="form-control" placeholder="Segundo correo" />
              <input type="email" name="correoDestino3" value={formData.correoDestino3} onChange={handleChange} className="form-control" placeholder="Tercer correo" />
            </div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />

        <h3 style={{ color: 'var(--primary)' }}>Datos Logísticos Adicionales</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem' }}>
          <div className="form-group">
            <label>Calle</label>
            <input type="text" name="calle" value={formData.calle} onChange={handleChange} className="form-control" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem' }}>
             <div className="form-group">
               <label>N° Exterior</label>
               <input type="text" name="numExterior" value={formData.numExterior} onChange={handleChange} className="form-control" />
             </div>
             <div className="form-group">
               <label>N° Interior</label>
               <input type="text" name="numInterior" value={formData.numInterior} onChange={handleChange} className="form-control" />
             </div>
          </div>
          
          <div className="form-group">
            <label>Colonia / Asentamiento</label>
            <input type="text" name="colonia" value={formData.colonia} onChange={handleChange} className="form-control" />
          </div>
          <div className="form-group">
            <label>Municipio / Alcaldía</label>
            <input type="text" name="municipio" value={formData.municipio} onChange={handleChange} className="form-control" />
          </div>
          
          <div className="form-group">
            <label>Ciudad</label>
            <input type="text" name="ciudad" value={formData.ciudad} onChange={handleChange} className="form-control" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Estado</label>
            <input type="text" name="estado" value={formData.estado} onChange={handleChange} className="form-control" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
           <button type="submit" disabled={cargando} className="btn" style={{ flex: 1 }}>
             {cargando ? 'Guardando en la Nube...' : 'Confirmar Edición'}
           </button>
           <Link href="/clientes" className="btn btn-secondary" style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}>
             Cancelar y Volver
           </Link>
        </div>

        {msg && (
          <div style={{ padding: '1rem', borderRadius: '8px', color: '#fff', backgroundColor: msg.type === 'error' ? 'rgba(255,0,0,0.3)' : 'rgba(0,255,0,0.3)'}}>
             {msg.text}
          </div>
        )}
      </form>
    </div>
  )
}
