const ExcelJS = require('exceljs');

async function main() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('G:\\dev\\jr\\jringenieria\\src\\assets\\templates\\CRONOGRAMA TRABAJO LOS CABOS BC 2026.xlsx');
    const sheet = workbook.worksheets[0];
    
    // Let's dump rows 12 to 35 fully with cells A, B, C, D, E, F, G, H, I, J, K, L, M, N, O
    for (let r = 12; r <= 35; r++) {
        const row = sheet.getRow(r);
        const cells = [];
        for (let c = 1; c <= 20; c++) {
            const cell = row.getCell(c);
            cells.push({
                col: c,
                val: cell.value
            });
        }
        console.log(`Row ${r}:`, cells.filter(x => x.val !== null).map(x => `Col${x.col}: [${JSON.stringify(x.val)}]`).join(' | '));
    }
}

main().catch(console.error);
