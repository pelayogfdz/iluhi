'use client'

import Link from 'next/link'

export default function ClientTableActions({ clienteId }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <Link href={`/clientes/editar/${clienteId}`}>
        <button className="btn btn-secondary" style={{ padding: '0.4rem 1rem' }}>Editar</button>
      </Link>
    </div>
  )
}
