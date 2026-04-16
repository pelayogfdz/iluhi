'use client'

import { useState } from 'react'
import { subirArchivoExpediente, eliminarArchivoExpediente, guardarTextosPlaneacion } from './acciones'

export default function ExpedienteClient({ empresaId, objetoSocial, actividadEconomica, archivos }) {
  const [tab, setTab] = useState('EXPEDIENTE')
  
  // State from Planeación
  const [tempObjeto, setTempObjeto] = useState(objetoSocial || '')
  const [tempActividad, setTempActividad] = useState(actividadEconomica || '')
  const [guardandoTextos, setGuardandoTextos] = useState(false)
  
  // State for file uploads
  const [uploading, setUploading] = useState(false)

  const handleGuardarPlaneacion = async () => {
    setGuardandoTextos(true)
    const res = await guardarTextosPlaneacion(empresaId, tempObjeto, tempActividad)
    setGuardandoTextos(false)
    if(res.error) alert(res.error)
    else alert('Planeación guardada exitosamente')
  }

  const handleUploadFile = async (e, categoria, tipoDocumento) => {
    const file = e.target.files[0]
    if (!file) return
    
    // Alerta de peso optimista (5MB) para no tronar Base64 fácilmente
    if(file.size > 5 * 1024 * 1024) {
       alert("El archivo excede los 5MB, por favor comprímelo antes de subir.")
       e.target.value = ''
       return
    }

    setUploading(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result
      const res = await subirArchivoExpediente(empresaId, file.name, base64, categoria, tipoDocumento)
      setUploading(false)
      if (res.error) alert(res.error)
      // reset form
      e.target.value = ''
    }
    reader.readAsDataURL(file)
  }

  const handleEliminar = async (idFile) => {
    if(!confirm('¿Seguro de eliminar este archivo?')) return
    await eliminarArchivoExpediente(idFile, empresaId)
  }

  const renderFileList = (docs) => {
    if(docs.length === 0) return <p style={{ color: 'var(--text-secondary)' }}>No hay archivos documentados.</p>
    return (
      <div className="table-container" style={{ marginTop: '1rem' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nombre de Archivo</th>
              <th>Fecha Subida</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {docs.map(doc => (
              <tr key={doc.id}>
                <td>
                  <a href={doc.archivoBase64} download={doc.nombreArchivo} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>
                    {doc.nombreArchivo}
                  </a>
                </td>
                <td>{new Date(doc.fechaSubida).toLocaleDateString()}</td>
                <td style={{ width: '100px'}}>
                  <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', color: '#ef4444' }} onClick={() => handleEliminar(doc.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const expedienteDocs = archivos.filter(a => a.categoria === 'EXPEDIENTE')
  const planeacionDocs = archivos.filter(a => a.categoria === 'PLANEACION')

  return (
    <div className="glass-panel" style={{ minHeight: '600px' }}>
      
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', marginBottom: '2rem' }}>
         <button 
           onClick={() => setTab('EXPEDIENTE')}
           style={{ background: 'none', border: 'none', color: tab === 'EXPEDIENTE' ? 'var(--primary)' : 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', borderBottom: tab === 'EXPEDIENTE' ? '2px solid var(--primary)' : 'none', paddingBottom: '0.5rem' }}
         >
           Expediente Corporativo
         </button>
         <button 
           onClick={() => setTab('PLANEACION')}
           style={{ background: 'none', border: 'none', color: tab === 'PLANEACION' ? 'var(--primary)' : 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', borderBottom: tab === 'PLANEACION' ? '2px solid var(--primary)' : 'none', paddingBottom: '0.5rem' }}
         >
           Planeación
         </button>
      </div>

      {uploading && <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '8px', textAlign: 'center' }}>Subiendo documento, por favor espera...</div>}

      {/* Tab Content: Expediente */}
      {tab === 'EXPEDIENTE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
           
           <section>
              <h2>Acta Constitutiva</h2>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                 <input type="file" onChange={(e) => handleUploadFile(e, 'EXPEDIENTE', 'ACTA_CONSTITUTIVA')} disabled={uploading} className="form-control" />
              </div>
              {renderFileList(expedienteDocs.filter(d => d.tipoDocumento === 'ACTA_CONSTITUTIVA'))}
           </section>

           <section>
              <h2>Asambleas</h2>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                 <input type="file" onChange={(e) => handleUploadFile(e, 'EXPEDIENTE', 'ASAMBLEA')} disabled={uploading} className="form-control" />
                 <small style={{ color: 'var(--text-secondary)' }}>Sube múltiples actas subiendo una por una.</small>
              </div>
              {renderFileList(expedienteDocs.filter(d => d.tipoDocumento === 'ASAMBLEA'))}
           </section>

           <section>
              <h2>Poderes Notariales</h2>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                 <input type="file" onChange={(e) => handleUploadFile(e, 'EXPEDIENTE', 'PODERES')} disabled={uploading} className="form-control" />
              </div>
              {renderFileList(expedienteDocs.filter(d => d.tipoDocumento === 'PODERES'))}
           </section>

           <section>
              <h2>Identificaciones de Socios y Apoderados</h2>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                 <input type="file" onChange={(e) => handleUploadFile(e, 'EXPEDIENTE', 'IDENTIFICACIONES')} disabled={uploading} className="form-control" />
              </div>
              {renderFileList(expedienteDocs.filter(d => d.tipoDocumento === 'IDENTIFICACIONES'))}
           </section>

        </div>
      )}

      {/* Tab Content: Planeación */}
      {tab === 'PLANEACION' && (
        <div className="responsive-columns">
           
           {/* Formulario Izquierdo: Textos */}
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="form-group">
                 <label>Objeto Social de la Empresa</label>
                 <textarea 
                   className="form-control" 
                   rows="5"
                   placeholder="Escribe o pega aquí el objeto social predominante..."
                   value={tempObjeto}
                   onChange={e => setTempObjeto(e.target.value)}
                 />
              </div>

              <div className="form-group">
                 <label>Actividad Económica (CSF)</label>
                 <div style={{ fontSize: '0.8rem', color: '#10b981', marginBottom: '0.5rem' }}>* Esta información se alineará con las Constancias de Situación Fiscal recabadas.</div>
                 <textarea 
                   className="form-control" 
                   rows="3"
                   placeholder="Actividad económica registrada en el SAT..."
                   value={tempActividad}
                   onChange={e => setTempActividad(e.target.value)}
                 />
              </div>

              <button className="btn" onClick={handleGuardarPlaneacion} disabled={guardandoTextos}>
                 {guardandoTextos ? 'Guardando...' : 'Guardar Datos de Planeación'}
              </button>
           </div>

           {/* Uploader Derecho: Contratos y Entregables */}
           <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
              
               <section>
                  <h3>Contratos con Clientes</h3>
                  <input type="file" onChange={(e) => handleUploadFile(e, 'PLANEACION', 'CONTRATO_CLIENTE')} disabled={uploading} className="form-control" style={{ width: '100%', marginBottom: '1rem', marginTop: '0.5rem' }} />
                  {renderFileList(planeacionDocs.filter(d => d.tipoDocumento === 'CONTRATO_CLIENTE'))}
               </section>
               <hr style={{ borderColor: 'var(--border-light)' }}/>

               <section>
                  <h3>Entregables con Clientes</h3>
                  <input type="file" onChange={(e) => handleUploadFile(e, 'PLANEACION', 'ENTREGABLE_CLIENTE')} disabled={uploading} className="form-control" style={{ width: '100%', marginBottom: '1rem', marginTop: '0.5rem' }} />
                  {renderFileList(planeacionDocs.filter(d => d.tipoDocumento === 'ENTREGABLE_CLIENTE'))}
               </section>
               <hr style={{ borderColor: 'var(--border-light)' }}/>

               <section>
                  <h3>Contratos con Proveedores</h3>
                  <input type="file" onChange={(e) => handleUploadFile(e, 'PLANEACION', 'CONTRATO_PROVEEDOR')} disabled={uploading} className="form-control" style={{ width: '100%', marginBottom: '1rem', marginTop: '0.5rem' }} />
                  {renderFileList(planeacionDocs.filter(d => d.tipoDocumento === 'CONTRATO_PROVEEDOR'))}
               </section>
               <hr style={{ borderColor: 'var(--border-light)' }}/>

               <section>
                  <h3>Entregables de Proveedores</h3>
                  <input type="file" onChange={(e) => handleUploadFile(e, 'PLANEACION', 'ENTREGABLE_PROVEEDOR')} disabled={uploading} className="form-control" style={{ width: '100%', marginBottom: '1rem', marginTop: '0.5rem' }} />
                  {renderFileList(planeacionDocs.filter(d => d.tipoDocumento === 'ENTREGABLE_PROVEEDOR'))}
               </section>

           </div>
        </div>
      )}

    </div>
  )
}
