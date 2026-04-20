const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  console.log("Iniciando extracción de BD...");
  const emp = await prisma.empresa.findFirst({ where: { NOT: { fielPassword: null } }});
  
  if (!emp || !emp.fielCerBase64 || !emp.fielKeyBase64 || !emp.fielPassword) {
    console.error("No se encontraron credenciales válidas en la BD con FIEL configurada.");
    process.exit(1);
  }

  // Generar archivos en disco temporalmente
  const tmpDir = path.join(__dirname, 'tmp_sat_fiel');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir);
  }

  const cerPath = path.join(tmpDir, 'fiel.cer');
  const keyPath = path.join(tmpDir, 'fiel.key');
  
  // Limpiar strings (quitar headers 'data:application/x-x509-ca-cert;base64,')
  const cerBase64 = emp.fielCerBase64.replace(/^data:(.*);base64,/, '');
  const keyBase64 = emp.fielKeyBase64.replace(/^data:(.*);base64,/, '');

  fs.writeFileSync(cerPath, Buffer.from(cerBase64, 'base64'));
  fs.writeFileSync(keyPath, Buffer.from(keyBase64, 'base64'));

  console.log("Archivos FIEL generados en", tmpDir);
  console.log("Levantando navegador...");

  const browser = await chromium.launch({ 
      headless: false, 
      slowMo: 100,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-infobars',
        '--start-maximized'
      ]
  }); 

  const context = await browser.newContext({
    viewport: null,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    acceptDownloads: true
  });
  const page = await context.newPage();

  // Flag para saber si logramos bajar la constancia
  let constanciaDescargada = false;
  
  // Interceptar TODAS las respuestas para atrapar el momento exacto en que el SAT manda el binario del PDF 
  // en la nueva pestaña o iframe, lo cual se le escapaba al manejador tradicional de descargas.
  page.on('response', async response => {
    if (response.headers()['content-type'] === 'application/pdf') {
      try {
          const buffer = await response.body();
          const downPath = path.join(tmpDir, 'Constancia_Situacion_Fiscal.pdf');
          fs.writeFileSync(downPath, buffer);
          console.log(`¡EXITO! Constancia interceptada en buffer y descargada en ${downPath}`);
          constanciaDescargada = true;
      } catch (err) {
          console.error("Error intentando atrapar binario de PDF:", err);
      }
    }
  });

  // Escuchar si se abren nuevas paginas (popup) y atrapar los PDFs ahi tambien por si acaso no pasan por la page actual
  context.on('page', newPage => {
    newPage.on('response', async response => {
      if (response.headers()['content-type'] === 'application/pdf') {
        try {
            const buffer = await response.body();
            const downPath = path.join(tmpDir, 'Constancia_Situacion_Fiscal_Popup.pdf');
            fs.writeFileSync(downPath, buffer);
            console.log(`¡EXITO! Constancia interceptada en POPUP y descargada en ${downPath}`);
            constanciaDescargada = true;
        } catch (err) {
            console.error("Error atrapar binario PDF de popup:", err);
        }
      }
    });
  });

  // Ocultar webdriver
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
  });

  try {
    console.log("Visitando portal público SAT...");
    await page.goto('https://www.sat.gob.mx/portal/public/home', { waitUntil: 'load', timeout: 60000 });
    await delay(3000);

    console.log("Navegando a la página de trámite...");
    await page.goto('https://www.sat.gob.mx/aplicacion/53027/genera-tu-constancia-de-situacion-fiscal', { waitUntil: 'load' });
    await delay(6000); // Esperar a que el SvelteKit frontend cargue

    console.log("Cerrando posibles banners...");
    const btnCerrarBanner = page.locator('.btn-close, [aria-label="Close"], #btnCerrar').first();
    if (await btnCerrarBanner.isVisible()) await btnCerrarBanner.click();

    console.log("Buscando el botón de EJECUTAR EN LÍNEA...");
    let activePage = page;
    
    // Desplazarse hacia abajo para asegurar que SvelteKit cargue e hidrate los botones al fondo
    await page.evaluate(() => window.scrollBy(0, 1000));
    await delay(2000);

    const ejecutarBtn = page.locator('a, button, span').filter({ hasText: /EJECUTAR EN L[ÍI]NEA/i }).last();
    
    if (await ejecutarBtn.isVisible()) {
        console.log("Botón detectado, dando clic...");
        let popupPromise = context.waitForEvent('page', { timeout: 15000 }).catch(() => null);
        
        await ejecutarBtn.click({ force: true }).catch(()=>{});
        
        const newPage = await popupPromise;
        if (newPage) {
            activePage = newPage;
            console.log("Abrió en nueva pestaña exitosamente.");
        } else {
            console.log("No abrió en nueva pestaña, iterando foco local...");
            activePage = page;
        }
    } else {
        console.log("No se pudo dar click normal. Intentaremos redirección interna con referrer simulado.");
        const directLoginUrl = "https://login.siat.sat.gob.mx/nidp/idff/sso?id=mat-ptsc-totp_Aviso&sid=0&option=credential&sid=0&target=https%3A%2F%2Fwwwmat.sat.gob.mx%2Fapp%2Fseg%2Fcont%2FaccesoC%3Fparametro%3D1%26url%3D%2Foperacion%2F43824%2Freimprime-tus-acuses-del-rfc%26target%3Dprincipal%26tipoLogeo%3Dc%26hostServer%3Dhttps%3A%2F%2Fwwwmat.sat.gob.mx";
        await activePage.goto(directLoginUrl, { referer: 'https://www.sat.gob.mx/aplicacion/53027/genera-tu-constancia-de-situacion-fiscal' });
    }

    await activePage.waitForLoadState('domcontentloaded');
    await delay(8000);
    
    await activePage.screenshot({ path: 'sat_2_login.png' });
    console.log("La URL actual (debería ser E.Firma/Login) es:", activePage.url());
    
    // Tab E.firma
    const btnFiel = activePage.locator('#buttonFiel, button#btnFiel, a#btnFiel, span:has-text("e.firma")').first();
    if (await btnFiel.isVisible()) {
        await btnFiel.click();
    } else {
        console.log("No detecté #buttonFiel pero lo intentaré forzando clics...");
        await activePage.locator('text="e.firma"').first().click({force: true}).catch(()=>{});
    }
    await delay(3000);
    await activePage.screenshot({ path: 'sat_3_efirma_tab.png' });

    // Inputs
    console.log("Llenando credenciales de FIEL...");
    const fileCerInputs = await activePage.locator('input[type="file"]').all();
    console.log(`Se encontraron ${fileCerInputs.length} inputs de archivo.`);
    
    if (fileCerInputs.length >= 2) {
        await fileCerInputs[0].setInputFiles(cerPath);
        await fileCerInputs[1].setInputFiles(keyPath);
    } else {
        // Fallback ids
        await activePage.setInputFiles('#fileCertificate', cerPath).catch(()=>{});
        await activePage.setInputFiles('#filePrivateKey', keyPath).catch(()=>{});
        await activePage.setInputFiles('input[title="Certificado"]', cerPath).catch(()=>{});
        await activePage.setInputFiles('input[title="Clave Privada"]', keyPath).catch(()=>{});
    }

    // Password FIEL (usar solo el id super seguro que nos dio el extractor)
    const pwdInput = activePage.locator('#privateKeyPassword');
    if (await pwdInput.isVisible()) {
        await pwdInput.fill(emp.fielPassword);
    } else {
         console.log("El input #privateKeyPassword no apareció, intentaremos input de password en fallback.");
         await activePage.locator('input[type="password"]').last().fill(emp.fielPassword).catch(()=>{});
    }
    
    // Boton de Enviar
    const submitBtn = activePage.locator('#submit, input[type="submit"], button#submit').first();
    await submitBtn.click();
    
    console.log("Esperando validación de la sesión...");
    await delay(12000);
    await activePage.screenshot({ path: 'sat_4_loggedIn.png' });

    console.log("Llegando a panel de constancia...");
    
    // Buscar el botón 'Generar Constancia' en TODOS los frames
    const allFrames = page.frames();
    let btnGenerar = null;
    let targetFrame = null;
    
    for (const f of allFrames) {
        const tempBtn = f.locator('button, span, a').filter({ hasText: /Generar Constancia/i }).first();
        if (await tempBtn.isVisible().catch(() => false)) {
            btnGenerar = tempBtn;
            targetFrame = f;
            break;
        }
    }

    if (btnGenerar) {
        console.log("¡Clic en Míiiiitico Botón 'Generar Constancia'!");
        
        await btnGenerar.click({force: true});
        
        console.log("Esperando la pantalla 'Procesando...' del SAT (Aprox 10 segundos)...");
        await delay(10000);
        
        if (!constanciaDescargada) {
            console.log("La respuesta on('response') no cachó el PDF todavía, esperamos 15seg más...");
            await delay(15000);
        }
    } else {
        console.log("No se vio el botón Generar Constancia, listando URLs de frames para debug:");
        allFrames.forEach(f => console.log(f.url()));
    }

    await page.screenshot({ path: 'sat_5_final.png' });

  } catch (err) {
    console.error("Excepción fallida:", err);
    await page.screenshot({ path: 'sat_err.png' }).catch(() => {});
  } finally {
    console.log("Cerrando navegador y limpiando credenciales...");
    // await browser.close();
    fs.unlinkSync(cerPath);
    fs.unlinkSync(keyPath);
    await prisma.$disconnect();
    // process.exit(0);
  }

})();
