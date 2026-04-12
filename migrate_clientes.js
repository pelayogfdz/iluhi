const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');

const prisma = new PrismaClient();

const regímenesMap = {
  "Régimen General de Ley Personas Morales": "601",
  "Personas Morales con Fines no Lucrativos": "603",
  "Sueldos y Salarios e Ingresos Asimilados a Salarios": "605",
  "Arrendamiento": "606",
  "Régimen de Enajenación o Adquisición de Bienes": "607",
  "Demás ingresos": "608",
  "Consolidación": "609",
  "Residentes en el Extranjero sin Establecimiento Permanente en México": "610",
  "Ingresos por Dividendos (socios y accionistas)": "611",
  "Personas Físicas con Actividades Empresariales y Profesionales": "612",
  "Ingresos por intereses": "614",
  "Régimen de los ingresos por obtención de premios": "615",
  "Sin obligaciones fiscales": "616",
  "Sociedades Cooperativas de Producción que optan por diferir sus ingresos": "620",
  "Incorporación Fiscal": "621",
  "Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras": "622",
  "Opcional para Grupos de Sociedades": "623",
  "Coordinados": "624",
  "Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas": "625",
  "Régimen Simplificado de Confianza": "626"
};

async function main() {
  // 1. Limpiar la tabla Empresa
  console.log("Limpiando registros erróneos en Empresa...");
  await prisma.empresa.deleteMany({});
  
  // 2. Crear Empresa Matriz (Ancla)
  console.log("Creando Empresa Matriz Ancla...");
  const empresaMaster = await prisma.empresa.create({
    data: {
      rfc: "AAA010101AAA",
      razonSocial: "EMPRESA EMISORA PRINCIPAL SA DE CV",
      regimen: "601",
      codigoPostal: "11000",
      correo: "facturacion@miempresa.com"
    }
  });

  const filePath = 'C:\\Users\\barca\\Downloads\\datos_constancias_fiscales.xlsx';
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const data = xlsx.utils.sheet_to_json(worksheet);

  let successCount = 0;

  for (const row of data) {
    const rfc = (row['RFC'] || row['rfc'] || '').trim();
    if (!rfc) continue;

    const razonSocial = (row['razón social'] || row['Razon Social'] || row['razón social '] || '').trim();
    const regimenTexto = (row['régimen'] || '').trim();
    let regimenCodigo = regímenesMap[regimenTexto] || regimenTexto; 
    
    if (regimenCodigo.length !== 3) {
      regimenCodigo = '601';
    }

    let cp = String(row['código postal'] || '').trim();
    if (cp.length > 0 && cp.length < 5) {
      cp = cp.padStart(5, '0');
    } else if (cp.length === 0) {
      cp = '00000';
    }

    const calle = String(row['calle'] || '').trim();
    const numInterior = String(row['num interior'] || '').trim();
    const numExterior = String(row['num exterior'] || '').trim();
    const colonia = String(row['colonia'] || '').trim();
    const municipio = String(row['municipio'] || '').trim();
    const ciudad = String(row['ciudad'] || '').trim();
    const estado = String(row['estado'] || '').trim();
    const correo = String(row['correo'] || '').trim();

    try {
      await prisma.cliente.upsert({
        where: {
          empresaId_rfc: {
            empresaId: empresaMaster.id,
            rfc: rfc
          }
        },
        update: {
          razonSocial,
          regimen: regimenCodigo,
          codigoPostal: cp,
          usoCfdi: "G03", // G03 Gastos en general como default
          calle,
          numInterior,
          numExterior,
          colonia,
          municipio,
          ciudad,
          estado,
          correoDestino: correo
        },
        create: {
          empresaId: empresaMaster.id,
          rfc,
          razonSocial,
          regimen: regimenCodigo,
          codigoPostal: cp,
          usoCfdi: "G03",
          calle,
          numInterior,
          numExterior,
          colonia,
          municipio,
          ciudad,
          estado,
          correoDestino: correo
        }
      });
      successCount++;
    } catch (e) {
      console.error(`Error guardando Cliente ${rfc}:`, e.message);
    }
  }

  console.log(`\n✅ Proceso Finalizado. Se migraron y guardaron exitosamente ${successCount} Clientes, atados a EMPRESA EMISORA PRINCIPAL SA DE CV.`);
}

main()
  .catch((e) => {
    console.error("Error Grave:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
