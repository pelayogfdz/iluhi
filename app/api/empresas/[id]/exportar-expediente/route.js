import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { PDFDocument } from 'pdf-lib';
const PdfPrinter = require('pdfmake');

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

    // 1. Generate Cover PDF using pdfmake
    const fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };

    const printer = new PdfPrinter(fonts);

    const docDefinition = {
      defaultStyle: { font: 'Helvetica', fontSize: 10, color: '#333333' },
      content: [
        {
          text: 'EXPEDIENTE CORPORATIVO',
          fontSize: 24,
          bold: true,
          alignment: 'center',
          color: '#0f172a',
          margin: [0, 0, 0, 10]
        },
        {
          text: 'Documento generado automáticamente por SEIT Facturación',
          fontSize: 10,
          alignment: 'center',
          color: '#64748b',
          margin: [0, 0, 0, 40]
        },
        {
          table: {
            widths: ['30%', '70%'],
            body: [
              [
                { text: 'Razón Social:', bold: true, fillColor: '#f1f5f9', margin: [5, 5, 5, 5] },
                { text: empresa.razonSocial || 'N/A', margin: [5, 5, 5, 5] }
              ],
              [
                { text: 'RFC:', bold: true, fillColor: '#f1f5f9', margin: [5, 5, 5, 5] },
                { text: empresa.rfc || 'N/A', margin: [5, 5, 5, 5] }
              ],
              [
                { text: 'Régimen Fiscal:', bold: true, fillColor: '#f1f5f9', margin: [5, 5, 5, 5] },
                { text: empresa.regimenFiscal || 'N/A', margin: [5, 5, 5, 5] }
              ],
              [
                { text: 'Código Postal:', bold: true, fillColor: '#f1f5f9', margin: [5, 5, 5, 5] },
                { text: empresa.codigoPostal || 'N/A', margin: [5, 5, 5, 5] }
              ],
              [
                { text: 'Actividad Económica:', bold: true, fillColor: '#f1f5f9', margin: [5, 5, 5, 5] },
                { text: empresa.actividadEconomica || 'N/A', margin: [5, 5, 5, 5] }
              ],
              [
                { text: 'Actividad Vulnerable:', bold: true, fillColor: '#f1f5f9', margin: [5, 5, 5, 5] },
                { text: empresa.actividadVulnerable ? 'SÍ' : 'NO', margin: [5, 5, 5, 5] }
              ],
              [
                { text: 'Representante Legal:', bold: true, fillColor: '#f1f5f9', margin: [5, 5, 5, 5] },
                { text: empresa.representanteLegal || 'N/A', margin: [5, 5, 5, 5] }
              ],
              [
                { text: 'ID REPSE:', bold: true, fillColor: '#f1f5f9', margin: [5, 5, 5, 5] },
                { text: empresa.idRepse || 'N/A', margin: [5, 5, 5, 5] }
              ]
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 40]
        },
        {
          text: 'ÍNDICE DE ANEXOS ADJUNTOS',
          fontSize: 14,
          bold: true,
          color: '#0f172a',
          margin: [0, 0, 0, 15]
        },
        {
          ul: [
            opinionSat ? `Opinión de Cumplimiento SAT (32-D) - Fecha: ${opinionSat.fechaDocumento.toISOString().split('T')[0]}` : 'Opinión de Cumplimiento SAT (32-D) - NO DISPONIBLE',
            constancia ? `Constancia de Situación Fiscal (CSF) - Fecha: ${constancia.fechaDocumento.toISOString().split('T')[0]}` : 'Constancia de Situación Fiscal (CSF) - NO DISPONIBLE',
            opinionImss ? `Opinión de Cumplimiento IMSS - Fecha: ${opinionImss.fechaDocumento.toISOString().split('T')[0]}` : 'Opinión de Cumplimiento IMSS - NO DISPONIBLE',
            opinionInfonavit ? `Opinión de Cumplimiento INFONAVIT - Fecha: ${opinionInfonavit.fechaDocumento.toISOString().split('T')[0]}` : 'Opinión de Cumplimiento INFONAVIT - NO DISPONIBLE',
            opinionIsn ? `Opinión de Cumplimiento ISN - Fecha: ${opinionIsn.fechaDocumento.toISOString().split('T')[0]}` : 'Opinión de Cumplimiento ISN - NO DISPONIBLE',
          ]
        }
      ]
    };

    const pdfDocGenerator = printer.createPdfKitDocument(docDefinition);
    
    const coverBuffer = await new Promise((resolve, reject) => {
      const chunks = [];
      pdfDocGenerator.on('data', chunk => chunks.push(chunk));
      pdfDocGenerator.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDocGenerator.on('error', reject);
      pdfDocGenerator.end();
    });

    // 2. Load into pdf-lib
    const mainPdf = await PDFDocument.load(coverBuffer);

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
