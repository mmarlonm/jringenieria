const ExcelJS = require('exceljs');

async function main() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('G:\\dev\\jr\\jringenieria\\src\\assets\\templates\\CRONOGRAMA TRABAJO LOS CABOS BC 2026.xlsx');
    const sheet = workbook.worksheets[0];
    
    // We want to see how the Gantt schedule (bars/fill colors) is represented in the columns from 6 onwards.
    // Let's print rows 10 to 30. For each cell, print the row number and the cell values (columns 1 to 5).
    for (let r = 12; r <= 35; r++) {
        const row = sheet.getRow(r);
        const col1 = row.getCell(1).value;
        const col2 = row.getCell(2).value;
        const col3 = row.getCell(3).value;
        const col4 = row.getCell(4).value;
        const col5 = row.getCell(5).value;
        console.log(`Row ${r}: Col1=[${col1}] | Col2=[${col2}] | Col3=[${col3}] | Col4=[${col4}] | Col5=[${col5}]`);
    }
}

main().catch(console.error);
