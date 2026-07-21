const ExcelJS = require('exceljs');

async function main() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('G:\\dev\\jr\\jringenieria\\src\\assets\\templates\\CRONOGRAMA TRABAJO LOS CABOS BC 2026.xlsx');
    const sheet = workbook.worksheets[0];
    
    // We want to see how the Gantt schedule (bars/fill colors) is represented in the columns from 6 onwards.
    // For rows 17 to 28, check columns 6 to 30. If any cell has a fill, print it.
    for (let r = 17; r <= 35; r++) {
        const row = sheet.getRow(r);
        const nameCell = row.getCell(1).value || row.getCell(2).value || row.getCell(3).value || row.getCell(4).value;
        const name = nameCell ? (typeof nameCell === 'object' && nameCell.text ? nameCell.text : String(nameCell)) : '';
        
        const filledCols = [];
        for (let c = 6; c <= 40; c++) {
            const cell = row.getCell(c);
            // Check if cell is styled (filled) or has a value
            if (cell.fill && cell.fill.type === 'pattern' && cell.fill.pattern !== 'none') {
                const fgColor = cell.fill.fgColor;
                const argb = fgColor ? (fgColor.argb || (fgColor.theme !== undefined ? `theme:${fgColor.theme}` : '')) : '';
                filledCols.push({ col: c, argb });
            }
        }
        if (filledCols.length > 0) {
            console.log(`Row ${r} (${name.substring(0, 30)}):`, filledCols.map(f => `Col${f.col}:${f.argb}`).join(' | '));
        }
    }
}

main().catch(console.error);
