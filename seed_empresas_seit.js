const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const regexMap = [
  { match: /Régimen Simplificado de Confianza/i, code: '626' },
  { match: /General de Ley Personas Morales/i, code: '601' },
  { match: /Personas Físicas con Actividades Empresariales/i, code: '612' },
  { match: /Sueldos y Salarios/i, code: '605' },
  { match: /Arrendamiento/i, code: '606' },
  { match: /Sociedades Cooperativas/i, code: '620' },
  { match: /Incorporación Fiscal/i, code: '621' },
  { match: /Sin obligaciones fiscales/i, code: '616' },
  { match: /Fines no lucrativos/i, code: '603' }
];

function getRegimenCode(text) {
  if (!text) return "601"; // Default
  const str = String(text);
  
  // Si ya tiene 3 digitos (ej. "601")
  if (str.match(/^\d{3}$/)) return str;
  
  for (let r of regexMap) {
    if (r.match.test(str)) {
      return r.code;
    }
  }
  return "601"; // Default fallback
}

async function injectData() {
  try {
    const workbook = xlsx.readFile('C:\\Users\\barca\\Downloads\\EMPRESAS_SEIT_CSF.xlsx');
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`Encontradas ${data.length} filas en el Excel. Iniciando inyección...`);
    
    let insertados = 0;
    let omitidos = 0;

    for (let row of data) {
      if (!row['RFC'] || !row['Razón Social']) continue;

      const cp = String(row['Código Postal']).padStart(5, '0');
      const regimenConvertido = getRegimenCode(row['Régimen']);

      try {
        await prisma.empresa.upsert({
          where: { rfc: row['RFC'] },
          update: {
            razonSocial: row['Razón Social'],
            regimen: regimenConvertido,
            codigoPostal: cp,
            calle: row['Calle'] ? String(row['Calle']) : null,
            numExterior: row['Núm. Exterior'] ? String(row['Núm. Exterior']) : null,
            colonia: row['Colonia'] ? String(row['Colonia']) : null,
            municipio: row['Municipio'] ? String(row['Municipio']) : null,
            ciudad: row['Ciudad'] ? String(row['Ciudad']) : null,
            estado: row['Estado'] ? String(row['Estado']) : null,
          },
          create: {
            rfc: row['RFC'],
            razonSocial: row['Razón Social'],
            regimen: regimenConvertido,
            codigoPostal: cp,
            calle: row['Calle'] ? String(row['Calle']) : null,
            numExterior: row['Núm. Exterior'] ? String(row['Núm. Exterior']) : null,
            colonia: row['Colonia'] ? String(row['Colonia']) : null,
            municipio: row['Municipio'] ? String(row['Municipio']) : null,
            ciudad: row['Ciudad'] ? String(row['Ciudad']) : null,
            estado: row['Estado'] ? String(row['Estado']) : null,
          }
        });
        insertados++;
      } catch (err) {
        console.error(`Error guardando ${row['RFC']}:`, err.message);
        omitidos++;
      }
    }
    
    console.log(`\n¡Inyección Exitosa!`);
    console.log(`Agregados/Actualizados de SEIT: ${insertados}`);
    if(omitidos > 0) console.log(`Omitidos (errores estructurales): ${omitidos}`);

  } catch (err) {
    console.error("Error catastrofico leyendo el excel: ", err);
  } finally {
    await prisma.$disconnect();
  }
}

injectData();
