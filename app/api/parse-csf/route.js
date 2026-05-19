export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import * as pdfParseModule from 'pdf-parse';
const pdfParse = pdfParseModule.default || pdfParseModule;

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parsear el PDF
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;

    // Variables a extraer
    let rfc = '';
    let razonSocial = '';
    let codigoPostal = '';
    let regimen = '';

    // 1. Extraer RFC
    const rfcMatch = text.match(/([A-Z&Ñ]{3,4}\d{6}[A-V1-9][A-Z1-9][0-9A])/i);
    if (rfcMatch) {
      rfc = rfcMatch[1].toUpperCase();
    }

    // 2. Extraer Razón Social o Nombre
    // Intentar persona moral primero
    const denomMatch = text.match(/Denominaci(?:ó|o)n\/Raz(?:ó|o)n Social:\s*([\s\S]*?)(?:R(?:é|e)gimen Capital:|Capital Social:|Fecha de inicio de operaciones:|\n\n)/i);
    if (denomMatch && denomMatch[1].trim()) {
      razonSocial = denomMatch[1].replace(/\n/g, ' ').trim();
    } else {
      // Intentar persona física
      const nameMatch = text.match(/Nombre\s*\(s\),\s*primer\s*apellido,\s*segundo\s*apellido:\s*([\s\S]*?)(?:CURP:|Fecha de inicio de operaciones:|\n\n)/i);
      if (nameMatch && nameMatch[1].trim()) {
        razonSocial = nameMatch[1].replace(/\n/g, ' ').trim();
      }
    }

    // Limpiar régimen capital de la razón social (SAT CFDI 4.0 lo requiere sin esto)
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
    const cpRegex = /(?:C(?:ó|o)digo Postal|C\.P\.)\s*:?\s*(\d{5})/i;
    const cpMatch = text.match(cpRegex);
    if (cpMatch) {
      codigoPostal = cpMatch[1];
    } else {
      const addrMatch = text.match(/Datos del domicilio registrado[\s\S]*?\b(\d{5})\b/i);
      if (addrMatch) {
        codigoPostal = addrMatch[1];
      }
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
      if (regex.test(text)) {
        regimen = code;
        // Tomamos el primero que haga match. Para físicos con varios, 
        // normalmente RESICO o Empresarial son los primarios.
        break; 
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        rfc,
        razonSocial,
        codigoPostal,
        regimen
      }
    });

  } catch (error) {
    console.error("Error al procesar CSF:", error);
    return NextResponse.json({ success: false, error: 'Ocurrió un error al procesar el archivo PDF.' }, { status: 500 });
  }
}
