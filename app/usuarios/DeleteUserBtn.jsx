'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { eliminarUsuario } from './acciones'

export default function DeleteUserBtn({ id }) {
  const router = useRouter()
  const [cargando, setCargando] = useState(false)

  const handleEliminar = async () => {
    if (!window.confirm("¿Seguro que deseas eliminar este usuario?")) return;
    setCargando(true);
    await eliminarUsuario(id);
    router.refresh();
  }

  return (
    <button onClick={handleEliminar} disabled={cargando} className="btn" style={{ background: 'var(--accent)', padding: '0.3rem 0.5rem', fontSize: '13px' }}>
      {cargando ? '...' : 'Eliminar'}
    </button>
  )
}
