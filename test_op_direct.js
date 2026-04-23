const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
    const emp = await prisma.empresa.findFirst({ where: { rfc: 'AIR1708292X8' } });
    const cerPath = path.join(require('os').tmpdir(), 'test_op_cer.cer');
    const keyPath = path.join(require('os').tmpdir(), 'test_op_key.key');
    fs.writeFileSync(cerPath, Buffer.from(emp.fielCerBase64.replace(/^data:(.*);base64,/, ''), 'base64'));
    fs.writeFileSync(keyPath, Buffer.from(emp.fielKeyBase64.replace(/^data:(.*);base64,/, ''), 'base64'));

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ acceptDownloads: true });
    
    let downloadedSuccess = false;
    let expectedDownloadPath = path.join(__dirname, 'test_new_opinion.pdf');
    context.on('page', p => {
        p.on('response', async res => {
            const ct = (res.headers()['content-type'] || '').toLowerCase();
            if (ct.includes('pdf') || ct.includes('octet-stream')) {
                const buffer = await res.body().catch(()=>{});
                if (buffer && buffer.length > 1000) {
                    fs.writeFileSync(expectedDownloadPath, buffer);
                    downloadedSuccess = true;
                    console.log("PDF INTERCEPTED!!!");
                }
            }
        });
    });

    const page = await context.newPage();
    console.log("LOGIN VIA CONDUCER...");
    await page.goto("https://wwwmat.sat.gob.mx/app/seg/cont/accesoC?parametro=1&url=/operacion/32846/consulta-tu-opinion-de-cumplimiento-de-obligaciones-fiscales&target=principal&tipoLogeo=c&hostServer=https://wwwmat.sat.gob.mx", { waitUntil: 'domcontentloaded' });
    await delay(3000);
    const btnFiel = page.locator('#buttonFiel, button#btnFiel, a#btnFiel, span:has-text("e.firma")').first();
    await btnFiel.click({ force: true });
    await delay(2000);
    await page.locator('input[type="file"][id="fileCertificate"], input[type="file"][id="cer"]').setInputFiles(cerPath);
    await page.locator('input[type="file"][id="filePrivateKey"], input[type="file"][id="key"]').setInputFiles(keyPath);
    const pwdInput = page.locator('input[id="privateKeyPassword"], input[id="pwd"]');
    if (await pwdInput.count() > 0) await pwdInput.fill(emp.fielPassword);
    else await page.locator('input[type="password"]').last().fill(emp.fielPassword);
    await page.locator('#submit, input[type="submit"], button#submit').first().click({ force: true, noWaitAfter: true });
    console.log("WAIT 12s...");
    await delay(12000);
    await page.screenshot({ path: 'test_after_login_opinion.png', fullPage: true });

    console.log("CLICKING PORTAL LINK...");
    const links = await page.locator('a[href*="ptsc32"]').all();
    if(links.length > 0) { await links[0].click({force: true}); } 
    else { await page.locator('button, a').filter({ hasText: /LÍNEA|INICIAR/i }).first().click({force: true}).catch(()=>{}); }

    console.log("WAITING FOR DOWNLOAD...");
    for(let i=0; i<15; i++) {
        if(downloadedSuccess) break;
        await delay(1000);
    }
    
    if(!downloadedSuccess) {
       console.log("FAILED. Snapshotting...");
       await page.screenshot({ path: 'debug_loginsat_190.png', fullPage: true }); // save over the known file
    }

    await browser.close();
    process.exit(0);
}
run();
