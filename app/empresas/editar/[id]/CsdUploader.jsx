'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { subirCSD } from '../../acciones'

export default function CsdUploader({ empresa }) {
  const router = useRouter()
  const [cargando, setCargando] = useState(false)
  const [msg, setMsg] = useState(null)

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)
    setMsg(null)

    try {
      const cerFile = e.target.cerFile.files[0];
      const keyFile = e.target.keyFile.files[0];
      const passwordCsd = e.target.passwordCsd.value;

      if (!cerFile || !keyFile) {
        throw new Error("Selecciona ambos archivos");
      }

      const cerBase64 = await toBase64(cerFile);
      const keyBase64 = await toBase64(keyFile);

      const res = await subirCSD(empresa.id, cerBase64, keyBase64, passwordCsd);
      
      if(res.success) {
         setMsg({ type: 'success', text: '✅ Bóveda CSD configurada. La empresa ya puede timbrar.'})
         setTimeout(() => {
            router.refresh()
            setMsg(null)
         }, 2000)
      } else {
         setMsg({ type: 'error', text: '❌ Error: ' + res.error})
      }
    } catch (err) {
      setMsg({ type: 'error', text: '❌ Error de lectura: ' + err.message})
    }
    setCargando(false)
  }

  return (
    <div className="glass-panel" style={{ marginTop: '2rem', border: '1px solid var(--primary)' }}>
       <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>🛡️ Bóveda de Sellos Digitales (CSD)</h3>
       <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
         {empresa.cerPath 
           ? "✅ Esta empresa YA tiene un CSD inyectado en el motor. (Sube nuevos archivos si el CSD expiró)." 
           : "❌ Empresa inactiva para emitir. Necesitas inyectar el certificado del SAT."}
       </p>
       
       <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem', alignItems: 'end' }}>
          
          <div className="form-group">
             <label>Archivo .CER</label>
             <input type="file" id="cerFile" name="cerFile" accept=".cer" required className="form-control" style={{ padding: '0.5rem' }}/>
          </div>

          <div className="form-group">
             <label>Archivo .KEY</label>
             <input type="file" id="keyFile" name="keyFile" accept=".key" required className="form-control" style={{ padding: '0.5rem' }}/>
          </div>

          <div className="form-group">
             <label>Contraseña del Sello Privado</label>
             <input type="password" id="passwordCsd" name="passwordCsd" required className="form-control" placeholder="*************"/>
          </div>

          <button type="submit" disabled={cargando} className="btn" style={{ height: '42px' }}>
             {cargando ? 'Inyectando...' : 'Subir y Sellar Configuración'}
          </button>
       </form>

       {msg && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '8px', color: '#fff', backgroundColor: msg.type === 'error' ? 'rgba(255,0,0,0.3)' : 'rgba(0,255,0,0.3)'}}>
             {msg.text}
          </div>
        )}
    </div>
  )
}
