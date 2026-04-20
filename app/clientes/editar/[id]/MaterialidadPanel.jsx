'use client'

import { useState } from 'react'
import { subirEvidenciaCliente, eliminarEvidenciaCliente } from '../../acciones'

export default function MaterialidadPanel({ clienteId, archivos = [] }) {
  const [uploading, setUploading] = useState(false)
  const [docsLocal, setDocsLocal] = useState(archivos)

  const handleUploadFile = async (e, categoria) => {
    const file = e.target.files[0]
    if (!file) return
    
    // Alerta de peso optimista (5MB)
    if(file.size > 5 * 1024 * 1024) {
       alert("El archivo excede los 5MB, por favor comprímelo antes de subir.")
       e.target.value = ''
       return
    }

    setUploading(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result
      const res = await subirEvidenciaCliente(clienteId, file.name, base64, categoria)
      setUploading(false)
      if (res.error) {
        alert(res.error)
      } else {
        setDocsLocal(prev => [...prev, res.doc])
      }
      e.target.value = ''
    }
    reader.readAsDataURL(file)
  }

  const handleEliminar = async (idFile) => {
    if(!confirm('¿Seguro de eliminar este archivo?')) return
    const res = await eliminarEvidenciaCliente(idFile, clienteId)
    if (res.success) {
      setDocsLocal(prev => prev.filter(d => d.id !== idFile))
    } else {
      alert(res.error)
    }
  }

  const renderFileList = (docs) => {
    if(docs.length === 0) return <p style={{ color: 'var(--text-secondary)' }}>No hay archivos documentados.</p>
    return (
      <div className="table-container" style={{ marginTop: '1rem' }}>
        <table className="table">
          <thead>
             <tr>
               <th>Documento de Materialidad</th>
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

  return (
    <div className="glass-panel card" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '2rem' }}>📁</span>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Materialidad y Evidencias de Servicio</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Repositorio para almacenar contratos, entregables, fotografías y evidencia para soportar deducciones fiscales.
          </p>
        </div>
      </div>

      {uploading && <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '8px', textAlign: 'center' }}>Subiendo documento, por favor espera...</div>}

      <div style={{ display: 'grid', gap: '2rem', marginTop: '1rem' }}>
         <section>
            <h3 style={{ color: 'var(--primary)' }}>Contratos y Acuerdos</h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
               <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => handleUploadFile(e, 'CONTRATOS')} disabled={uploading} className="form-control" />
            </div>
            {renderFileList(docsLocal.filter(d => d.categoria === 'CONTRATOS'))}
         </section>

         <hr style={{ border: 'none', borderTop: '1px outset rgba(255,255,255,0.1)' }} />

         <section>
            <h3 style={{ color: 'var(--primary)' }}>Entregables y Reportes</h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
               <input type="file" accept=".pdf,.zip,.rar,.xlsx,.jpg,.png" onChange={(e) => handleUploadFile(e, 'ENTREGABLES')} disabled={uploading} className="form-control" />
            </div>
            {renderFileList(docsLocal.filter(d => d.categoria === 'ENTREGABLES'))}
         </section>

         <hr style={{ border: 'none', borderTop: '1px outset rgba(255,255,255,0.1)' }} />

         <section>
            <h3 style={{ color: 'var(--primary)' }}>Evidencia Física (Fotografías / Screenshots)</h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
               <input type="file" accept="image/*,.pdf" onChange={(e) => handleUploadFile(e, 'EVIDENCIA_FISICA')} disabled={uploading} className="form-control" />
               <small style={{ color: 'var(--text-secondary)' }}>Material probatorio (Fotos, capturas).</small>
            </div>
            {renderFileList(docsLocal.filter(d => d.categoria === 'EVIDENCIA_FISICA'))}
         </section>
      </div>
    </div>
  )
}
