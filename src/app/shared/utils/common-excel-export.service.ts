import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { saveAs } from 'file-saver';

@Injectable({ providedIn: 'root' })
export class CommonExcelExportService {

    constructor(private _http: HttpClient) {}

    /**
     * Exporta cualquier conjunto de cabeceras y filas a un archivo XLSX utilizando
     * la plantilla premium 'template_excel.xlsx'
     *
     * @param filename Nombre del archivo final sin extensión
     * @param headers Array de títulos de columnas
     * @param rows Array bidimensional con los valores de las celdas
     */
    async exportTableToExcel(filename: string, headers: string[], rows: any[][]): Promise<void> {
        // 1. Obtener datos del colaborador en sesión
        let nombre = 'N/A';
        let puesto = 'Supervisor de obra';
        let sucursal = 'General';

        try {
            const info = JSON.parse(localStorage.getItem('userInformation') || '{}');
            const user = info.usuario || info || {};
            const partes = [user.nombre, user.apellidoPaterno, user.apellidoMaterno].filter(Boolean);
            if (partes.length > 0) {
                nombre = partes.join(' ');
            } else {
                nombre = user.nombreCompleto || user.fullName || user.displayName || user.nombreUsuario || user.email || 'N/A';
            }
            puesto = user.puesto || user.cargo || 'Supervisor de obra';
            const branch = user.unidadNegocio?.nombre || user.sucursal || info.unidadNegocio?.nombre;
            if (branch) sucursal = branch;
        } catch (_) {}

        // 2. Construir URL del template
        const baseHref = document.querySelector('base')?.getAttribute('href') || '/';
        const templateUrl = `${baseHref}assets/templates/template_excel.xlsx`.replace('//', '/');

        // 3. Cargar el template como ArrayBuffer
        const templateBuffer = await this._http
            .get(templateUrl, { responseType: 'arraybuffer' })
            .toPromise();

        // 4. Importar dinámicamente ExcelJS
        const excelJsModule = await import('exceljs');
        const ExcelJS = (excelJsModule as any).default ?? excelJsModule;

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(templateBuffer);

        const sheet = workbook.getWorksheet('Reporte de Gastos') || workbook.worksheets[0];
        if (!sheet) {
            console.error('No se pudo abrir la hoja de la plantilla');
            return;
        }

        // 5. Rellenar encabezado del usuario
        this._setCellValue(sheet, 'C2', nombre);           // Nombre
        this._setCellValue(sheet, 'H2', puesto);           // Puesto
        this._setCellValue(sheet, 'J2', sucursal);         // Sucursal
        
        // Fecha de Envío (J3) = Fecha de generación del reporte
        const cellFechaEnvio = sheet.getCell('J3');
        cellFechaEnvio.value = new Date();
        cellFechaEnvio.numFmt = 'DD/MM/YYYY';

        // 6. Eliminar firmas fijas del template original en fila 72 y 73
        try {
            ['C72', 'I72', 'L72', 'C73', 'I73', 'L73'].forEach(addr => {
                sheet.getCell(addr).value = null;
            });
        } catch (_) {}

        // 7. Escribir cabeceras de la tabla en fila 6 (comenzando en Columna B)
        headers.forEach((header, index) => {
            const colLetter = this._getColumnLetter(2 + index); // 2 = Columna B
            const cell = sheet.getCell(`${colLetter}6`);
            cell.value = header;
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // Mantener fuente blanca de la plantilla
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1F4E79' } // Fondo azul oscuro premium de la plantilla
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });

        // 8. Escribir filas de datos (comenzando en Fila 7, Columna B)
        rows.forEach((row, rowIndex) => {
            const rowNumber = 7 + rowIndex;
            row.forEach((value, colIndex) => {
                const colLetter = this._getColumnLetter(2 + colIndex);
                const cell = sheet.getCell(`${colLetter}${rowNumber}`);
                
                // Formatear valores
                if (value instanceof Date) {
                    cell.value = value;
                    cell.numFmt = 'DD/MM/YYYY';
                } else if (typeof value === 'number') {
                    cell.value = value;
                    // Detectar si parece moneda o decimal
                    if (headers[colIndex]?.toLowerCase().includes('monto') || 
                        headers[colIndex]?.toLowerCase().includes('total') || 
                        headers[colIndex]?.toLowerCase().includes('precio')) {
                        cell.numFmt = '$#,##0.00';
                    }
                } else {
                    cell.value = value;
                }

                // Bordes sutiles y alineación
                cell.border = {
                    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                };
                cell.alignment = { 
                    vertical: 'middle', 
                    horizontal: typeof value === 'number' ? 'right' : 'left' 
                };
            });
        });

        // 9. Colocar firmas dinámicamente al final del listado
        const signatureLineRow = 7 + rows.length + 3;
        const signatureLabelRow = signatureLineRow + 1;

        sheet.getCell(`C${signatureLineRow}`).value = '_______________________________';
        sheet.getCell(`I${signatureLineRow}`).value = '_______________________________';
        sheet.getCell(`L${signatureLineRow}`).value = '_______________________________';

        sheet.getCell(`C${signatureLabelRow}`).value = 'Elaboró (Responsable en Campo)';
        sheet.getCell(`I${signatureLabelRow}`).value = 'Revisó (Administración / Sucursal)';
        sheet.getCell(`L${signatureLabelRow}`).value = 'Autorizó (Dirección General)';

        // Centrar las firmas y etiquetas
        ['C', 'I', 'L'].forEach(col => {
            sheet.getCell(`${col}${signatureLineRow}`).alignment = { horizontal: 'center' };
            sheet.getCell(`${col}${signatureLabelRow}`).alignment = { horizontal: 'center' };
            sheet.getCell(`${col}${signatureLabelRow}`).font = { size: 9, italic: true };
        });

        // Auto-ajustar el ancho de las columnas ocupadas
        sheet.columns.forEach((column, i) => {
            if (i >= 1 && i <= headers.length) { // Solo columnas B en adelante
                let maxLength = 0;
                column.eachCell({ includeEmpty: true }, (cell) => {
                    if (cell.value) {
                        const len = cell.value.toString().length;
                        if (len > maxLength) maxLength = len;
                    }
                });
                column.width = Math.min(Math.max(maxLength + 3, 12), 45); // Límites razonables
            }
        });

        // 10. Descargar archivo
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer as ArrayBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        const safeFilename = filename.replace(/[\s\/\\:*?"<>|]/g, '_');
        saveAs(blob, `${safeFilename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    private _setCellValue(sheet: any, address: string, value: any): void {
        try { sheet.getCell(address).value = value; } catch (_) {}
    }

    private _getColumnLetter(colIndex: number): string {
        let temp = 0;
        let letter = '';
        while (colIndex > 0) {
            temp = (colIndex - 1) % 26;
            letter = String.fromCharCode(65 + temp) + letter;
            colIndex = ((colIndex - temp - 1) / 26) | 0;
        }
        return letter;
    }
}
