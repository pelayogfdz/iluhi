const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const maestroPath = path.join(__dirname, 'playwright_sat_maestro.js');
const logPath = path.join(__dirname, 'sat_cron_out.log');

// Helper to run maestro with flags
function runMaestro(jobName, flags) {
    const timestamp = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
    const startMsg = `[${timestamp}] Iniciando Tarea Cron: ${jobName}\n`;
    console.log(startMsg.trim());
    
    const out = fs.openSync(logPath, 'a');
    fs.appendFileSync(logPath, startMsg);
    
    const child = spawn('node', [maestroPath, ...flags], {
        detached: true,
        stdio: ['ignore', out, out]
    });
    
    child.unref();
    console.log(`[${timestamp}] Tarea ${jobName} lanzada en segundo plano (PID: ${child.pid})`);
}

// 1. CSF: Días 2 y 18 de cada mes a la 1 AM
cron.schedule('0 1 2,18 * *', () => {
    runMaestro('Descarga Constancia Situacion Fiscal (CSF)', ['--csf-only']);
});

// 2. Opinión de Cumplimiento: Días 3 y 19 de cada mes a las 3 AM
cron.schedule('0 3 3,19 * *', () => {
    runMaestro('Descarga Opinion Cumplimiento', ['--opinion-only']);
});

// 3. Buzón Tributario: Todos los días a las 5 AM
cron.schedule('0 5 * * *', () => {
    runMaestro('Chequeo Buzon Tributario', ['--buzon-only']);
});

console.log('✅ Cron scheduler para automatización SAT iniciado exitosamente.');
console.log('Horarios programados:');
console.log('- CSF: Días 2 y 18 a la 1:00 AM');
console.log('- Opinión: Días 3 y 19 a las 3:00 AM');
console.log('- Buzón: Todos los días a las 5:00 AM');
