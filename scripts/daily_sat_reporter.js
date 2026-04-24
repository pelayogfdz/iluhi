const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();

async function generarYEnviarReporte() {
    console.log("=== INICIANDO GENERACIÓN DE REPORTE DIARIO SAT (8:00 AM) ===");

    // 1. Obtener la cuenta SMTP de gerencia@alkiba.com o la primera que tenga configuración
    const empresaSmtp = await prisma.empresa.findFirst({
        where: { smtpHost: { not: null }, smtpUser: { contains: 'alkiba' } }
    }) || await prisma.empresa.findFirst({
        where: { smtpHost: { not: null } }
    });

    if (!empresaSmtp) {
        console.error("No se encontró ninguna empresa con configuración SMTP para enviar el reporte.");
        process.exit(1);
    }

    const transporter = nodemailer.createTransport({
        host: empresaSmtp.smtpHost,
        port: empresaSmtp.smtpPort,
        secure: empresaSmtp.smtpPort === 465,
        auth: {
            user: empresaSmtp.smtpUser,
            pass: empresaSmtp.smtpPass
        }
    });

    // 2. Definir rango de 24 horas
    const ahora = new Date();
    const ayer = new Date(ahora.getTime() - (24 * 60 * 60 * 1000));

    // 3. Obtener métricas
    const facturasEmitidas = await prisma.facturaEmitida.count({ where: { createdAt: { gte: ayer } } });
    const facturasRecibidas = await prisma.facturaRecibida.count({ where: { createdAt: { gte: ayer } } });

    // Registros de Sincronización (CSF y OPINION)
    const syncLogs = await prisma.satSyncLog.findMany({
        where: { createdAt: { gte: ayer } },
        include: { empresa: { select: { razonSocial: true, rfc: true } } }
    });

    const csfExito = syncLogs.filter(l => l.tipo === 'CSF' && l.status === 'EXITO');
    const csfError = syncLogs.filter(l => l.tipo === 'CSF' && l.status === 'ERROR');
    
    const opinionExito = syncLogs.filter(l => l.tipo === 'OPINION' && l.status === 'EXITO');
    const opinionError = syncLogs.filter(l => l.tipo === 'OPINION' && l.status === 'ERROR');

    // Avisos de Buzón
    const buzones = await prisma.documentoSat.findMany({
        where: { tipo: 'BUZON', createdAt: { gte: ayer } },
        include: { empresa: { select: { razonSocial: true, rfc: true } } }
    });

    const buzonesConAviso = buzones.filter(b => b.descripcion?.includes('AVISO PENDIENTE'));

    // 4. Construir HTML del correo
    let htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Reporte Diario de Sincronización SAT</h2>
        <p>A continuación se presenta el resumen de las descargas automatizadas de las últimas 24 horas.</p>

        <h3>📊 Facturación (CFDI)</h3>
        <ul>
            <li><strong>Facturas Emitidas Descargadas:</strong> ${facturasEmitidas}</li>
            <li><strong>Facturas Recibidas Descargadas:</strong> ${facturasRecibidas}</li>
        </ul>

        <h3>📄 Constancias de Situación Fiscal (CSF)</h3>
        <ul>
            <li style="color: green;"><strong>Descargas Exitosas:</strong> ${csfExito.length}</li>
            <li style="color: red;"><strong>Fallos / No se pudo descargar:</strong> ${csfError.length}</li>
        </ul>
        ${csfError.length > 0 ? `<ul style="font-size: 12px; color: #7f8c8d;">${csfError.map(e => `<li>${e.empresa.razonSocial || e.empresa.rfc}: ${e.errorMsg}</li>`).join('')}</ul>` : ''}

        <h3>✅ Opiniones de Cumplimiento (32-D)</h3>
        <ul>
            <li style="color: green;"><strong>Descargas Exitosas:</strong> ${opinionExito.length}</li>
            <li style="color: red;"><strong>Fallos / No se pudo descargar:</strong> ${opinionError.length}</li>
        </ul>
        ${opinionError.length > 0 ? `<ul style="font-size: 12px; color: #7f8c8d;">${opinionError.map(e => `<li>${e.empresa.razonSocial || e.empresa.rfc}: ${e.errorMsg}</li>`).join('')}</ul>` : ''}

        <h3 style="color: #e67e22;">🔔 Buzón Tributario</h3>
        <p>Total de buzones revisados: ${buzones.length}</p>
        ${buzonesConAviso.length > 0 ? `
            <div style="background-color: #fff3cd; color: #856404; padding: 10px; border-left: 4px solid #ffeeba; margin-top: 10px;">
                <strong>¡ATENCIÓN! Se detectaron mensajes no leídos en el buzón de las siguientes empresas:</strong>
                <ul>
                    ${buzonesConAviso.map(b => `<li>${b.empresa.razonSocial || b.empresa.rfc}</li>`).join('')}
                </ul>
                <p><em>Por favor revise la plataforma para ver el documento.</em></p>
            </div>
        ` : '<p style="color: green;">No hay avisos pendientes en los buzones revisados.</p>'}

        <hr style="margin-top: 30px; border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #95a5a6; text-align: center;">Generado automáticamente por tu Orquestador SAT - Iluhi Creadores</p>
    </div>
    `;

    // 5. Enviar el correo
    const emailDestino = 'pfernandez@seit.com.mx';
    console.log(`Enviando correo a ${emailDestino}...`);
    await transporter.sendMail({
        from: `"Iluhi Bot SAT" <${empresaSmtp.smtpUser}>`,
        to: emailDestino,
        subject: `[Iluhi] Reporte Diario Sincronización SAT - ${ahora.toLocaleDateString()}`,
        html: htmlContent
    });

    console.log("=== REPORTE ENVIADO CON ÉXITO ===");
    process.exit(0);
}

generarYEnviarReporte().catch(e => {
    console.error("Error al enviar reporte:", e);
    process.exit(1);
});
