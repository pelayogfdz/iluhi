import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  const { id } = await params;

  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id },
      include: { archivosEmpresa: true } // might be empty, but let's fetch it
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
    
    // Embed fonts
    const fontNormal = await mainPdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await mainPdf.embedFont(StandardFonts.HelveticaBold);
    
    // Baker McKenzie style colors
    const primaryColor = rgb(228/255, 0/255, 43/255); // Baker McKenzie Red
    const darkColor = rgb(33/255, 37/255, 41/255); // Dark Gray
    const lightGray = rgb(200/255, 200/255, 200/255);
    
    const drawTemplate = (page) => {
        // Red bar on the left
        page.drawRectangle({ x: 0, y: 0, width: 25, height: 841.89, color: primaryColor });
        // Footer line
        page.drawLine({ start: { x: 50, y: 40 }, end: { x: 545, y: 40 }, thickness: 1, color: lightGray });
        page.drawText('Expediente Corporativo Confidencial - ' + (empresa.razonSocial || empresa.rfc), { x: 50, y: 25, size: 8, font: fontNormal, color: lightGray });
        page.drawText(new Date().toLocaleDateString(), { x: 500, y: 25, size: 8, font: fontNormal, color: lightGray });
    };

    let page = mainPdf.addPage([595.28, 841.89]); // A4 size
    drawTemplate(page);
    let yPos = 780;
    
    // Logo
    if (empresa.logoBase64) {
      try {
        const logoData = empresa.logoBase64.split('base64,').pop();
        const logoBytes = Buffer.from(logoData, 'base64');
        let image;
        if (empresa.logoBase64.includes('image/jpeg') || empresa.logoBase64.includes('image/jpg')) {
          image = await mainPdf.embedJpg(logoBytes);
        } else {
          image = await mainPdf.embedPng(logoBytes);
        }
        const imgDims = image.scale(0.5);
        const scaleFactor = imgDims.width > 200 ? 200 / imgDims.width : 1;
        const finalWidth = imgDims.width * scaleFactor;
        const finalHeight = imgDims.height * scaleFactor;
        page.drawImage(image, { x: 50, y: yPos - finalHeight + 20, width: finalWidth, height: finalHeight });
        yPos -= Math.max(finalHeight, 30);
      } catch(e) { console.error('Error loading logo', e); }
    }
    
    yPos -= 30;
    page.drawText('DOSSIER CORPORATIVO', { x: 50, y: yPos, size: 28, font: fontBold, color: primaryColor });
    yPos -= 35;
    
    const checkPageBreak = (neededSpace) => {
        if (yPos - neededSpace < 60) {
            page = mainPdf.addPage([595.28, 841.89]);
            drawTemplate(page);
            yPos = 780;
        }
    };

    const drawSection = (title) => {
      checkPageBreak(40);
      yPos -= 10;
      page.drawText(title.toUpperCase(), { x: 50, y: yPos, size: 14, font: fontBold, color: primaryColor });
      yPos -= 10;
      page.drawLine({ start: { x: 50, y: yPos }, end: { x: 545, y: yPos }, thickness: 1.5, color: darkColor });
      yPos -= 20;
    };

    const drawRow = (label, value) => {
      if (!value) return; // omit empty
      checkPageBreak(20);
      const textVal = String(value).substring(0, 80);
      page.drawText(label, { x: 50, y: yPos, size: 10, font: fontBold, color: darkColor });
      page.drawText(textVal, { x: 220, y: yPos, size: 10, font: fontNormal, color: darkColor });
      yPos -= 18;
    };
    
    drawSection('Información Corporativa y Fiscal');
    drawRow('Razón Social:', empresa.razonSocial);
    drawRow('RFC:', empresa.rfc);
    drawRow('Régimen Fiscal:', empresa.regimen);
    drawRow('Tipo de Empresa:', empresa.tipoEmpresa);
    drawRow('Representante Legal:', empresa.representanteLegal);
    drawRow('Apoderado:', empresa.apoderado);
    
    yPos -= 10;
    drawSection('Datos de Contacto y Ubicación');
    drawRow('Correo Electrónico:', empresa.correo);
    const direccion = `${empresa.calle || ''} ${empresa.numExterior || ''} ${empresa.colonia || ''}`.trim();
    if(direccion) drawRow('Dirección:', direccion);
    if(empresa.municipio) drawRow('Municipio:', empresa.municipio);
    if(empresa.ciudad) drawRow('Ciudad y CP:', `${empresa.ciudad || ''}, ${empresa.estado || ''} C.P. ${empresa.codigoPostal}`);
    
    yPos -= 10;
    drawSection('Actividad y Registros');
    drawRow('Objeto Social:', empresa.objetoSocial);
    drawRow('Actividad Económica:', empresa.actividadEconomica);
    drawRow('Actividad Vulnerable:', empresa.actividadVulnerable ? 'SÍ' : 'NO');
    drawRow('Registro REPSE:', empresa.numeroRepse);
    drawRow('Registro Patronal IMSS:', empresa.infonavitRegistroPatronal);

    yPos -= 20;
    drawSection('Índice de Anexos Documentales Adjuntos');
    
    const drawItem = (text, hasIt) => {
      checkPageBreak(20);
      page.drawText(hasIt ? '■ ' : '□ ', { x: 50, y: yPos, size: 10, font: fontBold, color: hasIt ? primaryColor : lightGray });
      page.drawText(text, { x: 65, y: yPos, size: 10, font: fontNormal, color: darkColor });
      yPos -= 18;
    };
    
    const formatDate = (date) => date ? new Date(date).toLocaleDateString('es-MX') : '';

    drawItem(`Opinión de Cumplimiento SAT (32-D) - ${opinionSat ? 'Corte: ' + formatDate(opinionSat.fechaDocumento) : 'NO DISPONIBLE'}`, !!opinionSat);
    drawItem(`Constancia de Situación Fiscal (CSF) - ${constancia ? 'Corte: ' + formatDate(constancia.fechaDocumento) : 'NO DISPONIBLE'}`, !!constancia);
    drawItem(`Opinión de Cumplimiento IMSS - ${opinionImss ? 'Corte: ' + formatDate(opinionImss.fechaDocumento) : 'NO DISPONIBLE'}`, !!opinionImss);
    drawItem(`Opinión de Cumplimiento INFONAVIT - ${opinionInfonavit ? 'Corte: ' + formatDate(opinionInfonavit.fechaDocumento) : 'NO DISPONIBLE'}`, !!opinionInfonavit);
    drawItem(`Opinión de Cumplimiento ISN - ${opinionIsn ? 'Corte: ' + formatDate(opinionIsn.fechaDocumento) : 'NO DISPONIBLE'}`, !!opinionIsn);

    // 3. Append attachments correctly
    const appendPdf = async (docRecord) => {
      if (docRecord && docRecord.archivoBase64) {
        try {
          // Robust extraction: get everything after base64,
          const b64Data = docRecord.archivoBase64.split('base64,').pop();
          if(!b64Data) return;
          const attachmentBuffer = Buffer.from(b64Data, 'base64');
          const attachmentPdf = await PDFDocument.load(attachmentBuffer);
          const copiedPages = await mainPdf.copyPages(attachmentPdf, attachmentPdf.getPageIndices());
          copiedPages.forEach((p) => mainPdf.addPage(p));
        } catch (e) {
          console.error(`Error concatenando anexo ${docRecord.tipo}:`, e);
        }
      }
    };

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
        'Content-Disposition': `attachment; filename="Dossier_Corporativo_${empresa.razonSocial || empresa.rfc}.pdf"`
      }
    });

  } catch (error) {
    console.error('Error generando expediente:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
