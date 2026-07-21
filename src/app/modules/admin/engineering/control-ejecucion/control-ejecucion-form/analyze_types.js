const ExcelJS = require('exceljs');

async function main() {
    const workbook = new Workbook();
    await workbook.xlsx.readFile('G:\\dev\\jr\\jringenieria\\src\\assets\\templates\\CRONOGRAMA TRABAJO LOS CABOS BC 2026.xlsx');
    const sheet = workbook.worksheets[0];
    
    // Let's print rows 10 to 30. For each row, print the first cell that has a value, its column index, and the row height.
    for (let r = 10; r <= 35; r++) {
        const row = sheet.getRow(r);
        const nonNulls = [];
        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            nonNulls.push({ col: colNumber, val: cell.value, type: typeof cell.value });
        });
        
        console.log(`Row ${r}:`, nonNulls.map(n => `Col${n.col}: [${JSON.stringify(n.val).substring(0, 40)}] (${n.type})`).join(' | '));
    }
}

const Workbook = ExcelJS.Workbook;
main().catch(console.error);
