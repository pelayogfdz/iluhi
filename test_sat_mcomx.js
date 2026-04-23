const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const os = require('os');
const prisma = new PrismaClient();

(async () => {
    // Get MCO MX or any empresa other than RAMAR
    const emp = await prisma.empresa.findFirst({ where: { rfc: { not: 'DIR180802CQ5' }, fielPassword: { not: null } } });
    if (!emp) return console.log("No empresa found");
    
    console.log(`Testing with ${emp.razonSocial}`);
    const tmpDir = path.join(__dirname, 'tmp_sat_fiel');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    const cerPath = path.join(tmpDir, `test.cer`);
    const keyPath = path.join(tmpDir, `test.key`);
    
    fs.writeFileSync(cerPath, Buffer.from(emp.fielCerBase64.replace(/^data:(.*);base64,/, ''), 'base64'));
    fs.writeFileSync(keyPath, Buffer.from(emp.fielKeyBase64.replace(/^data:(.*);base64,/, ''), 'base64'));

    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log("Going to Opinion url");
    await page.goto("https://ptsc32d.clouda.sat.gob.mx/", { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForURL(/login\.siat\.sat\.gob\.mx/, { timeout: 30000 }).catch(()=>{});
    
    console.log("On login page, waiting 5s");
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: 'test_mco_login_1.png' });

    console.log("Filling FIEL...");
    const btnFiel = page.locator('#buttonFiel, button#btnFiel, a#btnFiel, span:has-text("e.firma")').first();
    if (await btnFiel.isVisible()) await btnFiel.click({ timeout: 5000 }).catch(()=>{});
    else await page.locator('text="e.firma"').first().click({force: true, timeout: 5000}).catch(()=>{});

    await new Promise(r => setTimeout(r, 3000));
    const fileCerInputs = await page.locator('input[type="file"]').all();
    if (fileCerInputs.length >= 2) {
        await fileCerInputs[0].setInputFiles(cerPath, { timeout: 5000 }).catch(()=>{});
        await fileCerInputs[1].setInputFiles(keyPath, { timeout: 5000 }).catch(()=>{});
    } else {
        await page.setInputFiles('#fileCertificate', cerPath, { timeout: 5000 }).catch(()=>{});
        await page.setInputFiles('#filePrivateKey', keyPath, { timeout: 5000 }).catch(()=>{});
    }

    const pwdInput = page.locator('#privateKeyPassword');
    if (await pwdInput.isVisible()) await pwdInput.fill(emp.fielPassword, { timeout: 5000 });
    else await page.locator('input[type="password"]').last().fill(emp.fielPassword, { timeout: 5000 }).catch(()=>{});

    await page.screenshot({ path: 'test_mco_login_2.png' });

    console.log("Submitting...");
    await page.locator('#submit, input[type="submit"], button#submit').first().click({force: true}).catch(()=>{});
    
    console.log("Waiting 15 seconds for result...");
    await new Promise(r => setTimeout(r, 15000));
    await page.screenshot({ path: 'test_mco_login_3.png' });
    
    console.log("Done");
    await browser.close();
    process.exit(0);
})();
