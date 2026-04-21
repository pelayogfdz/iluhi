const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');

console.log("=========================================");
console.log("⏰ SAT BOT SCHEDULER INICIADO");
console.log("El sistema está esperando para descargar automáticamente:");
console.log(" 1) [ÚNICA VEZ] - 21 de Abril a las 2:00 AM");
console.log(" 2) [RECURRENTE] - Día 2 y 19 de CADA mes a las 2:00 AM");
console.log(" 3) [BUZÓN DIARIO] - Todos los días a la 1:00 AM");
console.log(" 4) [CFDI: INICIO DE MES] - Días 1-3 cada 2 horas");
console.log(" 5) [CFDI: MEDIADOS DE MES] - Del día 4 en adelante a las 6am, 1pm y 8pm");
console.log(" 6) [CFDI: CIERRE DE MES] - Últimos 2 días cada 1 hora");
console.log(" 7) [HISTORICO MASIVO CFDI] - Única vez: 21 de Abril a las 4:00 AM");
console.log("=========================================\n");

function runBot(arg = null) {
    console.log(`[${new Date().toLocaleString()}] Lanzando secuencia de descarga SAT${arg ? ` con argumento ${arg}` : ''}...`);
    
    const args = ['playwright_sat_bot.js'];
    if (arg) args.push(arg);

    // Spawn en lugar de exec para poder ver el stream del proceso en tiempo real
    const botProcess = spawn('node', args, {
        cwd: path.join(__dirname),
        stdio: 'inherit' // pasa el console.log del hijo al padre directamente
    });

    botProcess.on('close', (code) => {
        console.log(`[${new Date().toLocaleString()}] El proceso bot SAT terminó con código ${code}.\nEsperando próxima fecha de calendario...`);
    });
}

function runCfdiBot(arg = null) {
    console.log(`[${new Date().toLocaleString()}] Lanzando secuencia de extracción CFDI SAT${arg ? ` con argumento ${arg}` : ''}...`);
    
    const args = ['playwright_sat_bot_cfdi.js'];
    if (arg) args.push(arg);

    const botProcess = spawn('node', args, {
        cwd: path.join(__dirname),
        stdio: 'inherit'
    });

    botProcess.on('close', (code) => {
        console.log(`[${new Date().toLocaleString()}] El proceso bot CFDI terminó con código ${code}.\nEsperando próxima fecha de calendario...`);
    });
}

// 1. Cron recurrente: Todos los dias 2 y 19 a las 2:00 AM
// El Buzón se checa a la 1 am, podemos saltarlo a las 2 am para no duplicar en el mismo día, 
// o dejar que se ejecute si entra la condición. Le pasamos '--skip-buzon'
cron.schedule('0 2 2,19 * *', () => {
    console.log(">> CRON RECURRENTE ACTIVADO (Día 2 o 19) <<");
    runBot('--skip-buzon');
});

// 2. Cron único temporal: 21 de Abril a las 2:00 AM
cron.schedule('0 2 21 4 *', () => {
    console.log(">> CRON ESPECIAL ACTIVADO (21 de Abril) <<");
    runBot('--skip-buzon');
});

// 2.1 Cron único histórico CFDI: 21 de Abril a las 4:00 AM (Masivo 2024-2026)
cron.schedule('0 4 21 4 *', () => {
    console.log(">> CRON HISTORICO MASIVO CFDI ACTIVADO (21 de Abril) <<");
    runCfdiBot('--historico');
});

// 3. Cron diario: Buzón Tributario a la 1:00 AM todos los días
cron.schedule('0 1 * * *', () => {
    console.log(">> CRON BUZÓN DIARIO (1:00 AM) <<");
    runBot('--buzon-only');
});

// 4. CFDI: Días 1, 2 y 3: Cada 2 horas empezando a la 1:00 AM
cron.schedule('0 1-23/2 1,2,3 * *', () => {
    console.log(">> CRON CFDI: Días 1-3 (Cada 2 hrs) <<");
    runCfdiBot();
});

// 5. CFDI: Del día 4 en adelante (excepto los últimos 2 días): a las 6am, 1pm y 8pm
cron.schedule('0 6,13,20 4-31 * *', () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    // Si NO estamos en los últimos 2 días, ejecutamos
    if (now.getDate() < lastDay - 1) {
        console.log(">> CRON CFDI: Días normales (6am, 1pm, 8pm) <<");
        runCfdiBot();
    }
});

// 6. CFDI: Últimos 2 días del mes: Cada hora
cron.schedule('0 * 27-31 * *', () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    // Si SÍ estamos en los últimos 2 días, ejecutamos
    if (now.getDate() >= lastDay - 1) {
        console.log(">> CRON CFDI: Últimos 2 días del mes (Cada 1 hr) <<");
        runCfdiBot();
    }
});

// Evitar que el proceso se muera si hay errores no capturados
process.on('uncaughtException', err => {
    console.error('Uncaught Exception en el scheduler:', err);
});
