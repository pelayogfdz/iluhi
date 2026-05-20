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
    
    const darkColor = rgb(15/255, 23/255, 42/255);
    const grayColor = rgb(100/255, 116/255, 139/255);
    
    let yPos = 800;
    
    page.drawText('EXPEDIENTE CORPORATIVO', { x: 50, y: yPos, size: 24, font: helveticaBold, color: darkColor });
    yPos -= 25;
    page.drawText('Documento generado automáticamente por SEIT Facturación', { x: 50, y: yPos, size: 10, font: helvetica, color: grayColor });
    yPos -= 50;
    
    const drawRow = (label, value) => {
      page.drawText(label, { x: 50, y: yPos, size: 10, font: helveticaBold, color: darkColor });
      page.drawText(String(value || 'N/A'), { x: 200, y: yPos, size: 10, font: helvetica, color: darkColor });
      yPos -= 20;
    };
    
    drawRow('Razón Social:', empresa.razonSocial);
    drawRow('RFC:', empresa.rfc);
    drawRow('Régimen Fiscal:', empresa.regimenFiscal);
    drawRow('Código Postal:', empresa.codigoPostal);
    drawRow('Actividad Económica:', empresa.actividadEconomica);
    drawRow('Actividad Vulnerable:', empresa.actividadVulnerable ? 'SÍ' : 'NO');
    drawRow('Representante Legal:', empresa.representanteLegal);
    drawRow('ID REPSE:', empresa.idRepse);
    
    yPos -= 40;
    
    page.drawText('ÍNDICE DE ANEXOS ADJUNTOS', { x: 50, y: yPos, size: 14, font: helveticaBold, color: darkColor });
    yPos -= 25;
    
    const drawItem = (text) => {
      page.drawText('• ' + text, { x: 50, y: yPos, size: 10, font: helvetica, color: darkColor });
      yPos -= 15;
    };
    
    drawItem(opinionSat ? `Opinión de Cumplimiento SAT (32-D) - Fecha: ${opinionSat.fechaDocumento.toISOString().split('T')[0]}` : 'Opinión de Cumplimiento SAT (32-D) - NO DISPONIBLE');
    drawItem(constancia ? `Constancia de Situación Fiscal (CSF) - Fecha: ${constancia.fechaDocumento.toISOString().split('T')[0]}` : 'Constancia de Situación Fiscal (CSF) - NO DISPONIBLE');
    drawItem(opinionImss ? `Opinión de Cumplimiento IMSS - Fecha: ${opinionImss.fechaDocumento.toISOString().split('T')[0]}` : 'Opinión de Cumplimiento IMSS - NO DISPONIBLE');
    drawItem(opinionInfonavit ? `Opinión de Cumplimiento INFONAVIT - Fecha: ${opinionInfonavit.fechaDocumento.toISOString().split('T')[0]}` : 'Opinión de Cumplimiento INFONAVIT - NO DISPONIBLE');
    drawItem(opinionIsn ? `Opinión de Cumplimiento ISN - Fecha: ${opinionIsn.fechaDocumento.toISOString().split('T')[0]}` : 'Opinión de Cumplimiento ISN - NO DISPONIBLE');

    // 3. Append attachments
    const appendPdf = async (docRecord) => {
      if (docRecord && docRecord.archivoBase64) {
        try {
          const attachmentBuffer = Buffer.from(docRecord.archivoBase64, 'base64');
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
