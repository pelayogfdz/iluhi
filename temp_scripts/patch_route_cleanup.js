const fs = require('fs');

const routePath = 'app/api/cron-processor/route.js';
let content = fs.readFileSync(routePath, 'utf8');

const importStatement = `import { generateCotizacionPdf, generateOrdenServicioPdf } from '../../../lib/pdfGenerator'`;

const startMarker = 'function getPdfFonts() {';
const endMarker = 'function processTemplate(template, cliente, factura) {';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const originalSection = content.substring(startIndex, endIndex);
    content = content.replace(originalSection, '');
    
    // add import at top if not there
    if (!content.includes('pdfGenerator')) {
       content = importStatement + '\\n' + content;
    }
    
    fs.writeFileSync(routePath, content);
    console.log('Successfully removed duplicate PDF logic and added import');
} else {
    console.log('Could not find markers');
}
