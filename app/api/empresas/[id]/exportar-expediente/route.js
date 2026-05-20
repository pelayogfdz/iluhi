import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  const { id } = await params;

  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id }
    });

    if (!empresa) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    // Fetch the latest documents of each type
    const tiposDocs = ['CONSTANCIA', 'OPINION', 'OPINION_IMSS', 'OPINION_INFONAVIT', 'OPINION_ISN'];
    const documentos = await Promise.all(
      tiposDocs.map(tipo => 
        prisma.documentoSat.findFirst({
          where: { empresaId: id, tipo, archivoBase64: { not: null } },
          orderBy: { fechaDocumento: 'desc' }
        })
      )
    );

    const [constancia, opinionSat, opinionImss, opinionInfonavit, opinionIsn] = documentos;

    // 1. Generate Cover PDF using pdf-lib
    const mainPdf = await PDFDocument.create();
    const page = mainPdf.addPage([595.28, 841.89]); // A4 size
    
    // Embed fonts
    const helvetica = await mainPdf.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await mainPdf.embedFont(StandardFonts.HelveticaBold);
    
    // Baker McKenzie style colors
    const primaryColor = rgb(155/255, 28/255, 49/255); // Crimson / Burgundy
    const darkColor = rgb(33/255, 37/255, 41/255);
    const grayColor = rgb(108/255, 117/255, 125/255);
    const lightGray = rgb(233/255, 236/255, 239/255);
    
    // Background bar
    page.drawRectangle({ x: 0, y: 0, width: 25, height: 841.89, color: primaryColor });
    
    let yPos = 780;
    
    // Logo
    if (empresa.logoBase64) {
      try {
        const logoData = empresa.logoBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        const logoBytes = Buffer.from(logoData, 'base64');
        let image;
        if (empresa.logoBase64.includes('image/jpeg')) {
          image = await mainPdf.embedJpg(logoBytes);
        } else {
          image = await mainPdf.embedPng(logoBytes);
        }
        const imgDims = image.scale(0.5);
        // Resize to fit in max width 150
        const scaleFactor = imgDims.width > 150 ? 150 / imgDims.width : 1;
        const finalWidth = imgDims.width * scaleFactor;
        const finalHeight = imgDims.height * scaleFactor;
        page.drawImage(image, { x: 50, y: yPos - finalHeight + 20, width: finalWidth, height: finalHeight });
        yPos -= Math.max(finalHeight, 30);
      } catch(e) { console.error('Error loading logo', e); }
    }
    
    yPos -= 20;
    page.drawText('EXPEDIENTE CORPORATIVO', { x: 50, y: yPos, size: 24, font: helveticaBold, color: primaryColor });
    yPos -= 28;
    page.drawLine({ start: { x: 50, y: yPos }, end: { x: 545, y: yPos }, thickness: 1, color: lightGray });
    yPos -= 25;
    
    const drawSection = (title) => {
      yPos -= 10;
      page.drawText(title.toUpperCase(), { x: 50, y: yPos, size: 12, font: helveticaBold, color: primaryColor });
      yPos -= 10;
      page.drawLine({ start: { x: 50, y: yPos }, end: { x: 545, y: yPos }, thickness: 0.5, color: lightGray });
      yPos -= 15;
    };

    const drawRow = (label, value) => {
      // Si el texto es muy largo, se corta. (simplificado)
      const textVal = String(value || 'N/A').substring(0, 70);
      page.drawText(label, { x: 50, y: yPos, size: 9, font: helveticaBold, color: darkColor });
      page.drawText(textVal, { x: 190, y: yPos, size: 9, font: helvetica, color: darkColor });
      yPos -= 18;
    };
    
    drawSection('Información General');
    drawRow('Razón Social:', empresa.razonSocial);
    drawRow('RFC:', empresa.rfc);
    drawRow('Régimen Fiscal:', empresa.regimenFiscal);
    drawRow('Representante Legal:', empresa.representanteLegal);
    drawRow('Apoderado:', empresa.apoderado);
    
    yPos -= 5;
    drawSection('Datos de Contacto y Ubicación');
    drawRow('Correo Electrónico:', empresa.correo);
    const direccion = `${empresa.calle || ''} ${empresa.numExterior || ''} ${empresa.colonia || ''}`.trim();
    drawRow('Dirección:', direccion);
    drawRow('Ciudad y CP:', `${empresa.ciudad || ''}, ${empresa.estado || ''} C.P. ${empresa.codigoPostal}`);
    
    yPos -= 5;
    drawSection('Actividad y Registros');
    drawRow('Actividad Económica:', empresa.actividadEconomica);
    drawRow('Objeto Social:', empresa.objetoSocial);
    drawRow('Actividad Vulnerable:', empresa.actividadVulnerable ? 'SÍ' : 'NO');
    drawRow('Registro REPSE:', empresa.numeroRepse);
    drawRow('Registro Patronal IMSS:', empresa.infonavitRegistroPatronal);

    yPos -= 20;
    drawSection('Índice de Anexos Documentales Adjuntos');
    
    const drawItem = (text) => {
      page.drawText('• ' + text, { x: 50, y: yPos, size: 9, font: helvetica, color: darkColor });
      yPos -= 15;
    };
    
    drawItem(opinionSat ? `Opinión de Cumplimiento SAT (32-D) - Fecha de corte: ${opinionSat.fechaDocumento.toISOString().split('T')[0]}` : 'Opinión de Cumplimiento SAT (32-D) - NO DISPONIBLE');
    drawItem(constancia ? `Constancia de Situación Fiscal (CSF) - Fecha de corte: ${constancia.fechaDocumento.toISOString().split('T')[0]}` : 'Constancia de Situación Fiscal (CSF) - NO DISPONIBLE');
    drawItem(opinionImss ? `Opinión de Cumplimiento IMSS - Fecha de corte: ${opinionImss.fechaDocumento.toISOString().split('T')[0]}` : 'Opinión de Cumplimiento IMSS - NO DISPONIBLE');
    drawItem(opinionInfonavit ? `Opinión de Cumplimiento INFONAVIT - Fecha de corte: ${opinionInfonavit.fechaDocumento.toISOString().split('T')[0]}` : 'Opinión de Cumplimiento INFONAVIT - NO DISPONIBLE');
    drawItem(opinionIsn ? `Opinión de Cumplimiento ISN - Fecha de corte: ${opinionIsn.fechaDocumento.toISOString().split('T')[0]}` : 'Opinión de Cumplimiento ISN - NO DISPONIBLE');

    // 3. Append attachments
    const appendPdf = async (docRecord) => {
      if (docRecord && docRecord.archivoBase64) {
        try {
          const b64Data = docRecord.archivoBase64.replace(/^data:([A-Za-z-+/]+);base64,/, '');
          const attachmentBuffer = Buffer.from(b64Data, 'base64');
          const attachmentPdf = await PDFDocument.load(attachmentBuffer);
          const copiedPages = await mainPdf.copyPages(attachmentPdf, attachmentPdf.getPageIndices());
          copiedPages.forEach((page) => mainPdf.addPage(page));
        } catch (e) {
          console.error(`Error concatenando anexo ${docRecord.tipo}:`, e);
        }
      }
    };

    // Order of appending
    await appendPdf(opinionSat);
    await appendPdf(constancia);
    await appendPdf(opinionImss);
    await appendPdf(opinionInfonavit);
    await appendPdf(opinionIsn);

    // 4. Finalize PDF
    const finalPdfBytes = await mainPdf.save();

    return new Response(finalPdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Expediente_${empresa.razonSocial || empresa.rfc}.pdf"`
      }
    });

  } catch (error) {
    console.error('Error generando expediente:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
