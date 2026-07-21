const ExcelJS = require('exceljs');
const path = require('path');

async function main() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('G:\\dev\\jr\\jringenieria\\src\\assets\\templates\\CRONOGRAMA TRABAJO LOS CABOS BC 2026.xlsx');
    
    console.log('Sheets:');
    workbook.worksheets.forEach(w => console.log('-', w.name));
    
    const sheet = workbook.worksheets[0]; // Let's inspect the first sheet
    console.log('\nSheet 1 Name:', sheet.name);
    console.log('Row count:', sheet.rowCount);
    
    // Print first 40 rows, columns A to J
    for (let r = 1; r <= 60; r++) {
        const row = sheet.getRow(r);
        const vals = [];
        for (let c = 1; c <= 10; c++) {
            const cell = row.getCell(c);
            vals.push(cell.value ? (typeof cell.value === 'object' && cell.value.text ? cell.value.text : cell.value) : '');
        }
        console.log(`Row ${r}:`, vals.map(v => String(v).substring(0, 30)).join(' | '));
    }
}

main().catch(console.error);
