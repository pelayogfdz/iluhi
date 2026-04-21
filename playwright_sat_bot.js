const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

(async () => {
  const args = process.argv.slice(2);
  const buzonOnly = args.includes('--buzon-only');
  const skipBuzon = args.includes('--skip-buzon');
  console.log(`Iniciando extracción dual de SAT... (buzonOnly: ${buzonOnly}, skipBuzon: ${skipBuzon})`);
  
  const emp = await prisma.empresa.findFirst({ where: { NOT: { fielPassword: null } }});
  
  if (!emp || !emp.fielCerBase64 || !emp.fielKeyBase64 || !emp.fielPassword) {
    console.error("No se encontraron credenciales válidas en la BD con FIEL configurada.");
    process.exit(1);
  }

  const tmpDir = path.join(__dirname, 'tmp_sat_fiel');
  if (!fs.existsSync(tmpDir)) { fs.mkdirSync(tmpDir); }

  const cerPath = path.join(tmpDir, 'fiel.cer');
  const keyPath = path.join(tmpDir, 'fiel.key');
  
  const cerBase64 = emp.fielCerBase64.replace(/^data:(.*);base64,/, '');
  const keyBase64 = emp.fielKeyBase64.replace(/^data:(.*);base64,/, '');

  fs.writeFileSync(cerPath, Buffer.from(cerBase64, 'base64'));
  fs.writeFileSync(keyPath, Buffer.from(keyBase64, 'base64'));

  // Nombres de archivos estandarizados
  const safeRazonSocial = (emp.razonSocial || "EMPRESA").replace(/[^a-zA-Z0-9 -]/g, "").trim();
  const today = getTodayString();
  const pdfOPCName = `OC ${today} ${safeRazonSocial}.pdf`;
  const pdfCSFName = `CSF ${today} ${safeRazonSocial}.pdf`;

  console.log("Archivos listos. Levantando navegador headless: false...");
  
  const browser = await chromium.launch({ 
      headless: false, 
      slowMo: 100,
      args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--start-maximized']
  }); 

  const context = await browser.newContext({
    viewport: null,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    acceptDownloads: true
  });

  // LOGICA INTERCEPTADORA DINÁMICA
  let expectedDownloadPath = null;
  let downloadedSuccess = false;

  const handleIntercept = async (response) => {
    if (response.headers()['content-type'] === 'application/pdf') {
      try {
          const buffer = await response.body();
          if (expectedDownloadPath) {
              fs.writeFileSync(expectedDownloadPath, buffer);
              console.log(`[SAT_INTERCEPTOR] ¡EXITO! PDF atrapado y guardado en: ${expectedDownloadPath}`);
              downloadedSuccess = true;
          }
      } catch (err) {
          console.error("[SAT_INTERCEPTOR_ERROR]", err);
      }
    }
  };

  context.on('page', newPage => { newPage.on('response', handleIntercept); });

  async function loginSat(pageActiva, authUrlId, redirectTargetUrl, customReferer) {
      console.log(`[NAV] Iniciando goto a SSO ID: ${authUrlId || 'DIRECT'}...`);
      try {
          if (!authUrlId) {
             console.log(`[NAV] Navegacion directa al target para inducir redireccion al portal de login...`);
             await pageActiva.goto(redirectTargetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
             console.log(`[NAV] Esperando redireccion automatica a SSO...`);
             await pageActiva.waitForURL(/login\.siat\.sat\.gob\.mx/, { timeout: 30000 });
          } else {
             const ssoUrl = `https://login.siat.sat.gob.mx/nidp/idff/sso?id=${authUrlId}&sid=0&option=credential&sid=0&target=${encodeURIComponent(redirectTargetUrl)}`;
             if (customReferer) {
                 await pageActiva.goto(ssoUrl, { referer: customReferer, waitUntil: 'domcontentloaded', timeout: 30000 });
             } else {
                 await pageActiva.goto(ssoUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
             }
          }
          console.log(`[NAV] goto/redirect finalizado con éxito.`);
      } catch (e) {
          console.log(`[NAV_ERROR] Error en goto o redireccion:`, e.message);
      }
      
      console.log("[NAV] Esperando 6s para estabilizacion de Svelte...");
      await delay(6000);

      // Fiel Tab
      console.log("[NAV] Detectando boton e.firma...");
      const btnFiel = pageActiva.locator('#buttonFiel, button#btnFiel, a#btnFiel, span:has-text("e.firma")').first();
      if (await btnFiel.isVisible()) {
          console.log("[NAV] Boton visible, click...");
          await btnFiel.click({ timeout: 5000 }).catch(()=>{});
      } else {
          console.log("[NAV] Boton no visible, click by text...");
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
          await pageActiva.setInputFiles('input[title="Certificado"]', cerPath, { timeout: 2000 }).catch(()=>{});
          await pageActiva.setInputFiles('input[title="Clave Privada"]', keyPath, { timeout: 2000 }).catch(()=>{});
      }

      console.log("[NAV] Inputs listos, intentando llenar contrasena...");
      await pageActiva.screenshot({ path: 'debug_loginsat_1.png' });
      const pwdInput = pageActiva.locator('#privateKeyPassword');
      if (await pwdInput.isVisible()) {
          await pwdInput.fill(emp.fielPassword, { timeout: 5000 });
      } else {
           await pageActiva.locator('input[type="password"]').last().fill(emp.fielPassword, { timeout: 5000 }).catch(()=>{});
      }
      
      console.log("[NAV] Clickeando Submit...");
      await pageActiva.screenshot({ path: 'debug_loginsat_2.png' });
      const submitBtn = pageActiva.locator('#submit, input[type="submit"], button#submit').first();
      await submitBtn.click({ timeout: 5000 }).catch(()=>{});
      console.log("Credenciales enviadas. Esperando validación...");
      await delay(12000);
  }

  try {
    const page = await context.newPage();
    page.on('response', handleIntercept);
    
    // Ocultar webdriver
    await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => undefined }) );

    // ==========================================
    // TAREA 1: OPINIÓN DE CUMPLIMIENTO (OPC)
    // ==========================================
    if (!buzonOnly) {
        console.log("\n--- COMIENZA EXTRACCION: OPINION DE CUMPLIMIENTO ---");
    expectedDownloadPath = path.join(tmpDir, pdfOPCName);
    downloadedSuccess = false;

    // Segundo puente: ptsc32d, pero el URL EXACTO que dispara el iframe/popup con el PDF!!!
    console.log("[NAV] Navegacion a modulo ptsc32d para redireccion organica (SAML State)...");
    await loginSat(page, null, "https://ptsc32d.clouda.sat.gob.mx/?/reporteOpinion32DContribuyente");

    console.log("Login de OPC finalizado. Al entrar al modulo ptsc32d, el SAT imprime el PDF automáticamente. Esperando 15s...");
    await page.waitForTimeout(15000);
    await page.screenshot({ path: 'debug_opc_1_waiting.png' });
    
    if (!downloadedSuccess) {
        console.log("[WAIT] Prolongando espera para Opinión de Cumplimiento 15s extra...");
        await page.waitForTimeout(15000);
        await page.screenshot({ path: 'debug_opc_2_waiting.png' });
    }
    if (!downloadedSuccess) {
        console.log("[WAIT] Última espera paciente para Opinión de Cumplimiento 20s...");
        await page.waitForTimeout(20000);
        await page.screenshot({ path: 'debug_opc_3_waiting.png' });
    }
    
    // Cerrar sesion o limpiar pagina para el sgte tramite
    await page.context().clearCookies();
    await delay(2000);


    // ==========================================
    // TAREA 2: CONSTANCIA SITUACION FISCAL (CSF)
    // ==========================================
    console.log("\n--- COMIENZA EXTRACCION: CONSTANCIA FISCAL ---");
    expectedDownloadPath = path.join(tmpDir, pdfCSFName);
    downloadedSuccess = false;

    // CSF Redirecciona a reimprime-tus-acuses-del-rfc
    const targetCSF = "https://wwwmat.sat.gob.mx/app/seg/cont/accesoC?parametro=1&url=/operacion/43824/reimprime-tus-acuses-del-rfc&target=principal&tipoLogeo=c&hostServer=https://wwwmat.sat.gob.mx";
    await loginSat(page, "mat-ptsc-totp_Aviso", targetCSF, 'https://www.sat.gob.mx/aplicacion/53027/genera-tu-constancia-de-situacion-fiscal');

    console.log("Login de CSF finalizado. Buscando boton mágico 'Generar Constancia' en frames...");
    
    const allFrames = page.frames();
    let btnGenerar = null;
    
    for (const f of allFrames) {
        const tempBtn = f.locator('button, span, a').filter({ hasText: /Generar Constancia/i }).first();
        if (await tempBtn.isVisible().catch(() => false)) {
            btnGenerar = tempBtn;
            break;
        }
    }

    if (btnGenerar) {
        console.log("¡Clic en el botón Generar Constancia!");
        await btnGenerar.click({force: true});
        await delay(15000);
        if (!downloadedSuccess) {
            console.log("[WAIT] Prolongando espera de intercepción CSF 15s...");
            await delay(15000);
        }
    } else {
        console.log("¡ERROR! Botón de Generar Constancia no encontrado.");
    }
    
    // Cerrar sesion o limpiar pagina
    await page.context().clearCookies();
    await delay(2000);
    } // if (!buzonOnly)

    // ==========================================
    // TAREA 3: BUZON TRIBUTARIO
    // ==========================================
    if (!skipBuzon) {
        console.log("\n--- COMIENZA EXTRACCION: BUZON TRIBUTARIO ---");
    
    // Usamos las rutas directas expuestas en los vídeos (iniciar-expediente)
    const urlNotificaciones = "https://wwwmat.sat.gob.mx/iniciar-expediente/mis-notificaciones/";
    const urlComunicados = "https://wwwmat.sat.gob.mx/iniciar-expediente/mis-comunicados/";
    
    await loginSat(page, "buzon", urlNotificaciones, urlNotificaciones);
    
    console.log("Login de Buzon finalizado. Esperando Notificaciones...");
    try {
        await page.goto(urlNotificaciones, { waitUntil: 'networkidle', timeout: 30000 });
        await delay(8000); // La tabla tarda en armarse asíncronamente
        
        const fechaDesc = todayStr.replace(/\//g, '');
        const pdfBznNotif = `Buzon_Notificaciones_${fechaDesc}_${emp.id}.pdf`;
        const pathNotif = path.join(tmpDir, pdfBznNotif);
        
        await page.pdf({ path: pathNotif, format: 'A4', printBackground: true, scale: 0.8 });
        console.log(`[BUZON] Guardado PDF de Notificaciones en ${pathNotif}`);
        
        console.log("Navegando a Comunicados...");
        await page.goto(urlComunicados, { waitUntil: 'networkidle', timeout: 30000 });
        await delay(8000); // La tabla tarda en armarse
        
        const pdfBznComun = `Buzon_Comunicados_${fechaDesc}_${emp.id}.pdf`;
        const pathComun = path.join(tmpDir, pdfBznComun);
        await page.pdf({ path: pathComun, format: 'A4', printBackground: true, scale: 0.8 });
        console.log(`[BUZON] Guardado PDF de Comunicados en ${pathComun}`);
        
    } catch(err) {
        console.log("Error navegando/extrayendo Buzon Tributario: " + err.message);
    }

    // Cerrar sesion o limpiar pagina para el sgte tramite
    await page.context().clearCookies();
    await delay(2000);
    } // if (!skipBuzon)

    // ==========================================
    // TAREA 4: SUBIDA A SUPABASE Y PRISMA
    // ==========================================
    try {
        const { createClient } = require('@supabase/supabase-js');
        const supabaseUrl = 'https://nwnakqsxvgltkbqknrlf.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bmFrcXN4dmdsdGticWtucmxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2ODAwODYsImV4cCI6MjA5MTI1NjA4Nn0.g_DDpEx0g7KibbEmKkP71yyV-5taK0zecL27ciO4HDM';
        const supabaseClient = createClient(supabaseUrl, supabaseKey);

        const filesBucket = fs.readdirSync(tmpDir).filter(f => f.endsWith('.pdf') && f !== 'Constancia_Situacion_Fiscal_Popup.pdf');
        for (const file of filesBucket) {
             const buffer = fs.readFileSync(path.join(tmpDir, file));
             
             // --- NUEVO: GUARDAR EN BASE DE DATOS LOCAL PRIMERO ---
             const base64 = buffer.toString('base64');
             let tipo = 'CONSTANCIA';
             let desc = 'Constancia de Situación Fiscal'; 
             
             if (file.includes('OC') || file.includes('Opinion') || file.includes('OPC')) {
                 tipo = 'OPINION';
                 desc = 'POSITIVA';
             } else if (file.toLowerCase().includes('buzon')) {
                 tipo = 'BUZON';
                 desc = file.includes('Notificaciones') ? 'Notificaciones (Buzón)' : 'Comunicados (Buzón)';
             }
             
             try {
                await prisma.documentoSat.create({
                  data: {
                    tipo: tipo,
                    descripcion: desc,
                    archivoBase64: 'data:application/pdf;base64,' + base64,
                    empresaId: emp.id
                  }
                });
                console.log(`[PRISMA] ${file} registrado en base de datos local OK con tipo ${tipo}.`);
                
                // --- NUEVO: SI ES OPINION, ACTUALIZAR ESTATUS EN TABLA EMPRESA ---
                if (tipo === 'OPINION') {
                  await prisma.empresa.update({
                      where: { id: emp.id },
                      data: { opinionCumplimiento: 'POSITIVA' }
                  });
                  console.log(`[PRISMA] Estatus de empresa actualizado a POSITIVA.`);
                }
             } catch(dbErr) {
                console.log(`[PRISMA_ERROR] No se pudo guardar ${file} en BD:`, dbErr.message);
             }

             // --- SUBIR A SUPABASE COMO RESPALDO EN NUBE ---
             console.log(`[SUPABASE] Subiendo ${file}...`);
             // path destination inside bucket
             const storagePath = `empresa_${emp.rfc || "UNKNOWN"}/${file}`;
             const { data, error } = await supabaseClient.storage.from('documentos_sat').upload(storagePath, buffer, { upsert: true, contentType: 'application/pdf' });
             if (error) {
                 console.log(`[SUPABASE_ERROR] Ocurrio un error subiendo ${file}: `, error.message);
             } else {
                 console.log(`[SUPABASE] ${file} subido exitosamente a ${data.path}!`);
                 await supabaseClient.from('Organization').update({ updated_at: new Date() }).eq('rfc', emp.rfc).catch(()=>{}); // trigger realtime
             }
        }
    } catch(e) {
        console.log(`[SUPABASE_ERROR] Error general conectando/subiendo archivos:`, e.message);
    }

    console.log("\n*** RUTINA COMPLETA TERMINADA ***");

  } catch (err) {
    console.error("Excepción global fallida:", err);
  } finally {
    console.log("Limpiando recursos...");
    // await browser.close();
    if(fs.existsSync(cerPath)) fs.unlinkSync(cerPath);
    if(fs.existsSync(keyPath)) fs.unlinkSync(keyPath);
    await prisma.$disconnect();
    // process.exit(0);
  }

})();
