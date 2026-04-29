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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100vw', background: '#f8fafc', color: '#1e293b', fontFamily: 'var(--font-inter, sans-serif)' }}>
      
      {/* Botones Flotantes Superiores */}
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem', background: 'white', padding: '0.5rem', borderRadius: '50px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <button onClick={() => setIsRegistering(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.5rem', border: 'none', borderRadius: '50px', background: !isRegistering ? 'var(--primary)' : 'transparent', color: !isRegistering ? 'white' : '#64748b', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
            <span>→]</span> Entrar
          </button>
          <button onClick={() => setIsRegistering(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.5rem', border: 'none', borderRadius: '50px', background: isRegistering ? 'var(--accent)' : 'transparent', color: isRegistering ? 'white' : '#64748b', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
            <span style={{ fontSize: '1.2rem' }}>👤</span> Registrar
          </button>
      </div>

      <div style={{ width: '100%', maxWidth: '450px', padding: '2rem', background: 'white', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' }}>
        <div style={{ marginBottom: '2rem' }}>
           <h1 style={{ color: 'var(--primary)', fontSize: '2.5rem', marginBottom: '1.5rem', fontWeight: '700', letterSpacing: '-1px' }}>CAANMA</h1>
           <h2 style={{ fontSize: '1.5rem', color: '#0f172a', fontWeight: '600', marginBottom: '0.5rem' }}>
               {isRegistering ? 'Crea tu cuenta' : 'Ingresa a tu cuenta'}
           </h2>
           <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
               {isRegistering ? '¿Ya tienes una cuenta? ' : '¿No tienes una cuenta? '}
               <a href="#" onClick={(e) => { e.preventDefault(); setIsRegistering(!isRegistering); }} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>
                   {isRegistering ? 'Inicia sesión' : 'Regístrate'}
               </a>
               {!isRegistering && ' y prueba 5 días gratis'}
           </p>
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center', fontWeight: '500', fontSize: '0.9rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155' }}>Correo electrónico</label>
            <input required type="email" value={correo} onChange={e => setCorreo(e.target.value)} style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', color: '#0f172a', outline: 'none', transition: 'border-color 0.2s', width: '100%' }} placeholder="Ingresa tu correo electrónico" autoComplete="email" />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155' }}>Contraseña</label>
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', color: '#0f172a', outline: 'none', transition: 'border-color 0.2s', width: '100%' }} placeholder="Ingresa tu contraseña" autoComplete="current-password" />
          </div>

          {!isRegistering && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', cursor: 'pointer' }}>
                      <input type="checkbox" style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                      Recordarme
                  </label>
                  <a href="#" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}>¿Has olvidado tu contraseña?</a>
              </div>
          )}

          <button type="submit" disabled={cargando} style={{ background: '#c4b5fd', color: '#4c1d95', border: 'none', padding: '1rem', borderRadius: '8px', fontWeight: '600', fontSize: '1rem', cursor: cargando ? 'not-allowed' : 'pointer', transition: 'all 0.2s', marginTop: '1rem', width: '100%', opacity: cargando ? 0.7 : 1 }}>
            {cargando ? 'Procesando...' : (isRegistering ? 'Registrarse' : 'Ingresar')}
          </button>
        </form>
      </div>
    </div>
  )
}
