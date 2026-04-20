const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');

console.log("=========================================");
console.log("⏰ SAT BOT SCHEDULER INICIADO");
console.log("El sistema está esperando para descargar automáticamente:");
console.log(" 1) [ÚNICA VEZ] - 21 de Abril a las 2:00 AM");
console.log(" 2) [RECURRENTE] - Día 2 y 19 de CADA mes a las 2:00 AM");
console.log("=========================================\n");

function runBot() {
    console.log(`[${new Date().toLocaleString()}] Lanzando secuencia de descarga SAT...`);
    
    // Spawn en lugar de exec para poder ver el stream del proceso en tiempo real
    const botProcess = spawn('node', ['playwright_sat_bot.js'], {
        cwd: path.join(__dirname),
        stdio: 'inherit' // pasa el console.log del hijo al padre directamente
    });

    botProcess.on('close', (code) => {
        console.log(`[${new Date().toLocaleString()}] El proceso bot SAT terminó con código ${code}.\nEsperando próxima fecha de calendario...`);
    });
}

// 1. Cron recurrente: Todos los dias 2 y 19 a las 2:00 AM
// Minuto 0, Hora 2, Dias 2 y 19, Mes *, Dia de la semana *
cron.schedule('0 2 2,19 * *', () => {
    console.log(">> CRON RECURRENTE ACTIVADO (Día 2 o 19) <<");
    runBot();
});

// 2. Cron único temporal: 21 de Abril a las 2:00 AM
// Minuto 0, Hora 2, Dia 21, Mes 4, Dia de la semana *
cron.schedule('0 2 21 4 *', () => {
    console.log(">> CRON ESPECIAL ACTIVADO (21 de Abril) <<");
    runBot();
});

// Evitar que el proceso se muera si hay errores no capturados
process.on('uncaughtException', err => {
    console.error('Uncaught Exception en el scheduler:', err);
});
