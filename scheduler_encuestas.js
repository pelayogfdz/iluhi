const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function procesarEncuestas() {
    console.log(`[${new Date().toLocaleString()}] Iniciando barrido de Encuestas Post-Factura (24h)...`);

    try {
        // Encontrar facturas que tengan más de 24 horas y menos de 48 horas (para no enviar años retrospectivos)
        const date24hAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const date48hAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

        const facturasPendientes = await prisma.facturaEmitida.findMany({
            where: {
                encuestaEnviada: false,
                estatus: { not: "Cancelado" },
                fechaEmision: {
                    lte: date24hAgo,
                    gte: date48hAgo
                }
            },
            include: {
                empresa: true
            }
        });

        console.log(`Facturas validas en la ventana 24-48h pendientes de envio: ${facturasPendientes.length}`);

        for (const factura of facturasPendientes) {
            const empresa = factura.empresa;
            
            // 1. Validar que la empresa tenga configurada sus encuestas y SMTP
            if (!empresa.encuestaMensaje || !empresa.encuestaAsunto || !empresa.smtpUser || !empresa.smtpPass || !empresa.smtpHost) {
                // No configurado, lo ignoramos temporalmente
                continue;
            }

            // 2. Buscar al cliente en nuestro CRM usando el RFC del receptor (para tener su correo)
            const cliente = await prisma.cliente.findUnique({
                where: { rfc: factura.receptorRfc }
            });

            if (!cliente || !cliente.correoDestino) {
                console.log(`[Rechazo] Factura ${factura.uuid}: El cliente ${factura.receptorNombre} (${factura.receptorRfc}) no existe en CRM o no tiene correo.`);
                // Marcar enviada para no repetir eternamente
                await prisma.facturaEmitida.update({
                    where: { id: factura.id },
                    data: { encuestaEnviada: true }
                });
                continue;
            }

            console.log(`[Enviando] Encuesta de ${empresa.razonSocial} para -> ${cliente.correoDestino}`);

            // 3. Reemplazar tags dinámicos (Customización solicitada)
            let mensajeHTML = empresa.encuestaMensaje
                .replace(/{{nombre}}/g, cliente.razonSocial)
                .replace(/{{rfc}}/g, cliente.rfc)
                .replace(/{{empresa_emisora}}/g, empresa.razonSocial);
            
            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
            
            // Reemplazo visual de 5 Estrellas
            const starsHtml = `
            <div style="text-align: center; margin: 30px 0;">
                <p style="font-size: 16px; color: #555;">¿Cómo calificarías nuestra respuesta y servicio?</p>
                <div style="font-size: 30px; letter-spacing: 12px;">
                    <a href="${baseUrl}/api/encuestas-tracker?factura=${factura.uuid}&rating=1" style="text-decoration:none; color:#ddd;">&#9733;</a>
                    <a href="${baseUrl}/api/encuestas-tracker?factura=${factura.uuid}&rating=2" style="text-decoration:none; color:#ddd;">&#9733;</a>
                    <a href="${baseUrl}/api/encuestas-tracker?factura=${factura.uuid}&rating=3" style="text-decoration:none; color:#ddd;">&#9733;</a>
                    <a href="${baseUrl}/api/encuestas-tracker?factura=${factura.uuid}&rating=4" style="text-decoration:none; color:#ddd;">&#9733;</a>
                    <a href="${baseUrl}/api/encuestas-tracker?factura=${factura.uuid}&rating=5" style="text-decoration:none; color:#ddd;">&#9733;</a>
                </div>
            </div>`;

            // Si el correo usa la etiqueta {{panel_calificacion}}
            if (mensajeHTML.includes('{{panel_calificacion}}')) {
                mensajeHTML = mensajeHTML.replace(/{{panel_calificacion}}/g, starsHtml);
            } else {
                // Si no, forzarlo al final por defecto
                mensajeHTML += `<br>${starsHtml}`;
            }

            if (empresa.encuestaEnlace) {
                // Si la empresa adjuntó un link normal para otra cosa opcional
                mensajeHTML = mensajeHTML.replace(/{{enlace}}/g, `<a href="${empresa.encuestaEnlace}">${empresa.encuestaEnlace}</a>`);
            }
            let asunto = empresa.encuestaAsunto
                .replace(/{{nombre}}/g, cliente.razonSocial)
                .replace(/{{empresa_emisora}}/g, empresa.razonSocial);

            // 4. Configurar transporte SMTP exclusivo de esta EMPRESA
            const transporter = nodemailer.createTransport({
                host: empresa.smtpHost,
                port: empresa.smtpPort || 465,
                secure: (empresa.smtpPort === 465),
                auth: {
                    user: empresa.smtpUser,
                    pass: empresa.smtpPass
                }
            });

            // 5. Enviar Correo
            try {
                await transporter.sendMail({
                    from: `"${empresa.razonSocial}" <${empresa.smtpUser}>`,
                    to: cliente.correoDestino,
                    subject: asunto,
                    html: mensajeHTML
                });

                // 6. Marcar como entregado exitosamente
                await prisma.facturaEmitida.update({
                    where: { id: factura.id },
                    data: { encuestaEnviada: true }
                });

                console.log(`[Exito] Encuesta enviada a ${cliente.correoDestino}`);

            } catch (mailError) {
                console.error(`[Error SMTP] Fallo envío a ${cliente.correoDestino}:`, mailError.message);
                // No se marca como enviada, para reintentar en 1 hora (mientras siga en la ventana de 48h)
            }
        }

    } catch (e) {
        console.error("Error global en el proceso de encuestas:", e);
    }
}

// PROGRAMACION: Correr cada hora
cron.schedule('0 * * * *', () => {
    procesarEncuestas();
});

console.log("Motor de Encuestas Post-Factura (24h) Inicializado. Corriendo cada hora...");

// Ejecutar inmediatamente al arrancar por si el usuario lo solicita probar
if (process.argv.includes('--run-now')) {
    procesarEncuestas();
}
