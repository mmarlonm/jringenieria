const ExcelJS = require('exceljs');

async function main() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('G:\\dev\\jr\\jringenieria\\src\\assets\\templates\\CRONOGRAMA TRABAJO LOS CABOS BC 2026.xlsx');
    const sheet = workbook.worksheets[0];
    
    // We want to find the row that has "resumen de partidas"
    for (let r = 1; r <= 300; r++) {
        const row = sheet.getRow(r);
        const col1Val = row.getCell(1).value;
        const col2Val = row.getCell(2).value;
        const col3Val = row.getCell(3).value;
        
        const rowStr = [col1Val, col2Val, col3Val].map(v => v ? String(v) : '').join(' ');
        if (rowStr.toLowerCase().includes('resumen de partidas')) {
            console.log(`Found "resumen de partidas" at row ${r}`);
        }
        
        // If it contains "CAMPO", let's inspect
        if (rowStr.includes('CAMPO')) {
            console.log(`Row ${r} mentions CAMPO:`, {
                c1: col1Val,
                c2: col2Val,
                c3: col3Val
            });
        }
    }
}

main().catch(console.error);
