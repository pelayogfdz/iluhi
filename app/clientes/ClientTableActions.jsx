'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { eliminarCliente } from './acciones'

export default function ClientTableActions({ clienteId }) {
  const router = useRouter()
  const [cargando, setCargando] = useState(false)

  const handleDelete = async () => {
    if (confirm("⚠️ ¿Estás seguro de que quieres eliminar a este Cliente Receptor? Todas las facturas creadas hacia él podrían perder sus anclajes de visualización. Esta acción no se puede deshacer.")) {
      setCargando(true)
      const res = await eliminarCliente(clienteId)
      if (res.success) {
        alert("🗑️ Cliente Eliminado.")
        router.refresh()
      } else {
        alert("❌ Error al eliminar: " + res.error)
      }
      setCargando(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <Link href={`/clientes/editar/${clienteId}`}>
        <button className="btn btn-secondary" style={{ padding: '0.4rem 1rem' }}>Editar</button>
      </Link>
      <button 
        className="btn" 
        onClick={handleDelete} 
        disabled={cargando}
        style={{ padding: '0.4rem 1rem', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.5)' }}
      >
        {cargando ? '...' : 'Eliminar'}
      </button>
    </div>
  )
}
