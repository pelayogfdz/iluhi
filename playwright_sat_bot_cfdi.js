const { chromium } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs/promises');
const fsSync = require('fs');
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

const prisma = new PrismaClient();
const supabaseUrl = 'https://nwnakqsxvgltkbqknrlf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bmFrcXN4dmdsdGticWtucmxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2ODAwODYsImV4cCI6MjA5MTI1NjA4Nn0.g_DDpEx0g7KibbEmKkP71yyV-5taK0zecL27ciO4HDM';
const supabaseClient = createClient(supabaseUrl, supabaseKey);

const delay = ms => new Promise(res => setTimeout(res, ms));

const args = process.argv.slice(2);
const isHistorico = args.includes('--historico');
const isTestOne = args.includes('--test-one');

async function extractCFDI() {
    console.log(`Iniciando extracción de CFDI (Emitidos y Recibidos). Histórico: ${isHistorico}, Test-One: ${isTestOne}`);
    
    // Iterar sobre todas las empresas con FIEL
    const queryArgs = { where: { NOT: { fielPassword: null } } };
    if (isTestOne) queryArgs.take = 1;

    const empresas = await prisma.empresa.findMany(queryArgs);
    if (!empresas || empresas.length === 0) {
        console.log("No hay empresas configuradas con FIEL. Abortando bot CFDI.");
        process.exit(1);
    }

    const browser = await chromium.launch({ headless: true });
    const tmpDir = os.tmpdir();
    
    for (const emp of empresas) {
        if (!emp.fielCerBase64 || !emp.fielKeyBase64) continue;
        console.log(`\n======== Procesando Empresa: ${emp.razonSocial} (${emp.rfc}) ========`);
        const cerPath = path.join(tmpDir, `sat_cfdi_${emp.id}.cer`);
        const keyPath = path.join(tmpDir, `sat_cfdi_${emp.id}.key`);
        
        try {
            await fs.writeFile(cerPath, Buffer.from(emp.fielCerBase64, 'base64'));
            await fs.writeFile(keyPath, Buffer.from(emp.fielKeyBase64, 'base64'));
        } catch(err) {
            console.log("Error creando archivos FIEL para empresa: " + err.message);
            continue;
        }

        const context = await browser.newContext();
        await context.clearCookies();
        const page = await context.newPage();

        try {
            // Login CFDI
            const loginUrl = "https://cfdiau.sat.gob.mx/nidp/app/login?id=SATUPCFDiCon";
            await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
            await delay(3000);
            
            await page.locator('#buttonFiel').click().catch(() => {});
            await delay(2000);

            const fileInputCer = page.locator('input[type="file"][id="fileCertificate"]');
            const fileInputKey = page.locator('input[type="file"][id="filePrivateKey"]');
            
            if (await fileInputCer.count() > 0 && await fileInputKey.count() > 0) {
                await fileInputCer.setInputFiles(cerPath);
                await fileInputKey.setInputFiles(keyPath);
                await page.fill('input[id="privateKeyPassword"]', emp.fielPassword);
                await delay(1000);
                await page.click('#submit', {timeout: 90000});
                console.log("Login FIEL enviado. Esperando respuesta...");
                await delay(10000);
            } else {
                console.log("ERROR: No se encontraron inputs de FIEL.");
                continue; // Ir a la sig empresa
            }

            // Construir arreglo de periodos
            const periods = [];
            const dt = new Date();
            const currentYear = dt.getFullYear();
            const currentMonth = dt.getMonth() + 1;

            if (isHistorico) {
                for (let y = 2024; y <= currentYear; y++) {
                    const limitMonth = (y === currentYear) ? currentMonth : 12;
                    for (let m = 1; m <= limitMonth; m++) {
                        periods.push({ year: y.toString(), month: m.toString() });
                    }
                }
            } else {
                periods.push({ year: currentYear.toString(), month: currentMonth.toString() });
            }

            // TAREA 1: RECIBIDOS
            console.log("\n--- EXTRACCION: CFDI RECIBIDOS ---");
            for (const p of periods) {
                try {
                    await page.goto("https://portalcfdi.facturaelectronica.sat.gob.mx/ConsultaReceptor.aspx", { waitUntil: 'domcontentloaded' });
                    await delay(4000);
                    
                    await page.click('#ctl00_MainContent_RdoFechas').catch(() => {});
                    await delay(1000);
                    await page.selectOption('#ctl00_MainContent_CldFecha_DdlAnio', p.year).catch(() => {});
                    await delay(500);
                    await page.selectOption('#ctl00_MainContent_CldFecha_DdlMes', p.month).catch(() => {});
                    await delay(500);
                    
                    await page.click('#ctl00_MainContent_BtnBusqueda').catch(() => {});
                    console.log(`>> Buscando Recibidos: Año ${p.year} - Mes ${p.month}`);
                    await delay(8000); // Tarda en cargar resultados gruesos
                    
                    const recibidos = await page.evaluate(() => {
                        const results = [];
                        const table = document.querySelector('#ctl00_MainContent_PnlResultados table');
                        if (!table) return results;
                        const rows = table.querySelectorAll('tr');
                        for (let i = 1; i < rows.length; i++) {
                            const cols = rows[i].querySelectorAll('td');
                            if (cols.length > 8) {
                                results.push({
                                    uuid: cols[1]?.innerText?.trim() || cols[2]?.innerText?.trim() || "",
                                    emisorRfc: cols[2]?.innerText?.trim() || cols[3]?.innerText?.trim() || "",
                                    emisorNombre: cols[3]?.innerText?.trim() || cols[4]?.innerText?.trim() || "",
                                    fechaEmision: cols[5]?.innerText?.trim() || cols[6]?.innerText?.trim() || "",
                                    total: cols[7]?.innerText?.trim() || cols[8]?.innerText?.trim() || "0",
                                    estatus: cols[9]?.innerText?.trim() || cols[10]?.innerText?.trim() || "Vigente"
                                });
                            }
                        }
                        return results;
                    });
                    
                    const descargasArchivosRecibidos = {};
                    if (recibidos.length > 0) {
                        console.log(`   * Obteniendo XML/PDF fisicos de ${recibidos.length} facturas recibidas...`);

                        const rows = page.locator('#ctl00_MainContent_PnlResultados table tr');
                        const rCount = await rows.count();
                        for (let i = 1; i < rCount; i++) {
                            const row = rows.nth(i);
                            // Try multiple indices to get the UUID correctly
                            const uuidLocator1 = row.locator('td').nth(1);
                            const uuidLocator2 = row.locator('td').nth(2);
                            let uuid = (await uuidLocator1.innerText().catch(()=>"")).trim();
                            if (!uuid) uuid = (await uuidLocator2.innerText().catch(()=>"")).trim();
                            if (!uuid) {
                                console.log(`Skipping physical download for row ${i} because UUID is empty`);
                                continue;
                            }
                            console.log(`Physical download loop found UUID: ${uuid}`);
                            
                            let xmlB64 = null;
                            let pdfB64 = null;

                            // XML
                            const btnXml = row.locator('input[id$="BtnDescarga"], img[id$="BtnDescarga"], span[id$="BtnDescarga"]');
                            if (await btnXml.count() > 0) {
                                try {
                                    const [download] = await Promise.all([
                                        page.waitForEvent('download', { timeout: 10000 }),
                                        btnXml.first().click()
                                    ]);
                                    const dlPath = await download.path();
                                    const buffer = await fs.readFile(dlPath);
                                    xmlB64 = buffer.toString('base64');
                                    await delay(1500);
                                } catch (err) { }
                            }

                            // PDF
                            const btnPdf = row.locator('input[id$="BtnRecupera"], img[id$="BtnRecupera"], span[id$="BtnRecupera"]');
                            if (await btnPdf.count() > 0) {
                                try {
                                    const [download] = await Promise.all([
                                        page.waitForEvent('download', { timeout: 10000 }),
                                        btnPdf.first().click()
                                    ]);
                                    const dlPath = await download.path();
                                    const buffer = await fs.readFile(dlPath);
                                    pdfB64 = buffer.toString('base64');
                                    await delay(1500);
                                } catch (err) { }
                            }
                            
                            if (xmlB64 || pdfB64) {
                                descargasArchivosRecibidos[uuid] = { xmlBase64: xmlB64, pdfBase64: pdfB64 };
                            }
                        }
                    }

                    if (recibidos.length > 0) {
                        for (const cfdi of recibidos) {
                            if (!cfdi.uuid) continue;
                            const numTotal = parseFloat(cfdi.total.replace(/[^0-9.-]+/g,"")) || 0;
                            const dateParsed = cfdi.fechaEmision ? new Date(cfdi.fechaEmision) : new Date();

                            const dataArchivos = descargasArchivosRecibidos[cfdi.uuid] || {};

                            console.log(`Intentando upsert para: ${cfdi.uuid}`);
                            try {
                                await prisma.facturaRecibida.upsert({
                                    where: { uuid: cfdi.uuid },
                                    update: { 
                                        estatus: cfdi.estatus,
                                        ...(dataArchivos.xmlBase64 && { xmlBase64: dataArchivos.xmlBase64 }),
                                        ...(dataArchivos.pdfBase64 && { pdfBase64: dataArchivos.pdfBase64 })
                                    },
                                    create: {
                                        uuid: cfdi.uuid, 
                                        emisorRfc: cfdi.emisorRfc, 
                                        emisorNombre: cfdi.emisorNombre,
                                        fechaEmision: dateParsed, 
                                        total: numTotal, 
                                        empresaId: emp.id, 
                                        estatus: cfdi.estatus,
                                        xmlBase64: dataArchivos.xmlBase64,
                                        pdfBase64: dataArchivos.pdfBase64
                                    }
                                });
                                console.log(`Upsert exitoso para: ${cfdi.uuid}`);
                                
                                if (dataArchivos.xmlBase64) {
                                    const bufferXml = Buffer.from(dataArchivos.xmlBase64, 'base64');
                                    await supabaseClient.storage.from('documentos_sat').upload(`empresa_${emp.rfc || "UNKNOWN"}/facturas/${cfdi.uuid}.xml`, bufferXml, { upsert: true, contentType: 'text/xml' });
                                }
                                if (dataArchivos.pdfBase64) {
                                    const bufferPdf = Buffer.from(dataArchivos.pdfBase64, 'base64');
                                    await supabaseClient.storage.from('documentos_sat').upload(`empresa_${emp.rfc || "UNKNOWN"}/facturas/${cfdi.uuid}.pdf`, bufferPdf, { upsert: true, contentType: 'application/pdf' });
                                }
                            } catch (e) {
                                console.log(`ERROR EN UPSERT DE ${cfdi.uuid}:`, e);
                            }
                        }
                        console.log(`   * ${recibidos.length} facturas insertadas/actualizadas.`);
                    } else {
                        console.log(`   * No hay recibidas.`);
                    }
                } catch (e) {
                    console.log(`   Error en recibidos ${p.year}-${p.month}: ${e.message}`);
                }
            }

            // TAREA 2: EMITIDOS
            console.log("\n--- EXTRACCION: CFDI EMITIDOS ---");
            for (const p of periods) {
                try {
                    await page.goto("https://portalcfdi.facturaelectronica.sat.gob.mx/ConsultaEmisor.aspx", { waitUntil: 'domcontentloaded' });
                    await delay(4000);
                    
                    await page.click('#ctl00_MainContent_RdoFechas').catch(() => {});
                    await delay(1000);
                    
                    await page.selectOption('#ctl00_MainContent_CldFechaInicial2_Calendario_DdlAnio', p.year).catch(() => {});
                    await delay(500);
                    await page.selectOption('#ctl00_MainContent_CldFechaInicial2_Calendario_DdlMes', p.month).catch(() => {});
                    await delay(500);
                    
                    await page.selectOption('#ctl00_MainContent_CldFechaFinal2_Calendario_DdlAnio', p.year).catch(() => {});
                    await delay(500);
                    await page.selectOption('#ctl00_MainContent_CldFechaFinal2_Calendario_DdlMes', p.month).catch(() => {});
                    await delay(500);
                    
                    await page.click('#ctl00_MainContent_BtnBusqueda').catch(() => {});
                    console.log(`>> Buscando Emitidos: Año ${p.year} - Mes ${p.month}`);
                    await delay(8000);
                    
                    const emitidos = await page.evaluate(() => {
                        const results = [];
                        const table = document.querySelector('#ctl00_MainContent_PnlResultados table');
                        if (!table) return results;
                        const rows = table.querySelectorAll('tr');
                        for (let i = 1; i < rows.length; i++) {
                            const cols = rows[i].querySelectorAll('td');
                            if (cols.length > 8) {
                                results.push({
                                    uuid: cols[1]?.innerText?.trim() || cols[2]?.innerText?.trim() || "",
                                    receptorRfc: cols[2]?.innerText?.trim() || cols[4]?.innerText?.trim() || "",
                                    receptorNombre: cols[3]?.innerText?.trim() || cols[5]?.innerText?.trim() || "",
                                    fechaEmision: cols[5]?.innerText?.trim() || cols[6]?.innerText?.trim() || "",
                                    total: cols[7]?.innerText?.trim() || cols[8]?.innerText?.trim() || "0",
                                    estatus: cols[9]?.innerText?.trim() || cols[10]?.innerText?.trim() || "Vigente"
                                });
                            }
                        }
                        return results;
                    });
                    
                    const descargasArchivosEmitidos = {};
                    if (emitidos.length > 0) {
                        console.log(`   * Obteniendo XML/PDF fisicos de ${emitidos.length} facturas emitidas...`);
                        const rows = page.locator('#ctl00_MainContent_PnlResultados table tr');
                        const rCount = await rows.count();
                        for (let i = 1; i < rCount; i++) {
                            const row = rows.nth(i);
                            const uuidLocator1 = row.locator('td').nth(1);
                            const uuidLocator2 = row.locator('td').nth(2);
                            let uuid = (await uuidLocator1.innerText().catch(()=>"")).trim();
                            if (!uuid) uuid = (await uuidLocator2.innerText().catch(()=>"")).trim();
                            if (!uuid) {
                                console.log(`Skipping emitidas download row ${i} because empty uuid`);
                                continue;
                            }
                            console.log(`Emitidas loop UUID: ${uuid}`);
                            
                            let xmlB64 = null;
                            let pdfB64 = null;

                            // XML
                            const btnXml = row.locator('input[id$="BtnDescarga"], img[id$="BtnDescarga"], span[id$="BtnDescarga"]');
                            if (await btnXml.count() > 0) {
                                try {
                                    const [download] = await Promise.all([
                                        page.waitForEvent('download', { timeout: 10000 }),
                                        btnXml.first().click()
                                    ]);
                                    const dlPath = await download.path();
                                    const buffer = await fs.readFile(dlPath);
                                    xmlB64 = buffer.toString('base64');
                                    await delay(1500);
                                } catch (err) { }
                            }

                            // PDF
                            const btnPdf = row.locator('input[id$="BtnRecupera"], img[id$="BtnRecupera"], span[id$="BtnRecupera"]');
                            if (await btnPdf.count() > 0) {
                                try {
                                    const [download] = await Promise.all([
                                        page.waitForEvent('download', { timeout: 10000 }),
                                        btnPdf.first().click()
                                    ]);
                                    const dlPath = await download.path();
                                    const buffer = await fs.readFile(dlPath);
                                    pdfB64 = buffer.toString('base64');
                                    await delay(1500);
                                } catch (err) { }
                            }
                            
                            if (xmlB64 || pdfB64) {
                                descargasArchivosEmitidos[uuid] = { xmlBase64: xmlB64, pdfBase64: pdfB64 };
                            }
                        }
                    }

                    if (emitidos.length > 0) {
                        for (const cfdi of emitidos) {
                            if (!cfdi.uuid) continue;
                            const numTotal = parseFloat(cfdi.total.replace(/[^0-9.-]+/g,"")) || 0;
                            const dateParsed = cfdi.fechaEmision ? new Date(cfdi.fechaEmision) : new Date();

                            const dataArchivos = descargasArchivosEmitidos[cfdi.uuid] || {};

                            console.log(`Intentando upsert (emitida) para: ${cfdi.uuid}`);
                            try {
                                await prisma.facturaEmitida.upsert({
                                    where: { uuid: cfdi.uuid },
                                    update: { 
                                        estatus: cfdi.estatus,
                                        ...(dataArchivos.xmlBase64 && { xmlBase64: dataArchivos.xmlBase64 }),
                                        ...(dataArchivos.pdfBase64 && { pdfBase64: dataArchivos.pdfBase64 })
                                    },
                                    create: {
                                        uuid: cfdi.uuid, 
                                        receptorRfc: cfdi.receptorRfc, 
                                        receptorNombre: cfdi.receptorNombre,
                                        fechaEmision: dateParsed, 
                                        total: numTotal, 
                                        empresaId: emp.id, 
                                        estatus: cfdi.estatus,
                                        xmlBase64: dataArchivos.xmlBase64,
                                        pdfBase64: dataArchivos.pdfBase64
                                    }
                                });
                                console.log(`Upsert (emitida) exitoso para: ${cfdi.uuid}`);
                                
                                if (dataArchivos.xmlBase64) {
                                    const bufferXml = Buffer.from(dataArchivos.xmlBase64, 'base64');
                                    await supabaseClient.storage.from('documentos_sat').upload(`empresa_${emp.rfc || "UNKNOWN"}/facturas/${cfdi.uuid}.xml`, bufferXml, { upsert: true, contentType: 'text/xml' });
                                }
                                if (dataArchivos.pdfBase64) {
                                    const bufferPdf = Buffer.from(dataArchivos.pdfBase64, 'base64');
                                    await supabaseClient.storage.from('documentos_sat').upload(`empresa_${emp.rfc || "UNKNOWN"}/facturas/${cfdi.uuid}.pdf`, bufferPdf, { upsert: true, contentType: 'application/pdf' });
                                }
                            } catch (e) {
                                console.log(`ERROR EN UPSERT EMITIDA DE ${cfdi.uuid}:`, e);
                            }
                        }
                        console.log(`   * ${emitidos.length} facturas insertadas/actualizadas.`);
                    } else {
                        console.log(`   * No hay emitidas.`);
                    }
                } catch(e) {
                    console.log(`   Error en emitidos ${p.year}-${p.month}: ${e.message}`);
                }
            }

        } catch(e) {
            console.error(`Error procesando empresa ${emp.razonSocial}: ${e.message}`);
        } finally {
            await context.close();
            try { 
                await fs.unlink(cerPath).catch(()=>{}); 
                await fs.unlink(keyPath).catch(()=>{}); 
            } catch(e) {}
        }
    }
    
    await browser.close();
    console.log("\n--- Terminó la extracción global del robot de CFDI (Multi-Empresa) ---");
    process.exit(0);
}

extractCFDI();
