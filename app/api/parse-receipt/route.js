import { NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import { BANKS } from 'cep-banxico';

// Normalization function to match bank names to codes
function matchBankCode(text) {
  if (!text) return null;
  const normalized = text.toLowerCase()
    .replace(/[áéíóú]/g, (m) => ({ 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u' }[m]))
    .trim();
  
  for (const [code, name] of Object.entries(BANKS)) {
    const normName = name.toLowerCase();
    if (normalized.includes(normName) || normName.includes(normalized)) {
      return code;
    }
  }

  if (normalized.includes('citibanamex') || normalized.includes('banamex')) return '40002';
  if (normalized.includes('bbva') || normalized.includes('bancomer')) return '40012';
  if (normalized.includes('santander')) return '40014';
  if (normalized.includes('hsbc')) return '40021';
  if (normalized.includes('banorte')) return '40072';
  if (normalized.includes('coppel')) return '40137';
  if (normalized.includes('azteca')) return '40127';
  if (normalized.includes('stp') || normalized.includes('sistema de transferencia')) return '90646';

  return null;
}

function parseReceiptText(text) {
  const result = {
    fecha: null,
    claveRastreo: null,
    monto: null,
    cuentaBeneficiario: null,
    bancoEmisor: null,
    bancoReceptor: null
  };

  // 1. Clave de rastreo
  const rastreoRegexes = [
    /clave\s+de\s+rastreo\s*:\s*([a-z0-9\-]+)/i,
    /referencia\s+de\s+rastreo\s*:\s*([a-z0-9\-]+)/i,
    /rastreo\s*:\s*([a-z0-9\-]+)/i,
    /\b(bbva|santander|stp|monex|banorte|hsbc)[0-9]{10,25}\b/i,
    /\b[a-z0-9]{16,28}\b/i
  ];
  for (const regex of rastreoRegexes) {
    const match = text.match(regex);
    if (match) {
      const val = match[1] || match[0];
      if (val.length >= 10 && !val.includes('.') && isNaN(val)) {
        result.claveRastreo = val.trim().toUpperCase();
        break;
      }
    }
  }

  // 2. Monto
  const montoRegexes = [
    /monto\s*(?:de\s*pago)?\s*:\s*\$?\s*([0-9,]+\.[0-9]{2})/i,
    /importe\s*:\s*\$?\s*([0-9,]+\.[0-9]{2})/i,
    /cantidad\s*:\s*\$?\s*([0-9,]+\.[0-9]{2})/i,
    /total\s*:\s*\$?\s*([0-9,]+\.[0-9]{2})/i,
    /\$\s*([0-9,]+\.[0-9]{2})\b/
  ];
  for (const regex of montoRegexes) {
    const match = text.match(regex);
    if (match) {
      const numStr = match[1].replace(/,/g, '');
      result.monto = parseFloat(numStr);
      break;
    }
  }

  // 3. Cuenta Beneficiario
  const clabeRegex = /\b[0-9]{18}\b/;
  const cardRegex = /\b[0-9]{16}\b/;
  const clabeMatch = text.match(clabeRegex);
  if (clabeMatch) {
    result.cuentaBeneficiario = clabeMatch[0];
  } else {
    const cardMatch = text.match(cardRegex);
    if (cardMatch) {
      result.cuentaBeneficiario = cardMatch[0];
    }
  }

  // 4. Date
  const dateRegexes = [
    /fecha\s*(?:de\s*operaci(?:o|ó)n)?\s*:\s*([0-9]{2}[\/\-][0-9]{2}[\/\-][0-9]{4})/i,
    /\b([0-9]{2}[\/\-][0-9]{2}[\/\-][0-9]{4})\b/
  ];
  for (const regex of dateRegexes) {
    const match = text.match(regex);
    if (match) {
      result.fecha = match[1].replace(/\//g, '-');
      break;
    }
  }
  
  if (!result.fecha) {
    const monthNames = {
      enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
      julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
      ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06', jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12'
    };
    const spanishDateRegex = /([0-9]{1,2})\s+de\s+([a-z]+)\s+de\s+([0-9]{4})/i;
    const match = text.match(spanishDateRegex);
    if (match) {
      const day = match[1].padStart(2, '0');
      const monthStr = match[2].toLowerCase();
      const month = monthNames[monthStr] || '01';
      const year = match[3];
      result.fecha = `${day}-${month}-${year}`;
    }
  }

  // 5. Banks
  const lines = text.split('\n');
  for (const line of lines) {
    if (/ordenante|emisor|origen|desde/i.test(line)) {
      for (const name of Object.values(BANKS)) {
        if (new RegExp('\\b' + name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'i').test(line)) {
          result.bancoEmisor = matchBankCode(name);
          break;
        }
      }
    }
    if (/beneficiario|receptor|destino|hacia/i.test(line)) {
      for (const name of Object.values(BANKS)) {
        if (new RegExp('\\b' + name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'i').test(line)) {
          result.bancoReceptor = matchBankCode(name);
          break;
        }
      }
    }
  }

  if (!result.bancoEmisor) {
    for (const name of Object.values(BANKS)) {
      if (new RegExp('\\b' + name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'i').test(text)) {
        result.bancoEmisor = matchBankCode(name);
        break;
      }
    }
  }
  if (!result.bancoReceptor) {
    const words = text.split(/\s+/);
    for (let i = words.length - 1; i >= 0; i--) {
      for (const name of Object.values(BANKS)) {
        if (words[i].toLowerCase() === name.toLowerCase()) {
          result.bancoReceptor = matchBankCode(name);
          break;
        }
      }
      if (result.bancoReceptor) break;
    }
  }

  return result;
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    let text = '';
    
    if (file.name.endsWith('.pdf')) {
      const data = await pdfParse(fileBuffer);
      text = data.text;
    } else {
      return NextResponse.json({ error: 'Unsupported file type, please upload a PDF' }, { status: 400 });
    }

    const extracted = parseReceiptText(text);

    return NextResponse.json({ success: true, data: extracted });
  } catch (error) {
    console.error("Error parsing payment proof:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
