const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--start-maximized']
    });
    const pg = await browser.newPage();
    console.log("Goto...");
    await pg.goto('https://www.sat.gob.mx/aplicacion/operacion/53027/genera-tu-constancia-de-situacion-fiscal', { waitUntil: 'networkidle2' });
    
    console.log("Wait Svelte hydration...");
    await new Promise(r => setTimeout(r, 6000));
    
    try {
        console.log("Click Accordion");
        await pg.evaluate(() => {
            const n = document.evaluate("//a[contains(text(), 'Obtén la Constancia')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; 
            if(n) n.click();
        });
    } catch(e) { console.error("Err 1", e); }
    
    await new Promise(r => setTimeout(r, 2000));
    
    try {
        console.log("Click Servicio");
        await pg.evaluate(() => {
            const n = document.evaluate("//a[contains(@href, 'operacion/53027') or contains(text(), 'servicio')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; 
            if(n) n.click();
        });
    } catch(e) { console.error("Err 2", e); }
    
    console.log("Wait for possible new tabs or redirects...");
    await new Promise(r => setTimeout(r, 10000));
    
    const pages = await browser.pages();
    console.log('Total pages open:', pages.length);
    for(let i=0; i<pages.length; i++) {
        console.log(`Page ${i}:`, pages[i].url());
    }
    
    await pg.screenshot({ path: 'sat_test_scratch.png' });
    await browser.close();
})();
