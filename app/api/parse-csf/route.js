export const runtime = 'nodejs';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parsear el PDF usando pdf-parse (versión pura JS interna para evitar fs.readFile de index.js)
    const pdfParse = require('pdf-parse/lib/pdf-parse.js');
    
    // Función custom para preservar espacios que pdf-parse omite por defecto
    function custom_render(pageData) {
      return pageData.getTextContent().then(function(textContent) {
        let lastY, lastX = 0, lastWidth = 0, text = '';
        for (let item of textContent.items) {
          if (lastY == item.transform[5] || !lastY) {
            if (lastX > 0 && item.transform[4] > lastX + lastWidth + 1) text += ' ';
            text += item.str;
          } else {
            text += '\n' + item.str;
          }
          lastY = item.transform[5];
          lastX = item.transform[4];
          lastWidth = item.width;
        }
        return text;
      });
    }

    const data = await pdfParse(buffer, { pagerender: custom_render });
    const text = data.text;

    let rfc = '';
    let razonSocial = '';
    let codigoPostal = '';
    let regimen = '';
    let addressBlockMatch = null;
    let addressText = '';

    // Limpiar texto para facilitar regex (quitar espacios múltiples)
    const cleanText = text.replace(/\s+/g, ' ');

    // 1. Extraer RFC
    const rfcMatch = cleanText.match(/([A-Z&Ñ]{3,4}\s*\d{6}\s*[A-Z0-9]{3})/i);
    if (rfcMatch) {
      rfc = rfcMatch[1].replace(/\s+/g, '').toUpperCase();
    }

    // 2. Extraer Razón Social o Nombre
    // Intentar persona moral primero
    const denomMatch = text.match(/Denominaci(?:ó|o)n\/Raz(?:ó|o)n Social:\s*([\s\S]*?)(?:R(?:é|e)gimen Capital:|Capital Social:|Fecha de inicio de operaciones:|\n\n)/i) 
      || cleanText.match(/Denominaci(?:ó|o)n\/Raz(?:ó|o)n Social:\s*(.*?)(?:R(?:é|e)gimen Capital|Capital Social|Fecha de inicio)/i);
      
    if (denomMatch && denomMatch[1].trim()) {
      razonSocial = denomMatch[1].replace(/\n/g, ' ').trim();
    } else {
      // Intentar persona física
      const nameMatch = text.match(/Nombre\s*\(s\),\s*primer\s*apellido,\s*segundo\s*apellido:\s*([\s\S]*?)(?:CURP:|Fecha de inicio de operaciones:|\n\n)/i)
        || cleanText.match(/Nombre\s*\(s\),\s*primer\s*apellido,\s*segundo\s*apellido:\s*(.*?)(?:CURP:|Fecha de inicio)/i);
      if (nameMatch && nameMatch[1].trim()) {
        razonSocial = nameMatch[1].replace(/\n/g, ' ').trim();
      }
    }

    // Limpiar régimen capital de la razón social
    razonSocial = razonSocial
      .replace(/,\s*S\.A\.\s+DE\s+C\.V\./i, '')
      .replace(/\s+S\.A\.\s+DE\s+C\.V\./i, '')
      .replace(/,\s*S\.A\.\s+B\.\s+DE\s+C\.V\./i, '')
      .replace(/\s+S\.A\.\s+B\.\s+DE\s+C\.V\./i, '')
      .replace(/,\s*S\.C\./i, '')
      .replace(/\s+S\.C\./i, '')
      .replace(/,\s*A\.C\./i, '')
      .replace(/\s+A\.C\./i, '')
      .replace(/,\s*S\.A\.P\.I\.\s+DE\s+C\.V\./i, '')
      .replace(/\s+S\.A\.P\.I\.\s+DE\s+C\.V\./i, '')
      .replace(/,\s*S\.A\./i, '')
      .replace(/\s+S\.A\./i, '')
      .trim();

    // 3. Extraer Código Postal
    // Buscar primero dentro del bloque de domicilio para evitar capturar el C.P. de la administración de la ADSC en la primera página
    let cpMatch = null;
    
    // Aislar la sección de domicilio
    addressBlockMatch = cleanText.match(/Datos del domicilio registrado([\s\S]*?)(?:Actividades Econ(?:ó|o)micas|Sus datos personales|Cadena Original|Reg(?:í|i)menes)/i);
    addressText = addressBlockMatch ? addressBlockMatch[1] : cleanText;

    if (addressBlockMatch) {
      cpMatch = addressText.match(/(?:C(?:ó|o)digo Postal|C\.P\.)\s*:?\s*(\d{5})/i)
        || addressText.match(/\b(\d{5})\b/i);
    }
    
    if (!cpMatch) {
      // Fallback global si no se aisló el bloque de domicilio
      cpMatch = cleanText.match(/(?:C(?:ó|o)digo Postal|C\.P\.)\s*:?\s*(\d{5})/i)
        || cleanText.match(/Datos del domicilio registrado[\s\S]*?\b(\d{5})\b/i)
        || cleanText.match(/C\.?P\.?\s*(\d{5})/i);
    }

    if (cpMatch) {
      codigoPostal = cpMatch[1];
    }

    // 4. Extraer Régimen Fiscal
    const regimensMap = {
      '601': /General de Ley Personas Morales/i,
      '603': /Personas Morales con Fines no Lucrativos/i,
      '605': /Sueldos y Salarios/i,
      '606': /Arrendamiento/i,
      '608': /Dem(?:á|a)s ingresos/i,
      '611': /Dividendos/i,
      '612': /Actividades Empresariales y Profesionales/i,
      '614': /Ingresos por intereses/i,
      '615': /obtenci(?:ó|o)n de premios/i,
      '616': /Sin obligaciones fiscales/i,
      '620': /Sociedades Cooperativas/i,
      '621': /Incorporaci(?:ó|o)n Fiscal/i,
      '622': /Actividades Agr(?:í|i)colas, Ganaderas/i,
      '623': /Opcional para Grupos/i,
      '624': /Coordinados/i,
      '625': /Plataformas Tecnol(?:ó|o)gicas/i,
      '626': /R(?:é|e)gimen Simplificado de Confianza/i,
      '628': /Hidrocarburos/i,
      '629': /Reg(?:í|i)menes Fiscales Preferentes/i,
      '630': /Enajenaci(?:ó|o)n de acciones/i
    };

    for (const [code, regex] of Object.entries(regimensMap)) {
      if (regex.test(text) || regex.test(cleanText)) {
        regimen = code;
        break; 
      }
    }

    // 5. Extraer Datos de Domicilio
    let calle = '', numExterior = '', numInterior = '', colonia = '', municipio = '', estado = '', ciudad = '';
    
    // Aislar la sección de domicilio
    addressBlockMatch = cleanText.match(/Datos del domicilio registrado([\s\S]*?)(?:Actividades Econ(?:ó|o)micas|Sus datos personales|Cadena Original|Reg(?:í|i)menes)/i);
    addressText = addressBlockMatch ? addressBlockMatch[1] : cleanText;
    
    const mCalle = addressText.match(/(?:Nombre de Vialidad|Calle)\s*:?\s*(.*?)\s*(?:N(?:ú|u)mero Exterior|N(?:ú|u)m\.? Ext|N\.? Ext)/i);
    if(mCalle) calle = mCalle[1].trim();

    const mExt = addressText.match(/(?:N(?:ú|u)mero Exterior|N(?:ú|u)m\.? Ext|N\.? Ext)\s*:?\s*(.*?)\s*(?:N(?:ú|u)mero Interior|N(?:ú|u)m\.? Int|N\.? Int|Nombre de la Colonia|Colonia)/i);
    if(mExt) numExterior = mExt[1].trim();

    const mInt = addressText.match(/(?:N(?:ú|u)mero Interior|N(?:ú|u)m\.? Int|N\.? Int)\s*:?\s*(.*?)\s*(?:Nombre de la Colonia|Colonia)/i);
    if(mInt) numInterior = mInt[1].trim();

    const mCol = addressText.match(/(?:Nombre de la Colonia|Colonia)\s*:?\s*(.*?)\s*(?:Nombre de la Localidad|Localidad|Nombre del Municipio|Municipio|C\.?P\.?|Delegaci(?:ó|o)n)/i);
    if(mCol) colonia = mCol[1].trim();

    const mMun = addressText.match(/(?:Nombre del Municipio o Demarcaci(?:ó|o)n Territorial|Municipio o Delegaci(?:ó|o)n|Municipio)\s*:?\s*(.*?)\s*(?:Nombre de la Entidad Federativa|Entidad Federativa|Estado)/i);
    if(mMun) {
      municipio = mMun[1].trim();
      ciudad = municipio; // Usar municipio como ciudad por defecto
    }

    const mEst = addressText.match(/(?:Nombre de la Entidad Federativa|Entidad Federativa|Estado)\s*:?\s*(.*?)\s*(?:Entre Calle|Y Calle|Actividades|Sus datos|C\.?P\.?|Reg(?:í|i)menes)/i);
    if(mEst) estado = mEst[1].trim();

    // Fallbacks si aún no los encuentra: intentar variaciones más sencillas
    if (!calle) {
        const altCalle = addressText.match(/Vialidad\s*:?\s*(.*?)\s*(?:Exterior|Ext)/i);
        if (altCalle) calle = altCalle[1].trim();
    }
    if (!colonia) {
        const altCol = addressText.match(/Colonia\s*:?\s*(.*?)\s*(?:Municipio|Delegaci(?:ó|o)n|Localidad)/i);
        if (altCol) colonia = altCol[1].trim();
    }

    if (!rfc && !razonSocial && !codigoPostal) {
       return NextResponse.json({
         success: false,
         error: "No se encontraron datos en el texto extraído: " + text.substring(0, 300)
       });
    }

    return NextResponse.json({
      success: true,
      data: {
        rfc,
        razonSocial,
        codigoPostal,
        regimen,
        calle,
        numExterior,
        numInterior,
        colonia,
        municipio,
        estado,
        ciudad
      }
    });

  } catch (error) {
    console.error("Error al procesar CSF:", error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error procesando PDF: ' + (error.message || String(error)) 
    }, { status: 500 });
  }
}
