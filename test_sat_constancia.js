const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

(async () => {
    const emp = await prisma.empresa.findFirst({ where: { razonSocial: { contains: 'RAMAR' } } });
    if (!emp) return console.log("No empresa found");
    
    console.log(`Testing with ${emp.razonSocial}`);
    const cerPath = path.join(__dirname, 'test2.cer');
    const keyPath = path.join(__dirname, 'test2.key');
    
    fs.writeFileSync(cerPath, Buffer.from(emp.fielCerBase64.replace(/^data:(.*);base64,/, ''), 'base64'));
    fs.writeFileSync(keyPath, Buffer.from(emp.fielKeyBase64.replace(/^data:(.*);base64,/, ''), 'base64'));

    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({ acceptDownloads: true });
    
    let downloadedSuccess = false;
    let expectedPath = path.join(__dirname, 'test_ramar_constancia.pdf');

    context.on('page', newPage => { 
        newPage.on('response', async (res) => {
            if ((res.headers()['content-type']||'').includes('pdf')) {
                try { fs.writeFileSync(expectedPath, await res.body()); downloadedSuccess = true; console.log("Caught via response!"); } catch(e){}
            }
        }); 
        newPage.on('download', async (dl) => {
            try { fs.copyFileSync(await dl.path(), expectedPath); downloadedSuccess = true; console.log("Caught via download!"); } catch(e){}
        });
    });

    const page = await context.newPage();
    const url = "https://login.siat.sat.gob.mx/nidp/idff/sso?id=mat-ptsc-totp_Aviso&sid=0&option=credential&sid=0&target=https%3A%2F%2Fwwwmat.sat.gob.mx%2Fapp%2Fseg%2Fcont%2FaccesoC%3Fparametro%3D1%26url%3D%2Foperacion%2F43824%2Freimprime-tus-acuses-del-rfc%26target%3Dprincipal%26tipoLogeo%3Dc%26hostServer%3Dhttps%3A%2F%2Fwwwmat.sat.gob.mx";
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    console.log("Filling FIEL...");
    await new Promise(r => setTimeout(r, 5000));
    await page.locator('text="e.firma"').first().click({force: true}).catch(()=>{});
    await new Promise(r => setTimeout(r, 3000));

    await page.setInputFiles('#fileCertificate', cerPath).catch(()=>{});
    await page.setInputFiles('#filePrivateKey', keyPath).catch(()=>{});
    await page.locator('#privateKeyPassword').fill(emp.fielPassword);
    
    console.log("Submitting...");
    await page.locator('#submit').first().click({force: true});
    
    console.log("Waiting 10s for page load...");
    await new Promise(r => setTimeout(r, 10000));
    
    console.log("Detecting button...");
    const frames = page.frames();
    let btn = null;
    for (const f of frames) {
        let b = f.locator('button, span, a', { hasText: /Generar Constancia/i }).first();
        if (await b.count() > 0) { btn = b; console.log("Button found!"); break; }
    }

    if (btn) {
        console.log("Clicking button...");
        await btn.click({force: true});
        await new Promise(r => setTimeout(r, 15000));
    } else {
        console.log("Button not found! HTML:");
        console.log(await page.content());
    }

    console.log("Downloaded:", downloadedSuccess);
    await browser.close();
    process.exit(0);
})();
