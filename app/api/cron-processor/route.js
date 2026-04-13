async function fetchImageAsBase64(url) {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return `data:${response.headers.get('content-type')};base64,${buffer.toString('base64')}`;
  } catch(e) {
    console.error("Error fetching logo:", e);
    return null;
  }
}

async function generateCotizacionPdf(factura, empresa, cliente, facturapiClient) {
  // 1. Obtener los detalles de la factura original para reconstruir los conceptos
  if (!factura.uuid || factura.uuid === 'mock_uuid_123') return null; // Fallback simulación
  
  const fInvoice = await facturapiClient.invoices.retrieve(factura.uuid);

  const fonts = {
    Helvetica: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique'
    }
  };
  const printer = new PdfPrinter(fonts);
  
  const logoBase64 = await fetchImageAsBase64(empresa.logoUrl);

  const itemsTable = [
    [ { text: 'Cant', style: 'th' }, { text: 'U. Medida', style: 'th'}, { text: 'Concepto', style: 'th' }, { text: 'P. Unitario', style: 'th' }, { text: 'Importe', style: 'th' } ]
  ];

  fInvoice.items.forEach(item => {
     itemsTable.push([
       item.quantity.toString(),
       item.product.unit_name || 'Servicio',
       item.product.description,
       `$${item.product.price.toFixed(2)}`,
       `$${(item.quantity * item.product.price).toFixed(2)}`
     ]);
  });
  
  const headerContent = [];
  if (logoBase64) {
    headerContent.push(
      {
         columns: [
           { image: logoBase64, width: 120, margin: [0, 0, 20, 0] },
           { 
             stack: [
               { text: empresa.razonSocial, fontSize: 16, bold: true },
               { text: `R.F.C.: ${empresa.rfc}`, fontSize: 10 },
               { text: `Régimen Fiscal: ${empresa.regimen}`, fontSize: 10 },
               { text: `C.P.: ${empresa.codigoPostal}`, fontSize: 10 }
             ]
           }
         ]
      }
    );
  } else {
    headerContent.push(
      { 
        stack: [
           { text: empresa.razonSocial, fontSize: 16, bold: true },
           { text: `R.F.C.: ${empresa.rfc}`, fontSize: 10 },
           { text: `Régimen Fiscal: ${empresa.regimen}`, fontSize: 10 },
           { text: `C.P.: ${empresa.codigoPostal}`, fontSize: 10 }
        ]
      }
    );
  }

  const docDefinition = {
    defaultStyle: { font: 'Helvetica', fontSize: 10 },
    content: [
      ...headerContent,
      { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1 }], margin: [0, 10, 0, 10] },
      
      {
         columns: [
           {
              width: '*',
              stack: [
                 { text: 'DATOS DEL CLIENTE', style: 'sectionHeader' },
                 { text: cliente.razonSocial, bold: true },
                 { text: `R.F.C.: ${cliente.rfc}` },
                 { text: `C.P.: ${cliente.codigoPostal}` },
                 { text: `Régimen Fiscal: ${cliente.regimenFiscal}` },
                 { text: `Uso CFDI: ${cliente.usoCfdi}` }
              ]
           },
           {
              width: 'auto',
              stack: [
                 { text: 'PRE-FACTURA (COTIZACIÓN)', fontSize: 14, bold: true, alignment: 'right', color: '#333' },
                 { text: 'ESTE DOCUMENTO NO TIENE VALIDEZ FISCAL', fontSize: 8, alignment: 'right', color: 'red', margin: [0, 0, 0, 10] },
                 { text: `Fecha Emisión: ${new Date().toLocaleDateString()}`, alignment: 'right' }
              ]
           }
         ]
      },
      
      { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1 }], margin: [0, 10, 0, 10] },
      
      {
        table: { headerRows: 1, widths: ['auto', 'auto', '*', 'auto', 'auto'], body: itemsTable },
        layout: {
           hLineWidth: function (i, node) { return (i === 0 || i === node.table.body.length) ? 2 : 1; },
           vLineWidth: function (i, node) { return 0; },
           hLineColor: function (i, node) { return '#aaa'; },
           paddingLeft: function(i, node) { return 4; },
           paddingRight: function(i, node) { return 4; },
           paddingTop: function(i, node) { return 6; },
           paddingBottom: function(i, node) { return 6; }
        }
      },
      { text: `Subtotal: $${factura.subTotal.toFixed(2)}`, alignment: 'right', margin: [0, 20, 0, 5], bold: true },
      { text: `Total Impuestos: $${factura.totalImpuestosTrasladados.toFixed(2)}`, alignment: 'right', margin: [0, 0, 0, 5] },
      { text: `TOTAL: $${factura.total.toFixed(2)} ${factura.moneda || 'MXN'}`, alignment: 'right', bold: true, fontSize: 14, color: '#0054a6' }
    ],
    styles: { 
       th: { bold: true, fillColor: '#f4f4f4', color: '#333' },
       sectionHeader: { bold: true, color: '#0054a6', fontSize: 11, margin: [0, 0, 0, 5] }
    }
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  
  // Transform Stream to Buffer
  return new Promise((resolve, reject) => {
    let chunks = [];
    pdfDoc.on('data', chunk => chunks.push(chunk));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', err => reject(err));
    pdfDoc.end();
  });
}

function processTemplate(template, cliente, factura) {
  if(!template) return '';
  let txt = template.replace(/\{\{cliente\}\}/g, cliente.razonSocial || 'Cliente');
  txt = txt.replace(/\{\{total\}\}/g, `$${factura.total.toFixed(2)} ${factura.moneda}`);
  return txt;
}

export async function GET(request) {
  const now = new Date();
  
  // Fetch up to 10 pending tasks
  const tasks = await prisma.emailTask.findMany({
    where: { status: 'PENDING', scheduledFor: { lte: now } },
    take: 10,
    include: {
      factura: {
        include: { empresa: true, cliente: true }
      }
    }
  });

  if (tasks.length === 0) {
    return NextResponse.json({ success: true, pending: 0, msg: "Ninguna tarea pendiente" });
  }

  // To talk with facturapi using explicit auth keys since this is background process
  const FacturapiClient = require('facturapi').default;
  let facturapiCentral = new FacturapiClient(process.env.FACTURAPI_KEY);

  let procesadas = 0;

  for (const task of tasks) {
    try {
      const { factura, type } = task;
      const { empresa, cliente } = factura;

      if (!empresa.smtpUser || !empresa.smtpPass || !empresa.smtpHost) {
        throw new Error("La empresa no tiene la configuración SMTP guardada.");
      }
      if (!cliente.correoDestino) {
        throw new Error("El cliente no tiene un correo destino configurado.");
      }

      // Configure nodemailer
      const transporter = nodemailer.createTransport({
        host: empresa.smtpHost,
        port: empresa.smtpPort || 587,
        secure: empresa.smtpPort === 465,
        auth: {
          user: empresa.smtpUser,
          pass: empresa.smtpPass
        } // NOTA: para GMAIL debes usar "App Passwords" (Contraseña de Aplicación)
      });

      const mailOptions = {
        from: `"${empresa.razonSocial}" <${empresa.smtpUser}>`,
        to: cliente.correoDestino,
        subject: `Notificación - ${empresa.razonSocial}`,
        text: '',
        attachments: []
      };

      if (type === 'COTIZACION') {
        mailOptions.subject = `Cotización de Servicios - ${empresa.razonSocial}`;
        mailOptions.text = processTemplate(empresa.plantillaCotizacion || 'Adjunto enviamos la cotización de servicios.', cliente, factura);
        
        try {
           const pdfBuffer = await generateCotizacionPdf(factura, empresa, cliente, facturapiCentral);
           if (pdfBuffer) {
              mailOptions.attachments.push({
                filename: `Cotizacion_${factura.folio || '00'}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
              });
           }
        } catch(pdfErr) {
           console.log("Error creando el PDF personalizado: ", pdfErr);
        }
      } else if (type === 'ORDEN_SERVICIO') {
        mailOptions.subject = `Orden de Servicio Activa - ${empresa.razonSocial}`;
        mailOptions.text = processTemplate(empresa.plantillaOrdenServicio || 'Tu orden de servicio ha sido puesta en marcha.', cliente, factura);
      } else if (type === 'FACTURA') {
        mailOptions.subject = `Factura Fiscal CFDI 4.0 - ${empresa.razonSocial}`;
        mailOptions.text = processTemplate(empresa.plantillaFactura || 'Adjunto entregamos tu factura y archivo XML XML timbrados de forma oficial.', cliente, factura);
        
        if (factura.uuid && factura.uuid !== 'mock_uuid_123') {
           const pdfStream = await facturapiCentral.invoices.downloadPdf(factura.uuid);
           const xmlStream = await facturapiCentral.invoices.downloadXml(factura.uuid);
           mailOptions.attachments.push({ filename: `Factura_${factura.uuid}.pdf`, content: pdfStream });
           mailOptions.attachments.push({ filename: `Factura_${factura.uuid}.xml`, content: xmlStream });
        }
      }

      await transporter.sendMail(mailOptions);

      await prisma.emailTask.update({
        where: { id: task.id },
        data: { status: 'SENT', error: null }
      });
      procesadas++;
    } catch (error) {
      console.error(`Status de Tarea UID: ${task.id} falló => `, error);
      await prisma.emailTask.update({
        where: { id: task.id },
        data: { status: 'FAILED', error: error.message }
      });
    }
  }

  return NextResponse.json({ success: true, processed: procesadas });
}
