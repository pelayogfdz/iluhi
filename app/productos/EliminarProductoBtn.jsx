'use client'

import { eliminarProducto } from './acciones'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function EliminarProductoBtn({ id }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleEliminar = async () => {
    if(!confirm("¿Estás seguro de que deseas eliminar este producto/servicio? Esta acción no se puede deshacer.")) return;
    
    setIsDeleting(true)
    const res = await eliminarProducto(id)
    setIsDeleting(false)

    if (res.success) {
      router.refresh()
    } else {
      alert("Error al eliminar: " + res.error)
    }
  }

  return (
    <button 
      onClick={handleEliminar} 
      className="btn btn-danger" 
      disabled={isDeleting}
      style={{ padding: '0.4rem 1rem', marginLeft: '0.5rem', backgroundColor: '#ef4444', borderColor: '#ef4444' }}
    >
      {isDeleting ? '...' : 'Eliminar'}
    </button>
  )
}
