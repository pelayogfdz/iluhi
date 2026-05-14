'use client';

import { useState, useRef } from 'react';

export default function CsfUploader() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Por favor sube un archivo PDF válido.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/parse-csf', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error procesando el PDF.');
      }

      const { rfc, razonSocial, codigoPostal, regimen } = result.data;

      let filledCount = 0;

      // Inyectar en el DOM nativo
      if (rfc) {
        const inputRfc = document.getElementById('rfc');
        if (inputRfc) {
          inputRfc.value = rfc;
          filledCount++;
        }
      }

      if (razonSocial) {
        const inputRazon = document.getElementById('razonSocial');
        if (inputRazon) {
          inputRazon.value = razonSocial;
          filledCount++;
        }
      }

      if (codigoPostal) {
        const inputCp = document.getElementById('codigoPostal');
        if (inputCp) {
          inputCp.value = codigoPostal;
          filledCount++;
        }
      }

      if (regimen) {
        // En el caso del SearchableSelect, inyectamos un input oculto con el mismo "name" 
        // o disparamos un evento que lo actualice. 
        // Dado que usamos SearchableSelect (react-select), el input real está oculto.
        // Si el DOM del react-select tiene el input name="regimen", podemos buscarlo.
        const inputRegimen = document.querySelector('input[name="regimen"]');
        if (inputRegimen) {
          inputRegimen.value = regimen;
          filledCount++;
          
          // Tratamos de buscar el contenedor para actualizar visualmente el react-select
          // (Es más complejo simular un select en react-select externamente sin refs, 
          // pero el input hidden es lo que importa para la action de Next.js)
          const selectTextContainer = document.querySelector('.searchable-select-container .react-select__single-value');
          if (selectTextContainer) {
             // Esto es solo estético, el SearchableSelect tal vez no reaccione, pero el form sí tomará el valor
             // del input hidden.
             selectTextContainer.textContent = `${regimen} (Auto-asignado por CSF)`;
          }
        }
      }

      if (filledCount > 0) {
        setSuccess(`¡Éxito! Se detectaron y llenaron ${filledCount} campos de la CSF.`);
      } else {
        setError('No se detectaron datos útiles en el PDF.');
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Limpiar input para permitir subir el mismo de nuevo si hubo error
      }
    }
  };

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px dashed var(--primary)',
      padding: '1.5rem',
      borderRadius: '8px',
      marginBottom: '2rem',
      textAlign: 'center'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'var(--primary)' }}>Carga Mágica (Opcional)</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Sube la Constancia de Situación Fiscal (PDF) del cliente para auto-rellenar su perfil al instante.
      </p>

      <div>
        <input 
          type="file" 
          accept="application/pdf" 
          onChange={handleFileUpload} 
          ref={fileInputRef}
          style={{ display: 'none' }} 
          id="csf-upload" 
        />
        <label 
          htmlFor="csf-upload" 
          className="btn" 
          style={{ 
            cursor: loading ? 'not-allowed' : 'pointer', 
            opacity: loading ? 0.7 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {loading ? 'Analizando documento...' : '📄 Subir PDF Constancia (CSF)'}
        </label>
      </div>

      {error && (
        <div style={{ marginTop: '1rem', color: '#ff4444', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ marginTop: '1rem', color: '#00C851', fontSize: '0.9rem', fontWeight: 'bold' }}>
          {success}
        </div>
      )}
    </div>
  );
}
