const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to extract an attribute from a tag string case-insensitively
function extractAttr(tag, attr) {
  if (!tag) return null;
  const r = new RegExp('\\b' + attr + '\\s*=\\s*["\']([^"\']*)["\']', 'i');
  const m = tag.match(r);
  return m ? m[1] : null;
}

// Recursive directory traversal
function getFiles(dir, files = []) {
  if (!fs.existsSync(dir)) {
    console.log(`Directory does not exist: ${dir}`);
    return files;
  }
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getFiles(filePath, files);
    } else {
      if (file.toLowerCase().endsWith('.xml')) {
        files.push(filePath);
      }
    }
  }
  return files;
}

async function importInvoices() {
  console.log("Iniciando escaneo e importación de facturas (Supercharged Cache Edition)...");
  const baseDir = "C:\\Users\\barca2\\Downloads\\CLIENTES - RECEPTORAS";
  
  // 1. Precargar Empresas en memoria
  const empresas = await prisma.empresa.findMany();
  console.log(`Empresas registradas en el sistema: ${empresas.length}`);
  const empresasByRfc = new Map();
  for (const emp of empresas) {
    if (emp.rfc) {
      empresasByRfc.set(emp.rfc.trim().toUpperCase(), emp);
    }
  }

  // 1b. Precargar Usuarios en memoria para asignación de clientes
  const allUsers = await prisma.usuario.findMany({ select: { id: true } });
  const allUserIds = allUsers.map(u => u.id);
  console.log(`Usuarios precargados para asignación de clientes: ${allUserIds.length}`);

  // 2. Precargar Clientes en memoria
  console.log("Precargando clientes de la DB para evitar round-trips...");
  const clientes = await prisma.cliente.findMany();
  const clientesByRfc = new Map();
  for (const cli of clientes) {
    if (cli.rfc) {
      clientesByRfc.set(cli.rfc.trim().toUpperCase(), cli);
    }
  }
  console.log(`Clientes precargados: ${clientesByRfc.size}`);

  // 3. Precargar UUIDs de facturas existentes
  console.log("Precargando UUIDs de facturas existentes...");
  const [existingFacturas, existingEmitidas, existingRecibidas] = await Promise.all([
    prisma.factura.findMany({ select: { uuid: true } }),
    prisma.facturaEmitida.findMany({ select: { uuid: true } }),
    prisma.facturaRecibida.findMany({ select: { uuid: true } })
  ]);

  const fUuids = new Set(existingFacturas.map(f => f.uuid ? f.uuid.trim().toUpperCase() : ''));
  const eUuids = new Set(existingEmitidas.map(f => f.uuid ? f.uuid.trim().toUpperCase() : ''));
  const rUuids = new Set(existingRecibidas.map(f => f.uuid ? f.uuid.trim().toUpperCase() : ''));

  console.log(`Facturas en Módulo Principal precargadas: ${fUuids.size}`);
  console.log(`Facturas Emitidas SAT precargadas: ${eUuids.size}`);
  console.log(`Facturas Recibidas SAT precargadas: ${rUuids.size}`);

  // 4. Escanear todos los archivos XML en el directorio y subdirectorios
  const xmlFiles = getFiles(baseDir);
  console.log(`Se encontraron ${xmlFiles.length} archivos XML para procesar.`);

  let emitidosImportados = 0;
  let recibidosImportados = 0;
  let yaExistentes = 0;
  let errores = 0;
  let sinMatch = 0;

  for (const xmlPath of xmlFiles) {
    try {
      const xmlStr = fs.readFileSync(xmlPath, 'utf8');

      // Extraer los bloques/tags principales de interés con regex rápidas
      const comprobanteMatch = xmlStr.match(/<cfdi:Comprobante([^>]*)/i) || xmlStr.match(/<Comprobante([^>]*)/i);
      const emisorMatch = xmlStr.match(/<cfdi:Emisor([^>]*)/i) || xmlStr.match(/<Emisor([^>]*)/i);
      const receptorMatch = xmlStr.match(/<cfdi:Receptor([^>]*)/i) || xmlStr.match(/<Receptor([^>]*)/i);
      const timbreMatch = xmlStr.match(/<tfd:TimbreFiscalDigital([^>]*)/i) || xmlStr.match(/<TimbreFiscalDigital([^>]*)/i);

      if (!comprobanteMatch) {
        errores++;
        continue;
      }

      // Extraer UUID
      let uuid = null;
      if (timbreMatch) {
        uuid = (extractAttr(timbreMatch[0], 'UUID') || extractAttr(timbreMatch[0], 'uuid') || '').trim().toUpperCase();
      }
      if (!uuid) {
        const uuidM = xmlStr.match(/UUID\s*=\s*["']([^"']*)["']/i);
        if (uuidM) {
          uuid = uuidM[1].trim().toUpperCase();
        }
      }

      if (!uuid) {
        console.log(`[Error] No se pudo encontrar el UUID para el XML: ${path.basename(xmlPath)}`);
        errores++;
        continue;
      }

      // Extraer RFCs
      let emisorRfc = null;
      let emisorNombre = null;
      if (emisorMatch) {
        emisorRfc = (extractAttr(emisorMatch[0], 'Rfc') || extractAttr(emisorMatch[0], 'rfc') || '').trim().toUpperCase();
        emisorNombre = extractAttr(emisorMatch[0], 'Nombre') || extractAttr(emisorMatch[0], 'nombre') || '';
      }

      let receptorRfc = null;
      let receptorNombre = null;
      let receptorRegimen = '616';
      let receptorCP = '00000';
      let receptorUso = 'G03';
      if (receptorMatch) {
        const recTag = receptorMatch[0];
        receptorRfc = (extractAttr(recTag, 'Rfc') || extractAttr(recTag, 'rfc') || '').trim().toUpperCase();
        receptorNombre = extractAttr(recTag, 'Nombre') || extractAttr(recTag, 'nombre') || '';
        receptorRegimen = extractAttr(recTag, 'RegimenFiscalReceptor') || extractAttr(recTag, 'regimenFiscalReceptor') || '616';
        receptorCP = extractAttr(recTag, 'DomicilioFiscalReceptor') || extractAttr(recTag, 'domicilioFiscalReceptor') || '00000';
        receptorUso = extractAttr(recTag, 'UsoCFDI') || extractAttr(recTag, 'usoCFDI') || 'G03';
      }

      let isEmisorRegistrado = emisorRfc && empresasByRfc.has(emisorRfc);
      const isReceptorRegistrado = receptorRfc && empresasByRfc.has(receptorRfc);

      // Si no está registrado el emisor ni el receptor, ¡auto-creamos la empresa del emisor!
      if (!isEmisorRegistrado && !isReceptorRegistrado && emisorRfc) {
        console.log(`[Empresa] Creando empresa auto-extraída de factura huérfana: ${emisorNombre} (${emisorRfc})`);
        const compTag = comprobanteMatch[0];
        const emTag = emisorMatch[0];
        const emisorRegimen = extractAttr(emTag, 'RegimenFiscal') || extractAttr(emTag, 'regimenFiscal') || '601';
        const emisorCP = extractAttr(compTag, 'LugarExpedicion') || extractAttr(compTag, 'lugarExpedicion') || '76000';
        
        try {
          const nuevaEmpresa = await prisma.empresa.create({
            data: {
              rfc: emisorRfc,
              razonSocial: emisorNombre || 'Empresa Importada',
              regimen: emisorRegimen,
              codigoPostal: emisorCP
            }
          });
          empresasByRfc.set(emisorRfc, nuevaEmpresa);
          isEmisorRegistrado = true;
        } catch (dbErr) {
          console.error(`Error auto-creando empresa ${emisorRfc}:`, dbErr);
        }
      }

      // Si ya existe en todas las tablas correspondientes, ¡saltamos al vuelo sin tocar Supabase!
      let skipMain = false;
      let skipEmitida = false;
      let skipRecibida = false;

      if (isEmisorRegistrado) {
        if (fUuids.has(uuid)) skipMain = true;
        if (eUuids.has(uuid)) skipEmitida = true;
      } else if (isReceptorRegistrado) {
        if (rUuids.has(uuid)) skipRecibida = true;
      }

      if ((isEmisorRegistrado && skipMain && skipEmitida) || (isReceptorRegistrado && skipRecibida) || (!isEmisorRegistrado && !isReceptorRegistrado)) {
        if (!isEmisorRegistrado && !isReceptorRegistrado) {
          sinMatch++;
        } else {
          yaExistentes++;
        }
        continue; // SALTO ULTRA RÁPIDO
      }

      // Extraer datos de la factura
      const compTag = comprobanteMatch[0];
      const subTotal = parseFloat(extractAttr(compTag, 'SubTotal') || extractAttr(compTag, 'subtotal') || '0');
      const total = parseFloat(extractAttr(compTag, 'Total') || extractAttr(compTag, 'total') || '0');
      const moneda = extractAttr(compTag, 'Moneda') || extractAttr(compTag, 'moneda') || 'MXN';
      const tipoComprobante = extractAttr(compTag, 'TipoDeComprobante') || extractAttr(compTag, 'tipoDeComprobante') || 'I';
      const formaPago = extractAttr(compTag, 'FormaPago') || extractAttr(compTag, 'formaPago') || '99';
      const metodoPago = extractAttr(compTag, 'MetodoPago') || extractAttr(compTag, 'metodoPago') || 'PUE';
      const serie = extractAttr(compTag, 'Serie') || extractAttr(compTag, 'serie') || null;
      const folioStr = extractAttr(compTag, 'Folio') || extractAttr(compTag, 'folio') || null;
      const folio = folioStr ? parseInt(folioStr) : null;
      const fechaStr = extractAttr(compTag, 'Fecha') || extractAttr(compTag, 'fecha') || null;
      const fechaEmision = fechaStr ? new Date(fechaStr) : new Date();

      // Buscar si el PDF correspondiente existe
      let pdfBase64 = null;
      const pdfPath = xmlPath.substring(0, xmlPath.length - 4) + '.pdf';
      if (fs.existsSync(pdfPath)) {
        pdfBase64 = fs.readFileSync(pdfPath).toString('base64');
      }
      const xmlBase64 = fs.readFileSync(xmlPath).toString('base64');

      if (isEmisorRegistrado) {
        const empresa = empresasByRfc.get(emisorRfc);
        
        let cliente = clientesByRfc.get(receptorRfc);
        if (!cliente) {
          console.log(`[Receptor] Creando cliente auto-extraído: ${receptorNombre} (${receptorRfc})`);
          cliente = await prisma.cliente.create({
            data: {
              rfc: receptorRfc,
              razonSocial: receptorNombre || 'Cliente Importado',
              regimen: receptorRegimen,
              codigoPostal: receptorCP,
              usoCfdi: receptorUso,
              usuariosAsignados: allUserIds.length > 0 ? {
                connect: allUserIds.map(id => ({ id }))
              } : undefined
            }
          });
          clientesByRfc.set(receptorRfc, cliente);
        }

        // Importar a la tabla Factura
        if (!skipMain) {
          console.log(`[EMITIDA -> FACTURA] Importando Factura ${serie || ''}${folio || ''} - UUID: ${uuid} Emisor: ${empresa.razonSocial} -> Receptor: ${cliente.razonSocial}`);
          await prisma.factura.create({
            data: {
              uuid: uuid,
              serie: serie,
              folio: folio,
              fechaEmision: fechaEmision,
              moneda: moneda,
              tipoComprobante: tipoComprobante,
              formaPago: formaPago,
              metodoPago: metodoPago,
              subTotal: subTotal,
              total: total,
              totalImpuestosTrasladados: Math.max(0, total - subTotal),
              estatus: 'Timbrada',
              xmlBase64: xmlBase64,
              pdfBase64: pdfBase64,
              empresaId: empresa.id,
              clienteId: cliente.id
            }
          });
          fUuids.add(uuid);
          emitidosImportados++;
        }

        // Importar a la tabla FacturaEmitida
        if (!skipEmitida) {
          await prisma.facturaEmitida.create({
            data: {
              uuid: uuid,
              receptorRfc: receptorRfc,
              receptorNombre: receptorNombre || 'Cliente Importado',
              fechaEmision: fechaEmision,
              total: total,
              moneda: moneda,
              estatus: 'Vigente',
              tipoDeComprobante: tipoComprobante,
              xmlBase64: xmlBase64,
              pdfBase64: pdfBase64,
              empresaId: empresa.id
            }
          });
          eUuids.add(uuid);
        }
      } else if (isReceptorRegistrado) {
        const empresa = empresasByRfc.get(receptorRfc);
        
        // Importar a la tabla FacturaRecibida
        if (!skipRecibida) {
          console.log(`[RECIBIDA -> GASTO] Importando Factura Recibida de proveedor: ${emisorNombre} (${emisorRfc}) -> Empresa: ${empresa.razonSocial} (UUID: ${uuid})`);
          await prisma.facturaRecibida.create({
            data: {
              uuid: uuid,
              emisorRfc: emisorRfc,
              emisorNombre: emisorNombre || 'Emisor Importado',
              fechaEmision: fechaEmision,
              total: total,
              moneda: moneda,
              estatus: 'Vigente',
              tipoDeComprobante: tipoComprobante,
              xmlBase64: xmlBase64,
              pdfBase64: pdfBase64,
              empresaId: empresa.id
            }
          });
          rUuids.add(uuid);
          recibidosImportados++;
        }
      }
    } catch (err) {
      console.error(`Error procesando factura en ${xmlPath}:`, err);
      errores++;
    }
  }

  console.log("\n================ REPORTES DE IMPORTACIÓN ================");
  console.log(`Facturas Emitidas Importadas (a Módulo Facturas): ${emitidosImportados}`);
  console.log(`Facturas Recibidas Importadas (Gasto/Proveedor): ${recibidosImportados}`);
  console.log(`Facturas ya existentes: ${yaExistentes}`);
  console.log(`Facturas sin match de RFC de empresa registrada: ${sinMatch}`);
  console.log(`Errores encontrados en procesamiento: ${errores}`);
  console.log("=========================================================");
}

importInvoices()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
