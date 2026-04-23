const fs = require('fs');

const maestroPath = 'playwright_sat_maestro.js';
let content = fs.readFileSync(maestroPath, 'utf8');

// 1. Replace Playwright imports
content = content.replace(
    "const { chromium } = require('playwright');",
    "const { chromium } = require('playwright-extra');\nconst stealth = require('puppeteer-extra-plugin-stealth')();\nchromium.use(stealth);"
);

// 2. Remove the global browser launch
const globalLaunchRegex = /const browser = await chromium\.launch\(\{[\s\S]*?\}\);/;
content = content.replace(globalLaunchRegex, "");

// 3. Insert browser launch inside the loop
const loopStartMarker = /for\s*\(\s*const emp of empresas\s*\)\s*\{/;
const newBrowserLaunch = `
    for (const emp of empresas) {
        let browser;
        try {
            browser = await chromium.launch({
                headless: true, // headless para background
                args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
            });
`;
content = content.replace(loopStartMarker, newBrowserLaunch);

// 4. Properly close the new try block and browser at the end of the loop
const loopEndMarker = /\s*await browser\.close\(\)\.catch\(\(\)=>\{\}\);\s*await prisma\.\$disconnect\(\);/;
const cleanupBlock = `
        } finally {
            if (browser) await browser.close().catch(()=>{});
        }
    } // End Empresa Loop

    await prisma.$disconnect();`;

// Replace the old end of loop
content = content.replace(/\s*\}\s*\/\/\s*End Empresa Loop\s*await browser\.close\(\)\.catch\(\(\)=>\{\}\);\s*await prisma\.\$disconnect\(\);/, cleanupBlock);

// 5. Uncomment Phase 2
content = content.replace(/\/\*\s*\/\/\s*DESHABILITADO TEMPORALMENTE[\s\S]*?\*\//, (match) => {
    return match.replace(/^\/\*\s*/, "").replace(/\s*\*\/$/, "");
});

fs.writeFileSync(maestroPath, content, 'utf8');
console.log("Refactorizacion completada.");
