const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    console.log("==> Levantando Puppeteer Stealth...");
    const browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-certificate-errors',
        '--start-maximized'
      ],
      defaultViewport: null,
    });
  
    const page = (await browser.pages())[0];
    
    try {
      console.log("==> Visitando https://www.sat.gob.mx/portal/public/home");
      await page.goto('https://www.sat.gob.mx/portal/public/home', { waitUntil: 'networkidle2', timeout: 60000 });
      await delay(5000); 
      await page.screenshot({ path: 'pup_sat_home.png', fullPage: true });

      console.log("==> Buscando icono de Constancia...");
      // User says: "en los iconos de lado derecho el segundo es para entrar a la constancia"
      await page.evaluate(() => {
          // Typically these are images or buttons. Let's dump links.
          const items = Array.from(document.querySelectorAll('a'));
          const constanciaLinks = items.filter(a => a.innerText && a.innerText.toLowerCase().includes('constancia'));
          if(constanciaLinks.length > 0) constanciaLinks[0].click();
      });

      await delay(5000);
      await page.screenshot({ path: 'pup_sat_clicked_constancia.png', fullPage: true });
      
      console.log("Done checking first click.");
    } catch (e) {
      console.error(e);
    } finally {
      await browser.close();
    }
})();
