const ExcelJS = require('exceljs');

async function main() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('G:\\dev\\jr\\jringenieria\\src\\assets\\templates\\CRONOGRAMA TRABAJO LOS CABOS BC 2026.xlsx');
    const sheet = workbook.worksheets[0];
    
    // We want to see how the Gantt schedule is laid out cell by cell.
    // For rows 11 to 20, check cell backgrounds, borders, font styles.
    for (let r = 11; r <= 30; r++) {
        const row = sheet.getRow(r);
        const nameVal = row.getCell(3).value || row.getCell(2).value || row.getCell(1).value;
        const font = row.getCell(3).font || row.getCell(2).font || row.getCell(1).font;
        const fill = row.getCell(3).fill || row.getCell(2).fill || row.getCell(1).fill;
        const isBold = font ? !!font.bold : false;
        
        // Let's check cell indentation or merged status if possible
        const isMerged = row.getCell(1).isMerged || row.getCell(2).isMerged || row.getCell(3).isMerged;
        
        console.log(`Row ${r}: Bold=${isBold} | Merged=${isMerged} | Val=[${String(nameVal).substring(0, 40)}]`);
    }
}

main().catch(console.error);
