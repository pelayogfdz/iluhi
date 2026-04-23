const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();
const delay = ms => new Promise(res => setTimeout(res, ms));

async function sendQaFailureEmail(empresaAdmin, reason) {
    if (!empresaAdmin.smtpHost || !empresaAdmin.smtpUser) {
        console.error("[QA FATAL] No SMTP config found to send failure alert.");
        return;
    }

    try {
        const transporter = nodemailer.createTransport({
            host: empresaAdmin.smtpHost,
            port: empresaAdmin.smtpPort || 465,
            secure: (empresaAdmin.smtpPort === 465),
            auth: {
                user: empresaAdmin.smtpUser,
                pass: empresaAdmin.smtpPass
            }
        });

        const primerUsuario = await prisma.usuario.findFirst();
        const correoDestino = primerUsuario ? primerUsuario.email : empresaAdmin.smtpUser;

        const bodyHtml = `
            <h2 style="color:red;">🚨 SAT DOM QA Preventative Alert 🚨</h2>
            <p><strong>El bot QA de monitoreo preventivo acaba de detectar una alteración estructural en el portal del SAT.</strong></p>
            <p>Razón técnica: <code>${reason}</code></p>
            <p>Se ha cancelado la ejecución masiva hasta que un ingeniero revise los selectores de Playwright.</p>
        `;

        await transporter.sendMail({
            from: `"SAT QA Bot" <${empresaAdmin.smtpUser}>`,
            to: correoDestino,
            subject: "🚨 ALERTA CRITICA: Cambio de estructura DOM detectada en Portal SAT",
            html: bodyHtml
        });
        console.log(`[QA BOT] Email de alerta enviado a ${correoDestino}`);
    } catch (e) {
        console.error("[QA BOT] Error eviando email de alerta:", e.message);
    }
}

async function runDomInspection() {
    console.log("=== INICIANDO QA DOM MONITOR (PREVENTIVO) ===");
    
    // Buscar la primer empresa que tenga FIEL cargada.
    const empresa = await prisma.empresa.findFirst({
        where: { fielCerBase64: { not: null }, fielKeyBase64: { not: null }, fielPassword: { not: null } }
    });

    if (!empresa) {
        console.log("[QA BOT] Abort. No se encontró ninguna empresa con configuración de FIEL.");
        process.exit(1);
    }

    // Decodificar certificados en temp
    const tmpDir = os.tmpdir();
    const cerPath = path.join(tmpDir, `qa_${empresa.id}.cer`);
    const keyPath = path.join(tmpDir, `qa_${empresa.id}.key`);
    
    fs.writeFileSync(cerPath, Buffer.from(empresa.fielCerBase64, 'base64'));
    fs.writeFileSync(keyPath, Buffer.from(empresa.fielKeyBase64, 'base64'));

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();

    let domAltered = false;
    let reason = "";

    try {
        console.log("[QA BOT] Login SAT CFDI...");
        await page.goto("https://portalcfdi.facturaelectronica.sat.gob.mx/", { waitUntil: 'load', timeout: 60000 });
        await delay(5000);

        // Click FIEL login
        const btnFiel = page.locator('#buttonFiel, button#btnFiel, span:has-text("e.firma")').first();
        if (await btnFiel.isVisible()) {
            await btnFiel.click({ timeout: 5000 }).catch(()=>{});
            await delay(3000);
        }

        // Upload files
        const fileCerInputs = await page.locator('input[type="file"]').all();
        if (fileCerInputs.length >= 2) {
            await fileCerInputs[0].setInputFiles(cerPath).catch(()=>{});
            await fileCerInputs[1].setInputFiles(keyPath).catch(()=>{});
        } else {
            await page.setInputFiles('#fileCertificate', cerPath).catch(()=>{});
            await page.setInputFiles('#filePrivateKey', keyPath).catch(()=>{});
        }

        const pwdInput = page.locator('#privateKeyPassword');
        if (await pwdInput.isVisible()) {
            await pwdInput.fill(empresa.fielPassword);
        } else {
            await page.locator('input[type="password"]').last().fill(empresa.fielPassword);
        }

        await page.locator('#submit, input[type="submit"]').first().click();
        
        console.log("[QA BOT] Esperando dashboard interior...");
        await page.waitForSelector('#ctl00_MainContent_BtnBusqueda', { timeout: 60000 }).catch(e => {
             domAltered = true; reason = "No se logró llegar al dashboard principal. Posible CAPTCHA forzoso o error interno del SAT (timeout BtnBusqueda).";
        });

        if (!domAltered) {
            // Check DOM structure de facturas emitidas
            await page.goto("https://portalcfdi.facturaelectronica.sat.gob.mx/ConsultaEmisor.aspx", { waitUntil: 'load' });
            
            // Elegir busqueda por fecha mes actual
            await page.locator('#ctl00_MainContent_RdoFechas').click().catch(()=>{});
            await delay(1000);
            
            console.log("[QA BOT] Ejecutando submit query vacío de mes...");
            await page.locator('#ctl00_MainContent_BtnBusqueda').click();
            await delay(5000);

            // Validar Tabla DOM
            const tableExists = await page.locator('#ctl00_MainContent_PnlResultados table').isVisible();
            if (!tableExists) {
                // If it's just no results, the structure #ctl00_MainContent_PnlResultados should still exist technically
                const panel = await page.locator('#ctl00_MainContent_PnlResultados').isVisible();
                if (!panel) {
                    domAltered = true; reason = "PnlResultados ha desaparecido. Estructura de resultados bloqueada.";
                }
            } else {
                const headerCount = await page.locator('#ctl00_MainContent_PnlResultados table th').count();
                if (headerCount < 8) {
                    domAltered = true; reason = `Cambió drásticamente el número de columnas de la tabla (Esperadas 10+, Detección UI: ${headerCount})`;
                }
            }
        }
        
    } catch (e) {
        console.error(e);
        domAltered = true;
        reason = "Excepción no controlada en el test flow E2E del SAT: " + e.message;
    } finally {
        await browser.close();
        if (fs.existsSync(cerPath)) fs.unlinkSync(cerPath);
        if (fs.existsSync(keyPath)) fs.unlinkSync(keyPath);
    }

    if (domAltered) {
        console.log("❌ [QA BOT FATAL] " + reason);
        await sendQaFailureEmail(empresa, reason);
    } else {
        console.log("✅ [QA BOT OK] Estructura DOM de SAT se mantiene contigua y predictible.");
    }
}

// Ejecución
runDomInspection().then(() => process.exit(0));
