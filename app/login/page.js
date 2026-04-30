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
  const [isRegistering, setIsRegistering] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError(null);
    
    // Aquí iría lógica de registro si isRegistering es true
    if(isRegistering) {
        // Simulación registro
        setTimeout(() => {
            setError("El registro de nuevas cuentas está temporalmente deshabilitado.");
            setCargando(false);
        }, 1000);
        return;
    }

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100vw' }}>
      
      {/* Botones Flotantes Superiores */}
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', padding: '0.5rem', borderRadius: '50px', border: '1px solid var(--border-light)' }}>
          <button onClick={() => setIsRegistering(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.5rem', border: 'none', borderRadius: '50px', background: !isRegistering ? 'var(--primary)' : 'transparent', color: !isRegistering ? 'white' : 'var(--text-secondary)', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
            <span>→]</span> Entrar
          </button>
          <button onClick={() => setIsRegistering(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.5rem', border: 'none', borderRadius: '50px', background: isRegistering ? 'var(--accent)' : 'transparent', color: isRegistering ? 'white' : 'var(--text-secondary)', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
            <span style={{ fontSize: '1.2rem' }}>👤</span> Registrar
          </button>
      </div>

      <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', margin: '2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
           <h1 style={{ color: 'var(--primary)', fontSize: '2.5rem', marginBottom: '1.5rem', fontWeight: '700', letterSpacing: '-1px' }}>FACTURACIÓN SEIT</h1>
           <h2 style={{ fontSize: '1.5rem', color: '#fff', fontWeight: '600', marginBottom: '0.5rem' }}>
               {isRegistering ? 'Crea tu cuenta' : 'Ingresa a tu cuenta'}
           </h2>
           <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
               {isRegistering ? '¿Ya tienes una cuenta? ' : '¿No tienes una cuenta? '}
               <a href="#" onClick={(e) => { e.preventDefault(); setIsRegistering(!isRegistering); }} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>
                   {isRegistering ? 'Inicia sesión' : 'Regístrate'}
               </a>
               {!isRegistering && ' y prueba 5 días gratis'}
           </p>
        </div>

        {error && <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center', fontWeight: '500', fontSize: '0.9rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-group">
            <label>Correo electrónico</label>
            <input required type="email" value={correo} onChange={e => setCorreo(e.target.value)} className="form-control" placeholder="Ingresa tu correo electrónico" autoComplete="email" />
          </div>
          
          <div className="form-group">
            <label>Contraseña</label>
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="form-control" placeholder="Ingresa tu contraseña" autoComplete="current-password" />
          </div>

          {!isRegistering && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input type="checkbox" style={{ width: '16px', height: '16px', borderRadius: '4px', accentColor: 'var(--primary)' }} />
                      Recordarme
                  </label>
                  <a href="#" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}>¿Has olvidado tu contraseña?</a>
              </div>
          )}

          <button type="submit" className="btn" disabled={cargando} style={{ marginTop: '1rem', width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
            {cargando ? 'Procesando...' : (isRegistering ? 'Registrarse' : 'Ingresar')}
          </button>
        </form>
      </div>
    </div>
  )
}
