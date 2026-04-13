'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginUser } from './acciones'
import '../globals.css' // Assegurar carga UI

export default function LoginPage() {
  const router = useRouter()
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError(null);
    
    const res = await loginUser(correo, password);
    if(res.success) {
      router.push('/');
      router.refresh();
    } else {
      setError(res.error);
      setCargando(false);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', background: 'var(--bg-dark)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
           <h1 style={{ color: 'var(--accent)', fontSize: '2rem', marginBottom: '0.5rem' }}>⚡ CFDI SaaS</h1>
           <p style={{ color: 'var(--text-secondary)' }}>Ingresa tus credenciales maestras.</p>
        </div>

        {error && <div style={{ background: 'rgba(255,0,0,0.2)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-group">
            <label>Correo Electrónico</label>
            <input required type="email" value={correo} onChange={e => setCorreo(e.target.value)} className="form-control" placeholder="admin@facturas.com" />
          </div>
          
          <div className="form-group">
            <label>Contraseña</label>
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="form-control" placeholder="••••••••" />
          </div>

          <button type="submit" disabled={cargando} className="btn" style={{ padding: '1rem', fontSize: '1.2rem', marginTop: '1rem' }}>
            {cargando ? 'Verificando...' : 'Acceder al Panel'}
          </button>
        </form>
      </div>
    </div>
  )
}
