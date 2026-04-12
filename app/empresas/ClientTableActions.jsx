'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { eliminarEmpresa } from './acciones'

export default function ClientTableActions({ empresaId }) {
  const router = useRouter()
  const [cargando, setCargando] = useState(false)

  const handleDelete = async () => {
    if (confirm("⚠️ PELIGRO: ¿Estás completamente seguro de ELIMINAR esta Empresa Emisora? Esto borrará permanentemente todos sus Clientes, Productos y Facturas vinculadas. Esta acción no se puede deshacer.")) {
      setCargando(true)
      const res = await eliminarEmpresa(empresaId)
      if (res.success) {
        alert("🗑️ Empresa Eliminada Totalmente.")
        router.refresh()
      } else {
        alert("❌ Error al eliminar: " + res.error)
      }
      setCargando(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <Link href={`/empresas/editar/${empresaId}`}>
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
