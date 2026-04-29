'use client'

import React, { useState, useEffect } from 'react'
import Select from 'react-select'

export default function SearchableSelect({ options, name, placeholder, value, onChange, required }) {
  const [mounted, setMounted] = useState(false)
  const [internalValue, setInternalValue] = useState(value || '')

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <select className="form-control" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} disabled><option>{placeholder || "Cargando..."}</option></select>
  }

  const customStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderColor: 'var(--border-color)',
      color: 'white',
      padding: '2px',
      boxShadow: 'none',
      '&:hover': {
        borderColor: 'var(--primary)'
      }
    }),
    singleValue: (provided) => ({
      ...provided,
      color: 'white',
    }),
    input: (provided) => ({
      ...provided,
      color: 'white',
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: '#1a1f2e',
      border: '1px solid var(--border-color)',
      zIndex: 9999
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused ? 'var(--primary-dark)' : 'transparent',
      color: 'white',
      cursor: 'pointer',
      '&:active': {
        backgroundColor: 'var(--primary)'
      }
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#aaa',
    })
  }

  const currentValue = value !== undefined ? value : internalValue;
  const selectedOption = options.find(opt => opt.value === currentValue) || null;

  const handleChange = (selected) => {
    const newVal = selected ? selected.value : '';
    setInternalValue(newVal);
    if (onChange) {
      onChange(newVal)
    }
  }

  return (
    <>
      <Select 
        options={options}
        styles={customStyles}
        placeholder={placeholder || "Selecciona..."}
        value={selectedOption}
        onChange={handleChange}
        isClearable
        isSearchable
        noOptionsMessage={() => "No se encontraron resultados"}
      />
      {/* Hidden input to pass value in server forms if 'name' is provided */}
      {name && <input type="hidden" name={name} value={currentValue || ''} required={required} />}
    </>
  )
}
