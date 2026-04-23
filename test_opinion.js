const { chromium } = require('playwright');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function run() {
    const emp = await prisma.empresa.findFirst({ where: { rfc: 'AIR1708292X8' } });
    if (!emp) return console.log("NO EMPRESA");
    
    const cerPath = path.join(__dirname, 'uploads', (emp.fielCer || `${emp.rfc}.cer`));
    const keyPath = path.join(__dirname, 'uploads', (emp.fielKey || `${emp.rfc}.key`));

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ acceptDownloads: true });
    
    let downloadedSuccess = false;
    let expectedDownloadPath = null;
    
    context.on('page', newPage => {
        setupInterceptor(newPage);
    });

    function setupInterceptor(p) {
        p.on('response', async res => {
            try {
                const ct = (res.headers()['content-type'] || '').toLowerCase();
                if ((ct.includes('pdf') || ct.includes('octet-stream')) && expectedDownloadPath) {
                    console.log("INTERCEPTED PDF IN NATIVE SCRIPT!!!");
                    downloadedSuccess = true;
                }
            } catch(e) {}
        });
    }

    const page = await context.newPage();
    setupInterceptor(page);
    
    console.log("Navigating to SIAT Login directly...");
    await page.goto('https://login.siat.sat.gob.mx/nidp/idff/sso?id=fiel', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(()=>{});
    await delay(3000);
    console.log("Logging in...");
    
    await page.waitForSelector('#btnFiel', { timeout: 15000 }).catch(()=>{});
    const btnFiel = page.locator('#btnFiel');
    const inputRFC = page.locator('#rfc');
    try {
        const fileCerInputs = await page.locator('input[type="file"]').all();
        if (fileCerInputs.length >= 2) {
            await fileCerInputs[0].setInputFiles(cerPath, { timeout: 5000 }).catch(()=>{});
            await fileCerInputs[1].setInputFiles(keyPath, { timeout: 5000 }).catch(()=>{});
        }
        await page.fill('#password', emp.fielPassword).catch(()=>{});
        await btnFiel.click({ force: true, timeout: 5000 }).catch(()=>{});
        console.log("Login FIEL submitted.");
        await delay(12000);
        
        console.log("Going to Opinion portal page...");
        await page.goto('https://wwwmat.sat.gob.mx/aplicacion/operacion/32846/consulta-tu-opinion-de-cumplimiento-de-obligaciones-fiscales', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(()=>{});
        console.log("Clicking Ejecutar en línea / Iniciar target...");
        
        // Find links that contain "ptsc32" and click them, or find a button
        const links = await page.locator('a[href*="ptsc32"]').all();
        if (links.length > 0) {
            await links[0].click().catch(()=>{});
            console.log("Clicked ptsc32 link.");
        } else {
            console.log("No ptsc32 link found. Trying 'Ejecutar en línea' button...");
            await page.locator('text="EJECUTAR EN LÍNEA", text="INICIAR", text="Ejecutar en línea", text="Iniciar"').first().click({ force: true, timeout: 5000 }).catch(()=>{});
        }
        
    } catch(e) { console.log("Login FIEL failed:", e.message); }
    
    await delay(15000);
    await page.screenshot({ path: 'debug_test_opinion.png', fullPage: true });
    console.log("Screenshot saved.");
    
    if (!downloadedSuccess) {
        console.log("Waited 15s. No download. Taking another 15s and shooting.");
        await delay(15000);
        await page.screenshot({ path: 'debug_test_opinion_2.png', fullPage: true });
    }

    
    await browser.close();
    process.exit(0);
}

run();
