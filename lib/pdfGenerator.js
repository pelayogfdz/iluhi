const pdfmake = require('pdfmake');

export async function createPdfBuffer(docDefinition) {
  try {
    pdfmake.setFonts(getPdfFonts());
    const pdf = pdfmake.createPdf(docDefinition);
    const buffer = await pdf.getBuffer();
    return buffer;
  } catch (err) {
    throw err;
  }
}

export function getPdfFonts() {
  return {
    Helvetica: { normal: 'Helvetica', bold: 'Helvetica-Bold', italics: 'Helvetica-Oblique', bolditalics: 'Helvetica-BoldOblique' },
    Times: { normal: 'Times-Roman', bold: 'Times-Bold', italics: 'Times-Italic', bolditalics: 'Times-BoldItalic' },
    Courier: { normal: 'Courier', bold: 'Courier-Bold', italics: 'Courier-Oblique', bolditalics: 'Courier-BoldOblique' }
  };
}

export function buildPdfDocDefinition(factura, empresa, cliente, type, itemsTable, totalTextLines, documentTitle) {
  const fontName = empresa.tipografiaPdf || 'Helvetica';
  const primaryColor = empresa.colorPrimario || '#0054a6';
  const secondaryColor = empresa.colorSecundario || '#333333';
  const layout = empresa.layoutPdf || 'CLASICO';
  const logoData = empresa.logoBase64;

  const docDef = {
    defaultStyle: { font: fontName, fontSize: 10, color: '#333333' },
    content: [],
    styles: {
       th: { bold: true, fillColor: primaryColor, color: '#ffffff' },
       sectionHeader: { bold: true, color: primaryColor, fontSize: 12, margin: [0, 0, 0, 5] },
       accentText: { color: primaryColor, bold: true },
       title: { fontSize: layout === 'MODERNO' ? 20 : 16, bold: true, color: layout === 'MODERNO' ? primaryColor : secondaryColor, alignment: layout === 'MODERNO' ? 'left' : 'right' }
    }
  };

  const headerLeft = logoData ? { image: logoData, width: layout === 'MINIMALISTA' ? 80 : 120, margin: [0, 0, 20, 0] } : { text: '' };
  
  const headerRight = {
     stack: [
       { text: empresa.razonSocial, fontSize: 14, bold: true, color: secondaryColor },
       { text: `R.F.C.: ${empresa.rfc}`, fontSize: 9 },
       { text: `Régimen Fiscal: ${empresa.regimen}`, fontSize: 9 },
       { text: `C.P.: ${empresa.codigoPostal}`, fontSize: 9 }
     ],
     alignment: layout === 'MODERNO' ? 'right' : 'left'
  };

  if (layout === 'MODERNO') {
    docDef.content.push({
      columns: [ headerLeft, headerRight ],
      margin: [0, 0, 0, 20]
    });
    docDef.content.push({
      canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 4, color: primaryColor }],
      margin: [0, 0, 0, 15]
    });
  } else if (layout === 'MINIMALISTA') {
    docDef.content.push({
      columns: [ headerRight, { width: '*', text: '' }, headerLeft ],
      margin: [0, 0, 0, 30]
    });
  } else {
    // CLASICO
    docDef.content.push({
      columns: [ headerLeft, headerRight ],
      margin: [0, 0, 0, 10]
    });
    docDef.content.push({ canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1 }], margin: [0, 10, 0, 10] });
  }

  // Document Title & Client Data
  const clientData = {
     width: '*',
     stack: [
        { text: 'DATOS DEL CLIENTE', style: 'sectionHeader' },
        { text: cliente.razonSocial, bold: true, color: secondaryColor },
        { text: `R.F.C.: ${cliente.rfc}` },
        { text: `C.P.: ${cliente.codigoPostal}` },
        { text: `Régimen Fiscal: ${cliente.regimen}` },
        { text: `Uso CFDI: ${factura.usoCfdi || cliente.usoCfdi || 'No especificado'}` }
     ]
  };

  const docInfoRight = {
     width: 'auto',
     stack: [
        { text: documentTitle, style: 'title', margin: [0,0,0,5] },
        type === 'COTIZACION' ? { text: 'ESTE DOCUMENTO NO TIENE VALIDEZ FISCAL', fontSize: 8, alignment: layout === 'MODERNO' ? 'left' : 'right', color: 'red', margin: [0, 0, 0, 10] } : {},
        { text: `Referencia: ${factura.folioInterno || factura.folio || '00'}`, alignment: layout === 'MODERNO' ? 'left' : 'right' },
        { text: `Fecha Emisión: ${new Date().toLocaleDateString()}`, alignment: layout === 'MODERNO' ? 'left' : 'right' },
        { text: `Forma de Pago: ${factura.formaPago || '99'}`, alignment: layout === 'MODERNO' ? 'left' : 'right', margin: [0, 5, 0, 0] },
        { text: `Método de Pago: ${factura.metodoPago || 'PPD'}`, alignment: layout === 'MODERNO' ? 'left' : 'right' }
     ]
  };

  if (layout === 'MODERNO') {
      docDef.content.push({
         columns: [ docInfoRight, clientData ],
         columnGap: 20
      });
  } else {
      docDef.content.push({
         columns: [ clientData, docInfoRight ]
      });
  }

  // Divider
  docDef.content.push({ canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: layout==='MINIMALISTA'?0.5:1, lineColor: '#dddddd' }], margin: [0, 15, 0, 15] });

  // Items Table
  let layoutConfig = {};
  if (layout === 'MODERNO') {
     layoutConfig = {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        fillColor: (i) => (i === 0 ? primaryColor : (i % 2 === 0 ? '#f9f9f9' : null))
     };
  } else if (layout === 'MINIMALISTA') {
     docDef.styles.th = { bold: true, color: secondaryColor, margin: [0,5,0,5] };
     layoutConfig = {
        hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
        vLineWidth: () => 0,
        hLineColor: () => '#dddddd'
     };
  } else {
     // CLASICO
     layoutConfig = {
        hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 2 : 1,
        vLineWidth: () => 0,
        hLineColor: () => '#aaaaaa'
     };
  }

  const colWidths = type === 'COTIZACION' ? ['auto', 'auto', '*', 'auto', 'auto'] : ['auto', 'auto', '*'];

  docDef.content.push({
    table: { headerRows: 1, widths: colWidths, body: itemsTable },
    layout: {
       ...layoutConfig,
       paddingLeft: () => 4,
       paddingRight: () => 4,
       paddingTop: () => 6,
       paddingBottom: () => 6
    }
  });

  // Totals
  if (totalTextLines && totalTextLines.length > 0) {
     docDef.content.push({
        stack: totalTextLines,
        margin: [0, 20, 0, 0],
        alignment: 'right'
     });
  }

  // Footer/Notes
  if (factura.notasServicio) {
    docDef.content.push({ canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor:'#eee' }], margin: [0, 20, 0, 10] });
    docDef.content.push({ text: 'NOTAS / CONSIDERACIONES:', style: 'sectionHeader' });
    docDef.content.push({ text: factura.notasServicio, fontSize: 9, italics: true, color: '#555' });
  }

  if (layout === 'MINIMALISTA') {
     docDef.footer = function(currentPage, pageCount) { 
       return { text: `Página ${currentPage.toString()} de ${pageCount}`, alignment: 'center', fontSize: 8, color: '#aaa', margin: [0,10,0,0] }; 
     };
  }

  return docDef;
}

export async function generateCotizacionPdf(factura, empresa, cliente, facturapiClient) {
  if (!factura.uuid || factura.uuid === 'mock_uuid_123') return null;
  const fInvoice = await facturapiClient.invoices.retrieve(factura.uuid);

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

  const totals = [
      { text: `Subtotal: $${factura.subTotal.toFixed(2)}`, margin: [0, 5, 0, 5], bold: true },
      { text: `Total Impuestos: $${factura.totalImpuestosTrasladados.toFixed(2)}`, margin: [0, 0, 0, 5] },
      { text: `TOTAL: $${factura.total.toFixed(2)} ${factura.moneda || 'MXN'}`, bold: true, fontSize: 14, color: empresa.colorPrimario || '#0054a6' }
  ];

  const docDefinition = buildPdfDocDefinition(factura, empresa, cliente, 'COTIZACION', itemsTable, totals, 'PRE-FACTURA (COTIZACIÓN)');
  return await createPdfBuffer(docDefinition);
}

export async function generateOrdenServicioPdf(factura, empresa, cliente, facturapiClient) {
  if (!factura.uuid || factura.uuid === 'mock_uuid_123') return null;
  const fInvoice = await facturapiClient.invoices.retrieve(factura.uuid);

  const itemsTable = [
    [ { text: 'Cant', style: 'th' }, { text: 'U. Medida', style: 'th'}, { text: 'Concepto', style: 'th' } ]
  ];

  fInvoice.items.forEach(item => {
     itemsTable.push([
       item.quantity.toString(),
       item.product.unit_name || 'Servicio',
       item.product.description
     ]);
  });
  
  const totals = [
      { text: 'Gracias por confiar en nuestros servicios.', alignment: 'center', margin: [0, 40, 0, 0], italics: true, color: '#666' }
  ];

  const docDefinition = buildPdfDocDefinition(factura, empresa, cliente, 'ORDEN_SERVICIO', itemsTable, totals, 'ORDEN DE SERVICIO');
  return await createPdfBuffer(docDefinition);
}
