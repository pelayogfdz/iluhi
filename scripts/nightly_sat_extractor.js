const { PrismaClient } = require('@prisma/client');
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

async function runSequentialSync() {
    console.log("=== INICIANDO ORQUESTADOR SECUENCIAL SAT (11:00 PM) ===");
    const empresas = await prisma.empresa.findMany({
        where: {
            fielCerBase64: { not: null },
            fielKeyBase64: { not: null },
            fielPassword: { not: null }
        }
    });

    console.log(`Empresas listas para procesar: ${empresas.length}`);

    // Iteramos secuencialmente por EMPRESA y por MODULO
    for (const emp of empresas) {
        console.log(`\n==============================================`);
        console.log(` PROCESANDO EMPRESA: ${emp.razonSocial || emp.rfc}`);
        console.log(`==============================================`);

        // 1. CSF
        await procesarModulo(emp, '--csf-only', 'CSF');
        // 2. OPINION
        await procesarModulo(emp, '--opinion-only', 'OPINION');
        // 3. CFDI
        await procesarModulo(emp, '--cfdi-only', 'CFDI');
    }

    console.log("\n=== ORQUESTADOR SECUENCIAL SAT FINALIZADO ===");
    process.exit(0);
}

async function procesarModulo(emp, flag, tipoLog) {
    console.log(`\n[->] Lanzando Módulo ${tipoLog}...`);
    const maestroPath = path.join(__dirname, '..', 'playwright_sat_maestro.js');
    
    const child = spawnSync('node', [maestroPath, flag, `--empresa-id=${emp.id}`], {
        encoding: 'utf-8',
        timeout: 10 * 60 * 1000 // 10 minutos máximo por empresa por módulo
    });

    const output = child.stdout || '';
    const errOutput = child.stderr || '';
    const fullLog = output + '\n' + errOutput;

    let status = 'EXITO';
    let errorMsg = null;

    if (child.error) {
        status = 'ERROR';
        errorMsg = 'Timeout o error de ejecución: ' + child.error.message;
    } else if (fullLog.includes('Falló la descarga') || fullLog.includes('Error en') || fullLog.includes('Excepcion global') || fullLog.includes('No se pudo logear') || fullLog.includes('Error al iniciar')) {
        status = 'ERROR';
        // Extraemos la línea que tiene el error
        const lineas = fullLog.split('\n');
        const errLinea = lineas.find(l => l.includes('Falló la descarga') || l.includes('Error') || l.includes('Excepcion') || l.includes('No se pudo'));
        errorMsg = errLinea ? errLinea.trim() : 'Error detectado en log de consola';
    } else if (tipoLog === 'CSF' && !fullLog.includes('Buzón descargado') && !fullLog.includes('Constancia')) {
         // Validador extra si no vemos el exito
         if(!fullLog.includes('guardada físicamente') && !fullLog.includes('descargada')){
              status = 'ERROR';
              errorMsg = 'No se confirmó la descarga en los logs.';
         }
    }

    // Registrar en SatSyncLog
    await prisma.satSyncLog.create({
        data: {
            empresaId: emp.id,
            tipo: tipoLog,
            status: status,
            errorMsg: errorMsg,
            detalles: fullLog.substring(0, 3000) // Guardamos un fragmento del log por si queremos depurar
        }
    });

    if (status === 'EXITO') {
        console.log(`[OK] Módulo ${tipoLog} exitoso.`);
    } else {
        console.log(`[FAIL] Módulo ${tipoLog} falló: ${errorMsg}`);
    }
}

runSequentialSync().catch(e => {
    console.error("Error crítico en el orquestador:", e);
    process.exit(1);
});
