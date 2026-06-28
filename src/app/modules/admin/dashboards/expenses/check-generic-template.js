const ExcelJS = require('exceljs');

async function check() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('c:/Users/chiva/Documents/jr/jringenieria/src/template/template_excel.xlsx');
    const sheet = workbook.worksheets[0];
    sheet.eachRow((row, rowNumber) => {
        const vals = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
            if (cell.value) vals.push(`${cell.address}: ${JSON.stringify(cell.value)}`);
        });
        if (vals.length > 0) {
            console.log(`Row ${rowNumber}:`, vals.join(' | '));
        }
    });
}
check();
