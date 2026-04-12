'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition, useState, useEffect } from 'react'

export default function SearchBar({ placeholder = "Buscar...", paramName = "q" }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState(searchParams.get(paramName) || "")

  // Sync internal state if URL changes elsewhere
  useEffect(() => {
    setQuery(searchParams.get(paramName) || "")
  }, [searchParams, paramName])

  const handleSearch = (e) => {
    e.preventDefault()
    startTransition(() => {
      const current = new URLSearchParams(Array.from(searchParams.entries()))
      
      if (!query) {
        current.delete(paramName)
      } else {
        current.set(paramName, query)
      }

      const search = current.toString()
      const destination = search ? `?${search}` : window.location.pathname
      router.push(destination)
    })
  }

  return (
    <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', width: '100%', maxWidth: '400px' }}>
      <input
        type="text"
        className="form-control"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ flex: 1 }}
      />
      <button 
        type="submit" 
        className="btn"
        disabled={isPending}
        style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {isPending ? '⏳' : '🔍'}
      </button>
    </form>
  )
}
