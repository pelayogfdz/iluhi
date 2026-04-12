const xlsx = require('xlsx');

try {
  const workbook = xlsx.readFile('C:\\Users\\barca\\Downloads\\EMPRESAS_SEIT_CSF.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);

  if (data.length > 0) {
    console.log("Headers:");
    console.log(Object.keys(data[0]));
    console.log("\nSample Row 1:");
    console.log(data[0]);
  } else {
    console.log("Archivo Excel vacío o sin formato reconocido.");
  }
} catch (error) {
  console.error("Error al leer Excel:", error);
}
