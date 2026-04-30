require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const nodemailer = require('nodemailer');
const FacturapiClient = require('facturapi').default || require('facturapi');

function processTemplate(template, cliente, factura) {
  if(!template) return '';
  let txt = template.replace(/\{\{cliente\}\}/g, cliente.razonSocial || 'Cliente');
  txt = txt.replace(/\{\{total\}\}/g, `$${factura.total.toFixed(2)} ${factura.moneda}`);
  return txt;
}

async function main() {
  const tasks = await prisma.emailTask.findMany({
    where: { status: 'PENDING' },
    include: {
      factura: {
        include: { empresa: true, cliente: true }
      }
    }
  });

  console.log(`Found ${tasks.length} pending tasks`);

  for (const task of tasks) {
    try {
      const { factura, type } = task;
      const { empresa, cliente } = factura;

      if (!empresa.smtpUser || !empresa.smtpPass || !empresa.smtpHost) {
        throw new Error("La empresa no tiene la configuracion SMTP guardada.");
      }
      if (!cliente.correoDestino) {
        throw new Error("El cliente no tiene un correo destino configurado.");
      }

      console.log(`Processing task ${task.id} (${type}) for ${empresa.razonSocial} to ${cliente.correoDestino}`);

      const transporter = nodemailer.createTransport({
        host: empresa.smtpHost,
        port: empresa.smtpPort || 587,
        secure: empresa.smtpPort === 465,
        auth: {
          user: empresa.smtpUser,
          pass: empresa.smtpPass
        }
      });

      const mailOptions = {
        from: `"${empresa.razonSocial}" <${empresa.smtpUser}>`,
        to: cliente.correoDestino,
        subject: `Notificacion - ${empresa.razonSocial}`,
        text: '',
        attachments: []
      };

      const activeKey = empresa.facturapiLiveKey || empresa.facturapiTestKey || process.env.FACTURAPI_LIVE_KEY;
      const tenantClient = new FacturapiClient(activeKey);

      if (type === 'COTIZACION') {
        mailOptions.subject = `Cotizacion de Servicios - ${empresa.razonSocial}`;
        mailOptions.text = processTemplate(empresa.plantillaCotizacion || 'Adjunto enviamos la cotizacion de servicios.', cliente, factura);
      } else if (type === 'ORDEN_SERVICIO') {
        mailOptions.subject = `Orden de Servicio Activa - ${empresa.razonSocial}`;
        mailOptions.text = processTemplate(empresa.plantillaOrdenServicio || 'Tu orden de servicio ha sido puesta en marcha.', cliente, factura);
      } else if (type === 'FACTURA') {
        mailOptions.subject = `Factura Fiscal CFDI 4.0 - ${empresa.razonSocial}`;
        mailOptions.text = processTemplate(empresa.plantillaFactura || 'Adjunto entregamos tu factura y archivo XML XML timbrados de forma oficial.', cliente, factura);
        
        if (factura.uuid && factura.uuid !== 'mock_uuid_123') {
           const pdfStream = await tenantClient.invoices.downloadPdf(factura.uuid);
           const xmlStream = await tenantClient.invoices.downloadXml(factura.uuid);
           mailOptions.attachments.push({ filename: `Factura_${factura.uuid}.pdf`, content: pdfStream });
           mailOptions.attachments.push({ filename: `Factura_${factura.uuid}.xml`, content: xmlStream });
        }
      }

      await transporter.sendMail(mailOptions);
      console.log(`Successfully sent email for task ${task.id}`);

      await prisma.emailTask.update({
        where: { id: task.id },
        data: { status: 'SENT', error: null }
      });
    } catch (error) {
      console.error(`Task ${task.id} failed => `, error.message);
      await prisma.emailTask.update({
        where: { id: task.id },
        data: { status: 'FAILED', error: error.message }
      });
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
