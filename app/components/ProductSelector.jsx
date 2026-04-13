'use client'

import { useState, useRef, useEffect, useMemo } from 'react'

export default function ProductSelector({ options = [], value, onChange, disabled, placeholder }) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef(null)

  // Sincronizar el query con el valor seleccionado
  useEffect(() => {
    if (value) {
      const selected = options.find((o) => o.id === value)
      if (selected) {
        setQuery(`[${selected.noIdentificacion}] ${selected.descripcion} - $${selected.precio}`)
      } else {
        setQuery('')
      }
    } else {
      setQuery('')
    }
  }, [value, options])

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
        // Revert query text if unselected manually
        if (!value) {
          setQuery('')
        } else {
          const selected = options.find((o) => o.id === value)
          if (selected) setQuery(`[${selected.noIdentificacion}] ${selected.descripcion} - $${selected.precio}`)
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef, value, options])

  // Filtrado local predictivo
  const filteredOptions = useMemo(() => {
    if (!query || value) return options // if there's a selected value, we might want to just show all if they click to change
    const lowerQuery = query.toLowerCase()
    return options.filter(o => 
      o.descripcion?.toLowerCase().includes(lowerQuery) || 
      o.noIdentificacion?.toLowerCase().includes(lowerQuery)
    )
  }, [query, options, value])

  const handleSelect = (opt) => {
    onChange(opt.id)
    setIsOpen(false)
  }

  const handleChange = (e) => {
    setQuery(e.target.value)
    if (value) {
      onChange('') // Reset selection if they edit manually
    }
    setIsOpen(true)
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        className="form-control"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        onFocus={() => setIsOpen(true)}
        disabled={disabled}
        autoComplete="off"
        style={{
          backgroundColor: disabled ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.5)',
          cursor: disabled ? 'not-allowed' : 'text'
        }}
      />
      
      {isOpen && !disabled && (
         <ul style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#1a1a2e',
            border: '1px solid rgba(255,255,255,0.2)',
            zIndex: 1000,
            maxHeight: '250px',
            overflowY: 'auto',
            listStyle: 'none',
            padding: 0,
            margin: 0,
            borderRadius: '0 0 8px 8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
          }}>
            {filteredOptions.length === 0 ? (
              <li style={{ padding: '0.8rem', color: 'var(--text-secondary)' }}>No se encontraron coincidencias.</li>
            ) : (
              filteredOptions.slice(0, 50).map(opt => (
                <li 
                  key={opt.id}
                  onClick={() => handleSelect(opt)}
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
                  <strong>[{opt.noIdentificacion}]</strong> {opt.descripcion} - <em>${opt.precio}</em>
                </li>
              ))
            )}
         </ul>
      )}
    </div>
  )
}
