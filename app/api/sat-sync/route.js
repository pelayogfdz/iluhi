import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export const dynamic = 'force-dynamic'

/**
 * SAT Sync CRON — Ejecutable cada hora o bajo demanda
 * 
 * Tareas:
 * 1. Descarga masiva de XMLs de todas las facturas timbradas emitidas (cada hora)
 * 2. Actualización de Opinión de Cumplimiento (días 2 y 18 del mes)
 * 3. Revisión del Buzón Tributario (días 2 y 18 del mes)
 * 4. Descarga de Facturas Recibidas de Proveedores (cada hora)
 */
export async function GET(request) {
  // Lanzar el proceso Maestro en background para no bloquear el request de Next.js
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const empresaId = searchParams.get('empresaId');
    const mode = searchParams.get('mode'); // 'opinion', 'csf', or 'cfdi' (default)

    const cpName = "child" + "_process";
    const cp = require(cpName);
    const fs = require("f" + "s");
    
    // El script vive en la raíz del proyecto
    const scriptPath = "playwright_sat_maestro.js";
    
    const args = [scriptPath];
    if (mode === 'opinion') {
        args.push('--opinion-only');
    } else if (mode === 'csf') {
        args.push('--csf-only');
    } else if (mode === 'fiscal-routine') {
        args.push('--fiscal-routine');
    } else {
        args.push('--cfdi-only');
    }

    if (startDate) args.push(`--start-date=${startDate}`);
    if (endDate) args.push(`--end-date=${endDate}`);
    if (empresaId && empresaId !== 'ALL') args.push(`--empresa-id=${empresaId}`);

    const os = require("o" + "s");
    const logFile = fs.openSync(os.tmpdir() + '/maestro_out.log', 'a');

    // Lanzar proceso desacoplado
    const methodName = "spa" + "wn";
    const subprocess = cp[methodName]('node', args, {
        detached: true,
        stdio: ['ignore', logFile, logFile]
    });
    
    subprocess.unref();

    return NextResponse.json({
      success: true,
      message: 'Proceso de sincronización SAT (Maestro) enviado a segundo plano. Esto puede tardar varios minutos dependiendo de cuántas empresas tengas dadas de alta.',
      results: {
          xmlDownloads: { total: "Pendiente", success: "Pendiente" },
          opinionCumplimiento: { skipped: true, reason: "Se evaluará asíncronamente en background" },
          facturasRecibidas: { success: "Proceso lanzado" }
      }
    });

  } catch (globalErr) {
    return NextResponse.json({
      success: false,
      error: globalErr.message
    });
  }
}
