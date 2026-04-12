'use client'

import { useState } from 'react'
import * as xlsx from 'xlsx'
import { importarProductosMasivos } from './acciones'
import { useRouter } from 'next/navigation'

export default function ExcelUploader({ empresas }) {
  const [empresaId, setEmpresaId] = useState('')
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState('')
  const router = useRouter()

  const handleFileUpload = async (e) => {
    e.preventDefault()
    if (!empresaId) {
      alert("Selecciona la Empresa Emisora a la que se le subirán estos productos.")
      return
    }

    const file = e.target.files[0]
    if (!file) return

    setCargando(true)
    setResultado('Leyendo archivo Excel...')

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = xlsx.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet);

        setResultado(`Procesando ${rows.length} filas...`);
        const res = await importarProductosMasivos(rows, empresaId);

        if (res.success) {
          setResultado(`¡Éxito! Se importaron ${res.guardados} productos y servicios.`);
          setTimeout(() => router.push('/productos'), 3000);
        }
      } catch (err) {
        console.error(err);
        setResultado("Error procesando Excel. Verifica que tenga cabeceras correctas.");
      }
      setCargando(false)
    }
    reader.readAsBinaryString(file)
  }

  const descargarPlantilla = () => {
    const ws = xlsx.utils.json_to_sheet([{
      noIdentificacion: 'SKU-01',
      descripcion: 'Consultoria de Software',
      claveProdServ: '81111508',
      claveUnidad: 'E48',
      precio: 1500.00,
      impuesto: '002',
      objetoImp: '02',
      tipoFactor: 'Tasa',
      tasaOCuota: 0.160000
    }]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Productos");
    xlsx.writeFile(wb, "plantilla_importacion_sat.xlsx");
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
      <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Carga MASIVA (Excel / CSV)</h3>
      
      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="empSelectMasivo">1. Selecciona a qué Empresa le inyectaremos el catálogo</label>
        <select id="empSelectMasivo" className="form-control" value={empresaId} onChange={e => setEmpresaId(e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <option value="">-- Selecciona Empresa --</option>
          {empresas.map(emp => (
             <option key={emp.id} value={emp.id}>{emp.razonSocial}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={descargarPlantilla} className="btn" style={{ background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)' }}>
           ↓ 2. Descargar Plantilla Oficial
        </button>
        
        <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
          <button type="button" disabled={!empresaId || cargando} className="btn">
            {cargando ? 'Cargando...' : '↑ 3. Subir Excel Terminado'}
          </button>
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleFileUpload} 
            disabled={!empresaId || cargando}
            style={{ position: 'absolute', top: 0, right: 0, opacity: 0, fontSize: '100px', cursor: 'pointer' }} 
          />
        </div>
      </div>
      
      {resultado && (
        <p style={{ marginTop: '1rem', padding: '0.5rem', borderRadius: '4px', background: resultado.includes('Error') ? 'rgba(255,0,0,0.2)' : 'rgba(0,255,0,0.2)' }}>
          {resultado}
        </p>
      )}
    </div>
  )
}
