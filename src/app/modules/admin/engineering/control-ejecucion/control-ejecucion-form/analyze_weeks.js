const ExcelJS = require('exceljs');

async function main() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('G:\\dev\\jr\\jringenieria\\src\\assets\\templates\\CRONOGRAMA TRABAJO LOS CABOS BC 2026.xlsx');
    const sheet = workbook.worksheets[0];
    
    // Let's dump all rows from 12 to 229, showing row number, cell values (columns 1 to 5), and which columns (6-100) are filled with yellow 'FFFFFF00'
    for (let r = 12; r <= 235; r++) {
        const row = sheet.getRow(r);
        const nameCellVal = row.getCell(1).value || row.getCell(2).value || row.getCell(3).value || row.getCell(4).value;
        const name = nameCellVal ? (typeof nameCellVal === 'object' && nameCellVal.text ? nameCellVal.text : String(nameCellVal)) : '';
        
        const yellowWeeks = [];
        const otherFilled = [];
        for (let c = 6; c <= 100; c++) {
            const cell = row.getCell(c);
            if (cell.fill && cell.fill.type === 'pattern' && cell.fill.pattern !== 'none') {
                const fg = cell.fill.fgColor;
                const argb = fg ? fg.argb : '';
                if (argb === 'FFFFFF00' || cell.value === 'X') {
                    yellowWeeks.push(c - 5); // Week number starting at 1
                } else {
                    otherFilled.push(c - 5);
                }
            }
        }
        
        if (name || yellowWeeks.length > 0) {
            console.log(`Row ${r}: Name=[${name.substring(0, 45)}] | YellowWeeks=${JSON.stringify(yellowWeeks)} | OtherFilled=${JSON.stringify(otherFilled)}`);
        }
    }
}

main().catch(console.error);
