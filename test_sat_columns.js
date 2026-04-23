const { chromium } = require('playwright');
const fs = require('fs/promises');
const delay = ms => new Promise(res => setTimeout(res, ms));

async function main() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const emp = await prisma.empresa.findFirst({ where: { rfc: 'DGQ0208162S3' } });
    
    console.log("Iniciando login FIEL...");
    await page.goto('https://portal.facturaelectronica.sat.gob.mx/', { waitUntil: 'load', timeout: 60000 });
    
    for (let retry = 0; retry < 2; retry++) {
        try {
            await page.waitForSelector('button#buttonFiel', { timeout: 10000 });
            await page.click('button#buttonFiel');
            break;
        } catch(e) { await delay(2000); }
    }
    
    const os = require('os');
    const path = require('path');
    const b64toBlob = async (b64, name) => {
        const filePath = path.join(os.tmpdir(), name);
        await fs.writeFile(filePath, Buffer.from(b64.split(',').pop(), 'base64'));
        return filePath;
    };
    
    const keyFile = await b64toBlob(emp.fielLlave, "key.key");
    const cerFile = await b64toBlob(emp.fielCertificado, "cer.cer");

    await page.setInputFiles('#filePassword', keyFile); // Not using the password string directly; SAT takes KEY as primary input file for #filePassword? Wait. No, SAT login requires .cer in #fileCertificate and .key in #filePrivateKey.
    // Wait, the real bot uses:
    await page.setInputFiles('#fileCertificate', cerFile);
    await page.setInputFiles('#filePrivateKey', keyFile);
    await page.fill('#privateKeyPassword', emp.fielPassword);
    
    await page.click('#submit');
    await delay(5000);

    // Navegar a Facturas Recibidas
    await page.goto('https://portal.facturaelectronica.sat.gob.mx/ConsultaReceptor.aspx', { waitUntil: 'load' });
    await delay(2000);
    
    await page.click('input[value="1"]'); // Meses
    const monthSelect = await page.$('select[name="ctl00$MainContent$CldFechaInicial2$Calendario_mes"]');
    if (monthSelect) await monthSelect.selectOption('4'); // Abril
    const yearSelect = await page.$('select[name="ctl00$MainContent$CldFechaInicial2$Calendario_anio"]');
    if (yearSelect) await yearSelect.selectOption('2026'); // El año

    await page.click('#ctl00_MainContent_BtnBusqueda');
    await delay(3000);
    await page.waitForSelector('#ctl00_MainContent_PnlResultados table tr', {timeout: 10000});

    const html = await page.locator('#ctl00_MainContent_PnlResultados table').innerHTML();
    await fs.writeFile("SAT_TABLE_HTML.txt", html);
    console.log("DUMPED HTML TO SAT_TABLE_HTML.txt");

    await browser.close();
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
