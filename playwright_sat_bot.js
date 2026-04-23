const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { createClient } = require('@supabase/supabase-js');

const prisma = new PrismaClient();
const supabaseUrl = 'https://nwnakqsxvgltkbqknrlf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bmFrcXN4dmdsdGticWtucmxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2ODAwODYsImV4cCI6MjA5MTI1NjA4Nn0.g_DDpEx0g7KibbEmKkP71yyV-5taK0zecL27ciO4HDM';
const supabaseClient = createClient(supabaseUrl, supabaseKey);

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

(async () => {
    console.log("Iniciando extracción dual de SAT...");
    const args = process.argv.slice(2);
    const buzonOnly = args.includes('--buzon-only');
    const skipBuzon = args.includes('--skip-buzon');
    
    // Obtenemos a Varios Empresarios
    const empresas = await prisma.empresa.findMany({ where: { NOT: { fielPassword: null } } });
    if (empresas.length === 0) {
        console.error("No se encontraron credenciales válidas en la BD.");
        process.exit(1);
    }

    const tmpDir = path.join(__dirname, 'tmp_sat_fiel');
    if (!fs.existsSync(tmpDir)) { fs.mkdirSync(tmpDir); }

    const browser = await chromium.launch({ 
        headless: false, 
        slowMo: 100,
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--start-maximized']
    }); 

    for (const emp of empresas) {
        if (!emp.fielCerBase64 || !emp.fielKeyBase64) continue;
        console.log(`\n======================================================`);
        console.log(`PROCESANDO EMPRESA: ${emp.razonSocial || emp.rfc}`);
        console.log(`======================================================`);

        const cerPath = path.join(tmpDir, `fiel_${emp.id}.cer`);
        const keyPath = path.join(tmpDir, `fiel_${emp.id}.key`);
        
        const cerBase64 = emp.fielCerBase64.replace(/^data:(.*);base64,/, '');
        const keyBase64 = emp.fielKeyBase64.replace(/^data:(.*);base64,/, '');

        fs.writeFileSync(cerPath, Buffer.from(cerBase64, 'base64'));
        fs.writeFileSync(keyPath, Buffer.from(keyBase64, 'base64'));

        const safeRazonSocial = (emp.razonSocial || "EMPRESA").replace(/[^a-zA-Z0-9 -]/g, "").trim();
        const today = getTodayString();
        const pdfOPCName = `OC ${today} ${safeRazonSocial}.pdf`;
        const pdfCSFName = `CSF ${today} ${safeRazonSocial}.pdf`;

        const context = await browser.newContext({
            viewport: null,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (Chrome)',
            acceptDownloads: true
        });

        let expectedDownloadPath = null;
        let downloadedSuccess = false;

        const handleIntercept = async (response) => {
            const ct = (response.headers()['content-type'] || '').toLowerCase();
            if (ct.includes('pdf') || ct.includes('octet-stream')) {
                try {
                    const buffer = await response.body();
                    if (expectedDownloadPath && buffer.length > 1000) {
                        fs.writeFileSync(expectedDownloadPath, buffer);
                        console.log(`[SAT_INTERCEPTOR_RESP] PDF atrapado via response body: ${expectedDownloadPath}`);
                        downloadedSuccess = true;
                    }
                } catch (err) {
                    // Podria ser que sea tratado como un 'download' nativo
                }
            }
        };

        context.on('page', newPage => { 
            newPage.on('response', handleIntercept); 
            newPage.on('download', async (download) => {
                if (expectedDownloadPath) {
                    try {
                        const dlPath = await download.path();
                        if (dlPath) {
                            fs.copyFileSync(dlPath, expectedDownloadPath);
                            console.log(`[SAT_INTERCEPTOR_DL] PDF atrapado via evento download: ${expectedDownloadPath}`);
                            downloadedSuccess = true;
                        }
                    } catch (e) {
                           console.log("Error en evento download", e);
                    }
                }
            });
        });

        async function loginSat(pageActiva, authUrlId, redirectTargetUrl) {
            console.log(`[NAV] Iniciando goto a SSO ID: ${authUrlId || 'DIRECT'}...`);
            try {
                if (!authUrlId) {
                    await pageActiva.goto(redirectTargetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    await pageActiva.waitForURL(/login\.siat\.sat\.gob\.mx/, { timeout: 30000 });
                } else {
                    const ssoUrl = `https://login.siat.sat.gob.mx/nidp/idff/sso?id=${authUrlId}&sid=0&option=credential&sid=0&target=${encodeURIComponent(redirectTargetUrl)}`;
                    await pageActiva.goto(ssoUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                }
            } catch (e) {}

            await delay(5000);
            
            const btnFiel = pageActiva.locator('#buttonFiel, button#btnFiel, a#btnFiel, span:has-text("e.firma")').first();
            if (await btnFiel.isVisible()) {
                await btnFiel.click({ timeout: 5000 }).catch(()=>{});
            } else {
                await pageActiva.locator('text="e.firma"').first().click({force: true, timeout: 5000}).catch(()=>{});
            }
            await delay(3000);

            const fileCerInputs = await pageActiva.locator('input[type="file"]').all();
            if (fileCerInputs.length >= 2) {
                await fileCerInputs[0].setInputFiles(cerPath, { timeout: 5000 }).catch(()=>{});
                await fileCerInputs[1].setInputFiles(keyPath, { timeout: 5000 }).catch(()=>{});
            } else {
                await pageActiva.setInputFiles('#fileCertificate', cerPath, { timeout: 5000 }).catch(()=>{});
                await pageActiva.setInputFiles('#filePrivateKey', keyPath, { timeout: 5000 }).catch(()=>{});
            }

            const pwdInput = pageActiva.locator('#privateKeyPassword');
            if (await pwdInput.isVisible()) {
                await pwdInput.fill(emp.fielPassword, { timeout: 5000 });
            } else {
                await pageActiva.locator('input[type="password"]').last().fill(emp.fielPassword, { timeout: 5000 }).catch(()=>{});
            }
            
            await pageActiva.locator('#submit, input[type="submit"], button#submit').first().click({force: true}).catch(()=>{});
            console.log("Credenciales enviadas. Esperando validacion...");
        }

        try {
            const page = await context.newPage();

            // TAREA 1: OPINION
            if (!buzonOnly) {
                expectedDownloadPath = path.join(tmpDir, pdfOPCName);
                downloadedSuccess = false;
                await loginSat(page, null, 'https://ptsc32d.clouda.sat.gob.mx/');
                
                await delay(15000);
                if (!downloadedSuccess) {
                    await delay(15000);
                }

                // TAREA 2: CONSTANCIA
                expectedDownloadPath = path.join(tmpDir, pdfCSFName);
                downloadedSuccess = false;
                const targetCSF = "https://wwwmat.sat.gob.mx/app/seg/cont/accesoC?parametro=1&url=/operacion/43824/reimprime-tus-acuses-del-rfc&target=principal&tipoLogeo=c&hostServer=https://wwwmat.sat.gob.mx";
                await loginSat(page, "mat-ptsc-totp_Aviso", targetCSF);

                const allFrames = page.frames();
                let clicked = false;
                for (const f of allFrames) {
                    const tempBtn = f.locator('button:has-text("Generar Constancia"), span:has-text("Generar Constancia"), a:has-text("Generar Constancia")').first();
                    try {
                        const count = await tempBtn.count();
                        if (count > 0) {
                            await tempBtn.click({force: true, timeout: 5000});
                            console.log("Constancia solicitada (click)!");
                            clicked = true;
                            break;
                        }
                    } catch(e) {}
                }

                if (clicked) {
                    await delay(15000);
                }
            }

            // TAREA 3: BUZON
            if (!skipBuzon) {
                const urlNotificaciones = "https://wwwmat.sat.gob.mx/iniciar-expediente/mis-notificaciones/";
                const urlComunicados = "https://wwwmat.sat.gob.mx/iniciar-expediente/mis-comunicados/";
                await loginSat(page, "buzon", urlNotificaciones);
                await delay(10000);
                try {
                    await page.goto(urlNotificaciones, { waitUntil: 'load', timeout: 30000 });
                    await delay(8000);
                    const pdfBznNotif = `Buzon_Notificaciones_${today.replace(/\//g, '')}_${emp.id}.pdf`;
                    await page.pdf({ path: path.join(tmpDir, pdfBznNotif), format: 'A4', scale: 0.8 });
                    
                    await page.goto(urlComunicados, { waitUntil: 'load', timeout: 30000 });
                    await delay(8000);
                    const pdfBznComun = `Buzon_Comunicados_${today.replace(/\//g, '')}_${emp.id}.pdf`;
                    await page.pdf({ path: path.join(tmpDir, pdfBznComun), format: 'A4', scale: 0.8 });
                } catch(err) {}
            }

            // Subir Resultados
            const filesBucket = fs.readdirSync(tmpDir).filter(f => f.endsWith('.pdf'));
            for (const file of filesBucket) {
                 if (file === "Constancia_Situacion_Fiscal_Popup.pdf") continue; // basura temp
                 const buffer = fs.readFileSync(path.join(tmpDir, file));
                 
                 let tipo = 'CONSTANCIA';
                 let desc = 'Constancia de Situación Fiscal'; 
                 if (file.includes('OC') || file.includes('Opinion') || file.includes('OPC')) {
                     tipo = 'OPINION';
                     desc = 'POSITIVA';
                 } else if (file.includes('Buzon')) {
                     tipo = 'BUZON';
                     desc = file.includes('Notificaciones') ? 'Notificaciones' : 'Comunicados';
                 }
                 
                 // DB Local
                 try {
                    await prisma.documentoSat.create({
                      data: { tipo: tipo, descripcion: desc, archivoBase64: 'data:application/pdf;base64,' + buffer.toString('base64'), empresaId: emp.id }
                    });
                    if (tipo === 'OPINION') {
                      await prisma.empresa.update({ where: { id: emp.id }, data: { opinionCumplimiento: 'POSITIVA', ultimaValidacionOpinion: new Date() } });
                    }
                 } catch(dbErr) {}

                 // Supabase
                 const storagePath = `empresa_${emp.rfc || "UNKNOWN"}/${file}`;
                 const { data, error } = await supabaseClient.storage.from('documentos_sat').upload(storagePath, buffer, { upsert: true, contentType: 'application/pdf' });
                 if (!error) {
                     await supabaseClient.from('Organization').update({ updated_at: new Date() }).eq('rfc', emp.rfc);
                 }
                 
                 // Limpiar local
                 fs.unlinkSync(path.join(tmpDir, file));
            }

        } catch(e) {
            console.error(`Excepcion en empresa ${emp.razonSocial}:`, e.message);
        } finally {
            await context.close().catch(()=>{});
            if(fs.existsSync(cerPath)) fs.unlinkSync(cerPath);
            if(fs.existsSync(keyPath)) fs.unlinkSync(keyPath);
        }
    }

    await browser.close().catch(()=>{});
    await prisma.$disconnect();
    console.log("Extraccion global finalizada");
})();
