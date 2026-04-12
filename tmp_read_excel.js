const xlsx = require('xlsx');
const path = require('path');

const filePath = 'C:\\Users\\barca\\Downloads\\datos_constancias_fiscales.xlsx';
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

console.log("Headers:");
console.log(JSON.stringify(data[0], null, 2));

console.log("First Row Data:");
console.log(JSON.stringify(data[1], null, 2));
