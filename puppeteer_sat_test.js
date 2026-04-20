const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());
const prisma = new PrismaClient();

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    console.log("Iniciando extracción de BD...");
    const emp = await prisma.empresa.findFirst({ where: { razonSocial: { contains: 'AF GROUP', mode: 'insensitive' } }});
    
    if (!emp || !emp.fielCerBase64 || !emp.fielKeyBase64 || !emp.fielPassword) {
      console.error("No se encontraron credenciales válidas para AF GROUP.");
      process.exit(1);
    }
  
    // Configurar temporales
    const tmpDir = path.join(__dirname, 'tmp_sat_fiel');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
  
    const cerPath = path.join(tmpDir, 'fiel.cer');
    const keyPath = path.join(tmpDir, 'fiel.key');
    
    const cerBase64 = emp.fielCerBase64.replace(/^data:(.*);base64,/, '');
    const keyBase64 = emp.fielKeyBase64.replace(/^data:(.*);base64,/, '');
  
    fs.writeFileSync(cerPath, Buffer.from(cerBase64, 'base64'));
    fs.writeFileSync(keyPath, Buffer.from(keyBase64, 'base64'));
  
    console.log("\n==> Levantando Puppeteer Stealth...");
    const browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-cartificate-errors',
        '--start-maximized'
      ],
      defaultViewport: null,
    });
  
    const page = (await browser.pages())[0];
    
    try {
      console.log("==> Visitando el trámite SIAT FIEL de forma directa...");
      // Este endpoint es el login crudo e.firma del SAT (sin bloqueos frontend Svelte)
      await page.goto('https://login.siat.sat.gob.mx/nidp/idff/sso?id=fiel_Aviso', { waitUntil: 'load', timeout: 60000 });
      await delay(4000); // Esperar a que el DOM y el anti-bot hidraten
      await page.screenshot({ path: 'pup_1_login.png', fullPage: true });
  
      console.log("==> Inyectando Archivos e.Firma...");
      try {
        const cerInput = await page.$('#fileCertificate');
        if (cerInput) await cerInput.uploadFile(cerPath);
        
        const keyInput = await page.$('#filePrivateKey');
        if (keyInput) await keyInput.uploadFile(keyPath);
      } catch(e) {
          console.log("Fallo localizando inputs", e.message);
      }
      
      // Password
      try {
          await page.waitForSelector('#privateKeyPassword', { timeout: 5000 });
          await page.type('#privateKeyPassword', emp.fielPassword, { delay: 50 });
      } catch(e) {
          console.log("No se encontró el password:", e.message);
      }
  
      console.log("==> Dando clic en ENVIAR...");
      await page.screenshot({ path: 'pup_2_filled.png' });
  
      await page.evaluate(() => {
          const submitBtn = document.querySelector('input#submit') || document.querySelector('#submit');
          if (submitBtn) submitBtn.click();
      });
  
      console.log("==> Esperando sesión SAT validada...");
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(()=>{});
      await delay(5000); // Darle tiempo adicional a PEFA
  
      await page.screenshot({ path: 'pup_3_logged.png', fullPage: true });

      const currentUrl = page.url();
      console.log("==> URL Resultante:", currentUrl);

      // PEFA Redirección / Constancia
      if (currentUrl.includes('ConstanciaSituacionFiscal') || currentUrl.includes('pefa')) {
          console.log("Llegamos a la pantalla PEFA! Detectando botón de Generación...");
          try {
              await page.evaluate(() => {
                 const generarBtns = Array.from(document.querySelectorAll('button, a, span, input')).filter(x => (x.textContent && x.textContent.includes('Generar Constancia')) || (x.value && x.value.includes('Generar Constancia')));
                 if (generarBtns.length > 0) generarBtns[0].click();
              });
              console.log("Generando PDF...");
              await delay(20000); // 20s para descargar pdf
              await page.screenshot({ path: 'pup_4_pdf_generado.png' });
          } catch(e) {
              console.log("Fallo dando clic en el boton final de Constancia:", e);
          }
      } else {
          console.log("No alcanzamos la pantalla PEFA o nos pidieron login extra.");
      }
  
    } catch (err) {
      console.error("Fallo crítico en Puppeteer:", err);
      try { await page.screenshot({ path: 'pup_err.png' }) } catch(e){}
    } finally {
      console.log("Limpieza de credenciales...");
      try { fs.unlinkSync(cerPath); } catch(e){}
      try { fs.unlinkSync(keyPath); } catch(e){}
      await prisma.$disconnect();
    }
  
  })();
