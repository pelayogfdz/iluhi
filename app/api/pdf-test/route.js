import { NextResponse } from 'next/server';
import PdfPrinter from 'pdfmake';

export async function GET() {
  try {
    const fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };
    const printer = new PdfPrinter(fonts);
    return NextResponse.json({ success: true, message: 'pdfmake works!' });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message, stack: e.stack });
  }
}
