'use client'

import { useState, useEffect, useRef } from 'react'

export default function SatAutocomplete({ type, name, initialValue = '', initialDisplay = '', placeholder = '' }) {
  const [query, setQuery] = useState(initialDisplay)
  const [value, setValue] = useState(initialValue)
  const [results, setResults] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)

  // Use debounce for search
  useEffect(() => {
    const handler = setTimeout(() => {
      // If user typed something and it's not strictly matching the selected text
      if (query.length >= 2 && query !== initialDisplay) {
        fetchResults(query)
      } else if (query.length < 2) {
        setResults([])
        setIsOpen(false)
      }
    }, 400)

    return () => clearTimeout(handler)
  }, [query])

  // Handle clicking outside to close Dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef])

  const fetchResults = async (searchQuery) => {
    setLoading(true)
    try {
      const endpoint = type === 'producto' ? '/api/sat/productos' : '/api/sat/unidades'
      const res = await fetch(`${endpoint}?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      if (data.results) {
        setResults(data.results)
        setIsOpen(true)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (item) => {
    const itemKey = item.key || item.value || item.clave
    const itemDesc = item.description || item.nombre

    setValue(itemKey)
    setQuery(`${itemKey} - ${itemDesc}`)
    setIsOpen(false)
  }

  const handleChange = (e) => {
    setQuery(e.target.value)
    // Synchronize value so if user types explicitly without clicking, it still sends it
    setValue(e.target.value)
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      {/* Hidden input to pass value to Server Actions smoothly */}
      <input type="hidden" name={name} value={value} />
      
      <input
        ref={inputRef}
        type="text"
        className="form-control"
        value={query}
        onChange={handleChange}
        onFocus={() => { if (results.length > 0) setIsOpen(true) }}
        placeholder={placeholder || "Escribe para buscar..."}
        autoComplete="off"
        required
      />
      {loading && <div style={{ position: 'absolute', right: '10px', top: '10px', fontSize: '0.8rem', color: 'var(--primary)' }}>Cargando...</div>}

      {isOpen && results.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: '#1a1a2e',
          border: '1px solid rgba(255,255,255,0.2)',
          zIndex: 1000,
          maxHeight: '200px',
          overflowY: 'auto',
          listStyle: 'none',
          padding: 0,
          margin: 0,
          borderRadius: '0 0 8px 8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
        }}>
          {results.map((item, idx) => (
            <li 
              key={idx}
              onClick={() => handleSelect(item)}
              style={{
                padding: '0.8rem',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                fontSize: '0.9rem',
                color: '#fff'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <strong>{item.key || item.value || item.clave}</strong> - {item.description || item.nombre}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
