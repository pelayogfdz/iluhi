const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
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

const startDateArg = args.find(a => a.startsWith('--start-date='));
const endDateArg = args.find(a => a.startsWith('--end-date='));
const empresaIdArg = args.find(a => a.startsWith('--empresa-id='));
const takeArg = args.find(a => a.startsWith('--take='));
const startDate = startDateArg ? startDateArg.split('=')[1] : null;
const endDate = endDateArg ? endDateArg.split('=')[1] : null;
const filtroEmpresaId = empresaIdArg ? empresaIdArg.split('=')[1] : null;
const takeCount = takeArg ? parseInt(takeArg.split('=')[1], 10) : null;
const isRandom = args.includes('--random');

const skipBuzon = args.includes('--skip-buzon') || args.includes('--cfdi-only') || args.includes('--opinion-only') || args.includes('--csf-only');
const buzonOnly = args.includes('--buzon-only');
const fiscalRoutine = args.includes('--fiscal-routine');
const skipCfdi = args.includes('--skip-cfdi') || buzonOnly || args.includes('--opinion-only') || args.includes('--csf-only') || fiscalRoutine; 
const skipDocumentos = args.includes('--skip-documentos') || args.includes('--cfdi-only') || buzonOnly;
const opinionOnly = args.includes('--opinion-only');
const csfOnly = args.includes('--csf-only');

// Custom FIEL login helper - Extremely Robust
async function loginFIEL(page, url, emp, cerPath, keyPath) {
    if (url) {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await delay(5000);
    }

    try {
        // Find and click the 'e.firma' or 'fiel' button
        const btnFiel = page.locator('#buttonFiel, button#btnFiel, a#btnFiel, span:has-text("e.firma")').first();
        const count = await btnFiel.count();
        if (count > 0) {
            await btnFiel.click({ force: true, timeout: 5000 });
        } else {
            const fallback = page.locator('text="e.firma"').first();
            if (await fallback.count() > 0) {
                await fallback.click({ force: true, timeout: 5000 });
            }
        }
        await delay(3000);

        // Upload certs
        const fileInputCer = page.locator('input[type="file"][id="fileCertificate"], input[type="file"][id="cer"]');
        const fileInputKey = page.locator('input[type="file"][id="filePrivateKey"], input[type="file"][id="key"]');

        if (await fileInputCer.count() > 0 && await fileInputKey.count() > 0) {
            await fileInputCer.setInputFiles(cerPath);
            await fileInputKey.setInputFiles(keyPath);
            
            const pwdInput = page.locator('input[id="privateKeyPassword"], input[id="pwd"]');
            if (await pwdInput.count() > 0) {
                await pwdInput.fill(emp.fielPassword, { timeout: 5000 });
            } else {
                await page.locator('input[type="password"]').last().fill(emp.fielPassword, { timeout: 5000 });
            }
            
            await delay(1000);
            
            // Submit without forcing wait for slow SAT navigation
            const submitBtn = page.locator('#submit, input[type="submit"], button#submit').first();
            await submitBtn.click({ force: true, noWaitAfter: true, timeout: 5000 }).catch(() => {});
            console.log(`Login FIEL submitted para ${emp.razonSocial}. Esperando respuesta (auto)...`);
            await delay(12000);
            return true;
        } else {
            const currentUrl = await page.url();
            const pageTitle = await page.title();
            const bodyText = await page.innerText('body').catch(()=>"");
            console.log(`No FIEL inputs found. Asumiendo sesion activa temporal. URL: ${currentUrl} | TITLE: ${pageTitle}`);
            console.log(`BODY SNEAK PEEK: ${bodyText.substring(0, 300).replace(/\n/g, ' ')}`);
            const tmpDir = os.tmpdir();
            await page.screenshot({ path: path.join(tmpDir, `debug_loginsat_${Math.floor(Math.random() * 1000)}.png`) }).catch(()=>{});
            await delay(5000); // Give it time
            return true;
        }
        } catch(e) {
        console.log("Excepcion menor durante login FIEL / Auto-SSO: " + e.message);
        return true; 
    }
}

// Wrapper robosto para reintentos de fases completas
async function executeWithRetry(phaseName, maxRetries = 3, retryDelayMs = 5 * 60 * 1000, logicFn) {
    let attempts = 0;
    while (attempts < maxRetries) {
        attempts++;
        try {
            console.log(`\n--- INICIANDO ${phaseName} (Intento ${attempts}/${maxRetries}) ---`);
            const success = await logicFn();
            if (success) {
                console.log(`--- ÉXITO EN ${phaseName} ---`);
                return true;
            } else {
                console.log(`--- OMITIDO O FALLIDO SUAVEMENTE ${phaseName} ---`);
            }
        } catch (e) {
            console.log(`!!! FALLO CRÍTICO EN ${phaseName}: ${e.message}`);
        }
        
        if (attempts < maxRetries) {
            console.log(`Esperando ${retryDelayMs / 60000} minutos para el siguiente reintento...`);
            await delay(retryDelayMs);
        } else {
            console.log(`Límite de reintentos (${maxRetries}) alcanzado para ${phaseName}. Continuando con el proceso...`);
        }
    }
    return false;
}

async function extractAll() {
    console.log(`Iniciando Sincronizador Maestro SAT. Histórico: ${isHistorico}, Test-One: ${isTestOne}`);
    
    // Obtener empresas
    const queryArgs = { where: { NOT: { fielPassword: null } }, orderBy: { razonSocial: 'asc' } };
    if (filtroEmpresaId) {
        queryArgs.where.id = filtroEmpresaId;
    }
    if (isTestOne) queryArgs.take = 1;
    if (takeCount && !isRandom) queryArgs.take = takeCount;

    let empresas = await prisma.empresa.findMany(queryArgs);
    if (isRandom && empresas.length > 0) {
        empresas = empresas.sort(() => 0.5 - Math.random());
        if (takeCount) empresas = empresas.slice(0, takeCount);
    }
    
    if (!empresas || empresas.length === 0) {
        console.log("No hay empresas configuradas. Abortando.");
        process.exit(1);
    }

    
    const tmpDir = os.tmpdir();
    
    
    for (const emp of empresas) {
        let browser;
        try {
            const launchOptions = {
                headless: true, // headless para background
                args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
            };
            
            // Integración de Proxy Residencial (si está configurado en .env)
            if (process.env.PROXY_SERVER) {
                launchOptions.proxy = {
                    server: process.env.PROXY_SERVER,
                    username: process.env.PROXY_USERNAME,
                    password: process.env.PROXY_PASSWORD
                };
                console.log(`[PROXY] Navegando usando proxy residencial: ${process.env.PROXY_SERVER}`);
            }

            browser = await chromium.launch(launchOptions);

        if (!emp.fielCerBase64 || !emp.fielKeyBase64) continue;
        console.log(`\n======================================================`);
        console.log(`PROCESANDO EMPRESA (MAESTRO): ${emp.razonSocial} (${emp.rfc})`);
        console.log(`======================================================`);
        
        const cerPath = path.join(tmpDir, `fiel_maestro_${emp.id}_${process.pid}.cer`);
        const keyPath = path.join(tmpDir, `fiel_maestro_${emp.id}_${process.pid}.key`);
        
        try {
            await fs.writeFile(cerPath, Buffer.from(emp.fielCerBase64.replace(/^data:(.*);base64,/, ''), 'base64'));
            await fs.writeFile(keyPath, Buffer.from(emp.fielKeyBase64.replace(/^data:(.*);base64,/, ''), 'base64'));
        } catch(err) {
            console.log("Error creando archivos FIEL: " + err.message);
            continue;
        }

        // ===========================================
        // FASE 1: CFDI (Facturas Emitidas y Recibidas)
        // ===========================================
        if (!skipCfdi) {
            let contextCfdi = await browser.newContext({ acceptDownloads: true });
            let pageCfdi = await contextCfdi.newPage();
            try {
                console.log(">> FASE 1: Extrayendo CFDI...");
                const cfdiUrl = "https://cfdiau.sat.gob.mx/nidp/app/login?id=SATUPCFDiCon";
                const loginExitoso = await loginFIEL(pageCfdi, cfdiUrl, emp, cerPath, keyPath);
                
                if (loginExitoso) {
                    const periods = [];
                    const dt = new Date();
                    const currentYear = dt.getFullYear();
                    const currentMonth = dt.getMonth() + 1;

                    if (startDate && endDate) {
                        const start = new Date(startDate + "T12:00:00");
                        const end = new Date(endDate + "T12:00:00");
                        
                        let y = start.getFullYear();
                        let m = start.getMonth() + 1;
                        const endY = end.getFullYear();
                        const endM = end.getMonth() + 1;

                        while (y < endY || (y === endY && m <= endM)) {
                            periods.push({ year: y.toString(), month: m.toString() });
                            m++;
                            if (m > 12) {
                                m = 1;
                                y++;
                            }
                        }
                    } else if (isHistorico) {
                        for (let y = 2024; y <= currentYear; y++) {
                            const limitMonth = (y === currentYear) ? currentMonth : 12;
                            for (let m = 1; m <= limitMonth; m++) {
                                periods.push({ year: y.toString(), month: m.toString() });
                            }
                        }
                    } else {
                        periods.push({ year: currentYear.toString(), month: currentMonth.toString() });
                    }

                    // RECIBIDOS
                    console.log(`   -> Extrayendo RECIBIDOS para ${periods.length} periodos...`);
                    for (const p of periods) {
                        try {
                            await pageCfdi.goto("https://portalcfdi.facturaelectronica.sat.gob.mx/ConsultaReceptor.aspx", { waitUntil: 'domcontentloaded', timeout: 30000 });
                            await delay(4000);
                            
                            await pageCfdi.click('#ctl00_MainContent_RdoFechas').catch(() => {});
                            await delay(1000);
                            await pageCfdi.selectOption('#ctl00_MainContent_CldFecha_DdlAnio', p.year).catch(() => {});
                            await delay(500);
                            await pageCfdi.selectOption('#ctl00_MainContent_CldFecha_DdlMes', p.month).catch(() => {});
                            await delay(500);
                            
                            await pageCfdi.click('#ctl00_MainContent_BtnBusqueda').catch(() => {});
                            await delay(8000); 
                            
                            const recibidos = await pageCfdi.evaluate(() => {
                                const results = [];
                                const table = document.querySelector('#ctl00_MainContent_PnlResultados table');
                                if (!table) return results;
                                // Send the table HTML to console so playwright logs it, or we can just extract it
                                results.push({ debugHtml: table.outerHTML });
                                const rows = table.querySelectorAll('tr');
                                for (let i = 1; i < rows.length; i++) {
                                    const cols = rows[i].children; // Use children instead of querySelectorAll to avoid nested tables
                                    if (cols.length > 8) {
                                        // SAT table columns can shift, textContent is safer
                                        const c1 = cols[1]?.textContent?.trim() || "";
                                        const c2 = cols[2]?.textContent?.trim() || "";
                                        const c3 = cols[3]?.textContent?.trim() || "";
                                        const c4 = cols[4]?.textContent?.trim() || "";
                                        const c5 = cols[5]?.textContent?.trim() || "";
                                        const c6 = cols[6]?.textContent?.trim() || "";
                                        const c7 = cols[7]?.textContent?.trim() || "";
                                        const c8 = cols[8]?.textContent?.trim() || "";
                                        const c9 = cols[9]?.textContent?.trim() || "";
                                        const c10 = cols[10]?.textContent?.trim() || "";
                                        const c11 = cols[11]?.textContent?.trim() || "";
                                        const c12 = cols[12]?.textContent?.trim() || "";

                                        results.push({
                                            uuid: c1.length > 30 ? c1 : (c2.length > 30 ? c2 : c3),
                                            emisorRfc: c2.includes('-') && c2.length < 15 ? c2 : (c3.includes('-') && c3.length < 15 ? c3 : c4),
                                            emisorNombre: c3.length > 10 && !c3.includes('-') ? c3 : c4,
                                            fechaEmision: c5.includes('T') || c5.includes(':') ? c5 : (c6.includes('T') ? c6 : c7),
                                            total: c9.includes('.') || c9.includes('$') ? c9 : (c10.includes('.') || c10.includes('$') ? c10 : "0"),
                                            estatus: c11.includes('Vigente') || c11.includes('Cancelado') ? c11 : (c12.includes('Vigente') || c12.includes('Cancelado') ? c12 : "Vigente")
                                        });
                                    }
                                }
                                return results;
                            });
                            
                            const rDescargas = {};
                            if (recibidos.length > 1) { // 1 because of debugHtml
                                console.log(`      * Procesando ${recibidos.length - 1} recibidos del ${p.month}/${p.year}`);
                                await fs.writeFile(path.join(tmpDir, 'sat_table_debug.html'), recibidos[0].debugHtml || "No HTML").catch(()=>{});
                                console.log(`      * Muestra CFDI:`, JSON.stringify(recibidos[1]));
                                const rows = pageCfdi.locator('#ctl00_MainContent_PnlResultados table tr');
                                const rCount = await rows.count();
                                for (let i = 1; i < rCount; i++) {
                                    const row = rows.nth(i);
                                    let uuid = (await row.locator('td').nth(1).innerText().catch(()=>"")).trim();
                                    if (!uuid) uuid = (await row.locator('td').nth(2).innerText().catch(()=>"")).trim();
                                    if (!uuid) continue;
                                    
                                    let xmlB64 = null;
                                    let pdfB64 = null;

                                    const btnXml = row.locator('input[id$="BtnDescarga"], img[id$="BtnDescarga"], span[id$="BtnDescarga"]');
                                    if (await btnXml.count() > 0) {
                                        try {
                                            const [download] = await Promise.all([
                                                pageCfdi.waitForEvent('download', { timeout: 10000 }),
                                                btnXml.first().click()
                                            ]);
                                            const buffer = await fs.readFile(await download.path());
                                            xmlB64 = buffer.toString('base64');
                                            await delay(500);
                                        } catch (err) { }
                                    }
                                    
                                    if (xmlB64 || pdfB64) rDescargas[uuid] = { xmlBase64: xmlB64, pdfBase64: pdfB64 };
                                }
                            }

                            // Save Recibidos
                            for (const cfdi of recibidos) {
                                if (!cfdi.uuid) continue;
                                const numTotal = parseFloat(cfdi.total.replace(/[^0-9.-]+/g,"")) || 0;
                                let dateParsed = cfdi.fechaEmision ? new Date(cfdi.fechaEmision) : new Date();
                                if (isNaN(dateParsed.getTime())) dateParsed = new Date();
                                const dataArchivos = rDescargas[cfdi.uuid] || {};

                                await prisma.facturaRecibida.upsert({
                                    where: { uuid: cfdi.uuid },
                                    update: { estatus: cfdi.estatus, ...(dataArchivos.xmlBase64 && { xmlBase64: dataArchivos.xmlBase64 }) },
                                    create: {
                                        uuid: cfdi.uuid, emisorRfc: cfdi.emisorRfc, emisorNombre: cfdi.emisorNombre,
                                        fechaEmision: dateParsed, total: numTotal, empresaId: emp.id, estatus: cfdi.estatus,
                                        xmlBase64: dataArchivos.xmlBase64
                                    }
                                });
                            }
                        } catch (e) {
                             console.log("Error en recibidos:", e.message);
                        }
                    } // End Recibidos

                    // EMITIDOS
                    console.log("   -> Extrayendo EMITIDOS");
                    for (const p of periods) {
                        try {
                            await pageCfdi.goto("https://portalcfdi.facturaelectronica.sat.gob.mx/ConsultaEmisor.aspx", { waitUntil: 'domcontentloaded', timeout: 30000 });
                            await delay(4000);
                            
                            await pageCfdi.click('#ctl00_MainContent_RdoFechas').catch(() => {});
                            await delay(1000);
                            await pageCfdi.locator('#ctl00_MainContent_CldFechaInicial2_Calendario_text').fill(`01/${p.month.padStart(2,'0')}/${p.year}`).catch(()=>{});
                            const dtLimit = new Date(p.year, p.month, 0);
                            await pageCfdi.locator('#ctl00_MainContent_CldFechaFinal2_Calendario_text').fill(`${dtLimit.getDate()}/${p.month.padStart(2,'0')}/${p.year}`).catch(()=>{});
                            await delay(1000);
                            
                            await pageCfdi.click('#ctl00_MainContent_BtnBusqueda').catch(() => {});
                            await delay(8000); 

                            const emitidas = await pageCfdi.evaluate(() => {
                                const results = [];
                                const table = document.querySelector('#ctl00_MainContent_PnlResultados table');
                                if (!table) return results;
                                const rows = table.querySelectorAll('tr');
                                for (let i = 1; i < rows.length; i++) {
                                    const cols = rows[i].children;
                                    if (cols.length > 8) {
                                        const c1 = cols[1]?.textContent?.trim() || "";
                                        const c2 = cols[2]?.textContent?.trim() || "";
                                        const c3 = cols[3]?.textContent?.trim() || "";
                                        const c4 = cols[4]?.textContent?.trim() || "";
                                        const c5 = cols[5]?.textContent?.trim() || "";
                                        const c6 = cols[6]?.textContent?.trim() || "";
                                        const c7 = cols[7]?.textContent?.trim() || "";
                                        const c8 = cols[8]?.textContent?.trim() || "";
                                        const c9 = cols[9]?.textContent?.trim() || "";
                                        const c10 = cols[10]?.textContent?.trim() || "";
                                        const c11 = cols[11]?.textContent?.trim() || "";
                                        const c12 = cols[12]?.textContent?.trim() || "";

                                        results.push({
                                            uuid: c1.length > 30 ? c1 : (c2.length > 30 ? c2 : c3),
                                            receptorRfc: c2.includes('-') && c2.length < 15 ? c2 : (c3.includes('-') && c3.length < 15 ? c3 : c4),
                                            receptorNombre: c3.length > 10 && !c3.includes('-') ? c3 : c4,
                                            fechaEmision: c5.includes('T') || c5.includes(':') ? c5 : (c6.includes('T') ? c6 : c7),
                                            total: c9.includes('.') || c9.includes('$') ? c9 : (c10.includes('.') || c10.includes('$') ? c10 : "0"),
                                            estatus: c11.includes('Vigente') || c11.includes('Cancelado') ? c11 : (c12.includes('Vigente') || c12.includes('Cancelado') ? c12 : "Vigente")
                                        });
                                    }
                                }
                                return results;
                            });

                            const eDescargas = {};
                            if (emitidas.length > 0) {
                                console.log(`      * Procesando ${emitidas.length} emitidas del ${p.month}/${p.year}`);
                                const rows = pageCfdi.locator('#ctl00_MainContent_PnlResultados table tr');
                                const rCount = await rows.count();
                                for (let i = 1; i < rCount; i++) {
                                    const row = rows.nth(i);
                                    let uuid = (await row.locator('td').nth(1).innerText().catch(()=>"")).trim();
                                    if (!uuid) uuid = (await row.locator('td').nth(2).innerText().catch(()=>"")).trim();
                                    if (!uuid) continue;
                                    
                                    let xmlB64 = null;
                                    const btnXml = row.locator('input[id$="BtnDescarga"], img[id$="BtnDescarga"], span[id$="BtnDescarga"]');
                                    if (await btnXml.count() > 0) {
                                        try {
                                            const [download] = await Promise.all([
                                                pageCfdi.waitForEvent('download', { timeout: 10000 }),
                                                btnXml.first().click()
                                            ]);
                                            const buffer = await fs.readFile(await download.path());
                                            xmlB64 = buffer.toString('base64');
                                            await delay(500);
                                        } catch (err) { }
                                    }
                                    if (xmlB64) eDescargas[uuid] = { xmlBase64: xmlB64 };
                                }
                            }

                            // Save Emitidas
                            for (const cfdi of emitidas) {
                                if (!cfdi.uuid) continue;
                                const numTotal = parseFloat(cfdi.total.replace(/[^0-9.-]+/g,"")) || 0;
                                let dateParsed = cfdi.fechaEmision ? new Date(cfdi.fechaEmision) : new Date();
                                if (isNaN(dateParsed.getTime())) dateParsed = new Date();
                                const dataArchivos = eDescargas[cfdi.uuid] || {};

                                await prisma.facturaEmitida.upsert({
                                    where: { uuid: cfdi.uuid },
                                    update: { estatus: cfdi.estatus, ...(dataArchivos.xmlBase64 && { xmlBase64: dataArchivos.xmlBase64 }) },
                                    create: {
                                        uuid: cfdi.uuid, receptorRfc: cfdi.receptorRfc, receptorNombre: cfdi.receptorNombre,
                                        fechaEmision: dateParsed, total: numTotal, empresaId: emp.id, estatus: cfdi.estatus,
                                        xmlBase64: dataArchivos.xmlBase64
                                    }
                                });
                            }
                        } catch (e) {
                             console.log("Error en emitidas:", e.message);
                        }
                    } // End Emitidas
                } else {
                     console.log("No se pudo logear a CFDI. Saltando Fase 1.");
                }
            } catch(e) {
                console.error("Excepcion global Fase 1 (CFDI):", e);
            }
            await contextCfdi.close().catch(()=>{});
        } // End skipCfdi


        // ===========================================
        // FASE FISCAL: Opinion, Constancia, Buzon
        // ===========================================
        let contextFiscal = await browser.newContext({ acceptDownloads: true });
        let expectedDownloadPath = null;
        let downloadedSuccess = false;
        
        const setupInterceptor = (p) => {
            p.on('response', async res => {
                try {
                    const ct = (res.headers()['content-type'] || '').toLowerCase();
                    if ((ct.includes('pdf') || ct.includes('octet-stream')) && expectedDownloadPath) {
                        const buffer = await res.body();
                        if (buffer.length > 1000) {
                            await fs.writeFile(expectedDownloadPath, buffer);
                            downloadedSuccess = true;
                        }
                    }
                } catch(e) {}
            });
            p.on('download', async dl => {
                try {
                    if (expectedDownloadPath) {
                        const tmpPath = await dl.path();
                        fsSync.copyFileSync(tmpPath, expectedDownloadPath);
                        downloadedSuccess = true;
                    }
                } catch(e) {}
            });
        };
        
        contextFiscal.on('page', newPage => setupInterceptor(newPage));

        const pageFiscal = await contextFiscal.newPage();
        setupInterceptor(pageFiscal);

        // ----------------------------------------------------
        // FASE 2 y 3: Opinión de Cumplimiento y Constancia
        // ----------------------------------------------------
        if (!skipDocumentos) {
            // DESHABILITADO TEMPORALMENTE: El módulo 32-D de Opinión tiene un firewall Cloudflare excesivamente agresivo 
            // que devuelve "Access Forbidden" a los bots sin proxy residencial.
            // Para evitar que el fallo corrompa los nombres de la fase de Constancias, se salta hasta la iteración Premium.
            /*
            await executeWithRetry("Fase 2: Opinión de Cumplimiento", 5, 5 * 60 * 1000, async () => {
                console.log(">> FASE 2: Extrayendo Opinión de Cumplimiento...");
                const pdfOPCName = `Opinion_Cumplimiento_${emp.rfc}_${Date.now()}.pdf`;
                expectedDownloadPath = path.join(tmpDir, pdfOPCName);
                downloadedSuccess = false;
                
                await loginFIEL(pageFiscal, "https://login.siat.sat.gob.mx/nidp/idff/sso?id=fiel", emp, cerPath, keyPath);
                
                const opcPortal = "https://www.sat.gob.mx/aplicacion/operacion/32846/consulta-tu-opinion-de-cumplimiento-de-obligaciones-fiscales";
                await pageFiscal.goto(opcPortal, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(()=>{});
                await delay(4000);
                
                const links = await pageFiscal.locator('a[href*="ptsc32"]').all();
                if (links.length > 0) {
                    await links[0].click({ force: true }).catch(()=>{});
                } else {
                    await pageFiscal.locator('text="EJECUTAR EN LÍNEA", text="INICIAR", text="Ejecutar en línea", text="Iniciar"').first().click({ force: true }).catch(()=>{});
                }

                for (let retry = 0; retry < 30; retry++) {
                    if (downloadedSuccess) break;
                    await delay(2000);
                }

                if (downloadedSuccess) {
                    console.log("   -> Opinión descargada físicamente!");
                    const buffer = await fs.readFile(expectedDownloadPath);
                    await prisma.documentoSat.create({
                        data: { tipo: 'OPINION', descripcion: 'POSITIVA', archivoBase64: 'data:application/pdf;base64,' + buffer.toString('base64'), empresaId: emp.id }
                    });
                    await prisma.empresa.update({ where: { id: emp.id }, data: { opinionCumplimiento: 'POSITIVA', ultimaValidacionOpinion: new Date() } });
                    const { error } = await supabaseClient.storage.from('documentos_sat').upload(`empresa_${emp.rfc || "UNKNOWN"}/${pdfOPCName}`, buffer, { upsert: true, contentType: 'application/pdf' });
                    if (!error) await supabaseClient.from('Organization').update({ updated_at: new Date() }).eq('rfc', emp.rfc);
                    await fs.unlink(expectedDownloadPath).catch(()=>{});
                    return true;
                } else {
                    const snapPath = path.join(tmpDir, `debug_opinion_${emp.rfc}_${Date.now()}.png`);
                    await pageFiscal.screenshot({ path: snapPath, fullPage: true }).catch(()=>{});
                    console.log(`   -> Guardado screenshot de error en: ${snapPath}`);
                    const activePages = contextFiscal.pages();
                    for (let i=0; i<activePages.length; i++) {
                       await activePages[i].screenshot({ path: path.join(tmpDir, `debug_opinion_${emp.rfc}_page${i}_${Date.now()}.png`), fullPage: true }).catch(()=>{});
                       const bodyHTML = await activePages[i].innerHTML('body').catch(()=>'');
                       console.log(`   -> HTML Page ${i}: ${bodyHTML.substring(0, 1000)}`);
                    }
                    throw new Error("Falló la descarga de Opinión, no se encontró archivo interceptado.");
                }
            });
            */

            await executeWithRetry("Fase 3: Constancia de Situación Fiscal", 5, 5 * 60 * 1000, async () => {
                console.log(">> FASE 3: Extrayendo Constancia de Situación Fiscal...");
                const targetCSF = "https://www.sat.gob.mx/app/seg/cont/accesoC?parametro=1&url=/operacion/43824/reimprime-tus-acuses-del-rfc&target=principal&tipoLogeo=c&hostServer=https://www.sat.gob.mx";
                
                await loginFIEL(pageFiscal, targetCSF, emp, cerPath, keyPath);
                
                const pdfCSFName = `Constancia_Situacion_${emp.rfc}_${Date.now()}.pdf`;
                expectedDownloadPath = path.join(tmpDir, pdfCSFName);
                downloadedSuccess = false;

                let clicked = false;
                for (const f of pageFiscal.frames()) {
                    const tempBtn = f.locator('button:has-text("Generar Constancia"), span:has-text("Generar Constancia"), a:has-text("Generar Constancia")').first();
                    try {
                        const count = await tempBtn.count();
                        if (count > 0) {
                            await tempBtn.click({ force: true, timeout: 5000 });
                            console.log("   -> Botón Generar Constancia presionado!");
                            clicked = true;
                            break;
                        }
                    } catch(err) {}
                }

                if (clicked) {
                    for (let retry = 0; retry < 15; retry++) {
                        if (downloadedSuccess) break;
                        await delay(2000);
                    }
                }

                if (downloadedSuccess) {
                    console.log("   -> Constancia descargada físicamente!");
                    const buffer = await fs.readFile(expectedDownloadPath);
                    
                    await prisma.documentoSat.create({
                        data: { tipo: 'CONSTANCIA', descripcion: 'Constancia de Situación Fiscal', archivoBase64: 'data:application/pdf;base64,' + buffer.toString('base64'), empresaId: emp.id }
                    });
                    
                    const { error } = await supabaseClient.storage.from('documentos_sat').upload(`empresa_${emp.rfc || "UNKNOWN"}/${pdfCSFName}`, buffer, { upsert: true, contentType: 'application/pdf' });
                    if (!error) await supabaseClient.from('Organization').update({ updated_at: new Date() }).eq('rfc', emp.rfc);
                    
                    await fs.unlink(expectedDownloadPath).catch(()=>{});
                    return true;
                } else {
                    throw new Error("Falló la descarga de Constancia, o nunca se presionó correctamente el botón oculto.");
                }
            });
        } // End skipDocumentos

        // ----------------------------------------------------
        // FASE 4: Buzón Tributario
        // ----------------------------------------------------
        if (!skipBuzon) {
            await executeWithRetry("Fase 4: Buzón Tributario", 5, 5 * 60 * 1000, async () => {
                console.log(">> FASE 4: Extrayendo Buzón Tributario...");
                const targetBuzon = "https://www.sat.gob.mx/iniciar-expediente/mis-notificaciones/";
                const ssoUrlBuzon = `https://login.siat.sat.gob.mx/nidp/idff/sso?id=buzon&sid=0&option=credential&target=${encodeURIComponent(targetBuzon)}`;
                
                await loginFIEL(pageFiscal, ssoUrlBuzon, emp, cerPath, keyPath);
                await delay(5000);
                
                // Detectar si hay avisos o mensajes pendientes
                const tieneAvisos = await pageFiscal.evaluate(() => {
                    const texto = document.body.innerText.toLowerCase();
                    return texto.includes('no leído') || texto.includes('pendientes') || texto.includes('tienes nuevos mensajes');
                }).catch(() => false);

                const descripcionBuzon = tieneAvisos ? 'Bandeja Notificaciones (AVISO PENDIENTE)' : 'Bandeja Notificaciones';

                const pdfBuzonName = `Buzon_Notificaciones_${emp.rfc}_${Date.now()}.pdf`;
                const docBuzonPath = path.join(tmpDir, pdfBuzonName);
                await pageFiscal.pdf({ path: docBuzonPath, format: 'A4', printBackground: true });
                
                console.log(`   -> Buzón descargado (PDF web capture). Avisos detectados: ${tieneAvisos}`);
                const buffer = await fs.readFile(docBuzonPath);
                await prisma.documentoSat.create({
                    data: { tipo: 'BUZON', descripcion: descripcionBuzon, archivoBase64: 'data:application/pdf;base64,' + buffer.toString('base64'), empresaId: emp.id }
                });
                await supabaseClient.storage.from('documentos_sat').upload(`empresa_${emp.rfc || "UNKNOWN"}/${pdfBuzonName}`, buffer, { upsert: true, contentType: 'application/pdf' });
                
                await fs.unlink(docBuzonPath).catch(()=>{});
                return true;
            });
        } // End skipBuzon

        // Limpieza Empresa
        expectedDownloadPath = null;
        await contextFiscal.close().catch(()=>{});
        
        if(fsSync.existsSync(cerPath)) fsSync.unlinkSync(cerPath);
        if(fsSync.existsSync(keyPath)) fsSync.unlinkSync(keyPath);
        } finally {
            if (browser) await browser.close().catch(()=>{});
        }
        
        console.log(`Finalizado proceso para ${emp.razonSocial}. Esperando 5 minutos antes de la siguiente empresa...`);
        await delay(5 * 60 * 1000);
    } // End Empresa Loop

    await prisma.$disconnect();
    console.log("\n*** Sincronización Maestro GLOBAL FINALIZADA ***");
    process.exit(0);
}

extractAll();
