import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Expense, ExpenseCatalogs } from './models/expenses.types';
import { saveAs } from 'file-saver';
import moment from 'moment';

@Injectable({ providedIn: 'root' })
export class ExpensesExcelService {

    constructor(private _http: HttpClient) {}

     /**
     * Genera y descarga el reporte de gastos en formato XLSX
     * basado en el template oficial "Reporte_Gastos.xlsx"
     *
     * Estructura del template (sheet "Reporte de Gastos"):
     *   - Tabla: B6:N68  (13 columnas, datos desde fila 7)
     *   - Columnas de datos: B=Fecha, C=Tipo Flujo, D=Concepto, E=Lugar/Proveedor,
     *     F=No.Integrantes, G=Nombre Participantes, H=Proyecto/Sucursal,
     *     I=FormaPago, J=Facturado?, K=Folio/UUID,
     *     L=Ingreso(+), M=Gasto(-), N=SaldoLíquido(fórmula)
     */
    async downloadReporteGastos(
        expenses: Expense[],
        catalogs: ExpenseCatalogs,
        unidadesNegocio: any[],
        filtro?: { mes?: string; anio?: string; unidad?: string },
        nombreUsuario?: string   // Nombre ya resuelto desde el componente
    ): Promise<void> {

        const periodoLabel = this._buildPeriodoLabel(expenses, filtro);
        // Usar la sucursal que viene del filtro o del componente directamente
        const unidadLabel = filtro?.unidad && filtro.unidad.trim() ? filtro.unidad.trim() : 'General';
        // Usar el nombre pasado desde el componente; si no, intentar localStorage
        const nombre = nombreUsuario && nombreUsuario !== 'N/A'
            ? nombreUsuario
            : this._resolveNombreFromStorage();

        // Construir URL del template relativa al baseHref de la app
        const baseHref = document.querySelector('base')?.getAttribute('href') || '/';
        const templateUrl = `${baseHref}assets/templates/template_excel.xlsx`.replace('//', '/');

        // Cargar el template desde assets como ArrayBuffer
        const templateBuffer = await this._http
            .get(templateUrl, { responseType: 'arraybuffer' })
            .toPromise();

        // Importación dinámica de ExcelJS (lazy-load para reducir bundle inicial)
        const excelJsModule = await import('exceljs');
        const ExcelJS = (excelJsModule as any).default ?? excelJsModule;

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(templateBuffer);

        // Obtener la hoja "Reporte de Gastos"
        const sheet = workbook.getWorksheet('Reporte de Gastos');
        if (!sheet) {
            console.error('No se encontró la hoja "Reporte de Gastos"');
            alert('Error: no se encontró la hoja en el template.');
            return;
        }

        // ─── Encabezado del reporte (fuera de la tabla, filas 1-5) ──────────────
        const puesto = this._resolvePuestoFromStorage();
        this._setCellValue(sheet, 'C2', nombre);           // Nombre del Colaborador (C2)
        this._setCellValue(sheet, 'H2', puesto);           // Puesto (H2)
        this._setCellValue(sheet, 'J2', unidadLabel);      // Área / Sucursal (J2)
        
        this._setCellValue(sheet, 'H3', periodoLabel);     // Periodo del Reporte (H3)
        
        // Fecha de Envío (J3) = Fecha en que se genera el reporte
        const cellFechaEnvio = sheet.getCell('J3');
        cellFechaEnvio.value = new Date();
        cellFechaEnvio.numFmt = 'DD/MM/YYYY';

        const reporteNum = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        this._setCellValue(sheet, 'H4', reporteNum);       // No. de reporte (H4)

        // ─── Limpiar filas de muestra del template (filas 7 y 8) ────────────────
        const DATA_START_ROW = 7;
        const DEFAULT_CAPACITY = 62;
        const totalRowsNeeded = expenses.length;

        // ─── Insertar filas extra si se necesitan más de 62 ─────────────────────
        if (totalRowsNeeded > DEFAULT_CAPACITY) {
            const rowsToInsert = totalRowsNeeded - DEFAULT_CAPACITY;
            for (let i = 0; i < rowsToInsert; i++) {
                sheet.insertRow(68 + i, []);
            }
        }

        // ─── Aplicar formato alternado a TODAS las filas de datos ───────────────
        // IMPORTANTE: Para que ExcelJS sobreescriba el fill de filas existentes del template
        // es necesario reasignar el objeto `cell.style` completo (no solo cell.fill).
        const WHITE_FILL: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        const GRAY_FILL:  any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };

        const totalRows = Math.max(DEFAULT_CAPACITY, totalRowsNeeded);
        for (let i = 0; i < totalRows; i++) {
            const rowNumber = DATA_START_ROW + i;
            const row = sheet.getRow(rowNumber);
            const fillToApply = (i % 2 === 0) ? WHITE_FILL : GRAY_FILL;

            for (let colIdx = 1; colIdx <= 14; colIdx++) {
                const cell = row.getCell(colIdx);
                // Leer el estilo actual, sobreescribir el fill y reasignar el objeto completo
                // para que ExcelJS lo marque como "dirty" y lo escriba en el XML de salida.
                const currentStyle = JSON.parse(JSON.stringify(cell.style || {}));
                currentStyle.fill = fillToApply;
                cell.style = currentStyle;
                // Columna N: asegurar fórmula acumulada
                if (colIdx === 14 && rowNumber > DATA_START_ROW) {
                    cell.value = { formula: `=N${rowNumber - 1}+L${rowNumber}-M${rowNumber}` };
                }
            }
        }

        const DATA_END_ROW = 7 + Math.max(DEFAULT_CAPACITY, totalRowsNeeded) - 1;

        for (let r = DATA_START_ROW; r <= DATA_END_ROW; r++) {
            // Limpiamos de la B a la M. Omitimos la N porque contiene la fórmula del Saldo Líquido
            ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'].forEach(col => {
                try { sheet.getCell(`${col}${r}`).value = null; } catch (_) {}
            });
        }

        // ─── Insertar datos de gastos ────────────────────────────────────────────
        expenses.forEach((expense, idx) => {
            const row = DATA_START_ROW + idx;

            const proveedorNombre = this._getProveedorNombre(expense, catalogs);
            const formaPagoNombre = catalogs?.formasPago?.find(f => f.formaPagoId === expense.formaPagoId)?.nombre || '';
            const conceptoNombre  = catalogs?.conceptos?.find(c => c.conceptoId === expense.conceptoId)?.nombre || '';
            const descripcion     = [conceptoNombre, expense.nombreGasto].filter(x => x?.trim()).join(' - ');

            // Sucursal: resolver por unidadId con múltiples fallbacks
            const unidadNombre = this._resolveUnidad(expense.unidadId, unidadesNegocio);

            const esFecha = expense.fecha && moment(expense.fecha).isValid();
            const fechaDate = esFecha ? moment(expense.fecha).toDate() : null;

            const tipoFlujo = expense.tipoMovimiento === 1 ? 'Ingreso'
                            : expense.tipoMovimiento === 2 ? 'Gasto'
                            : expense.esIngreso           ? 'Ingreso' : 'Gasto';

            const facturado = (expense.factura && expense.factura.trim()) ? 'Sí' : 'No';
            const esIngreso = tipoFlujo === 'Ingreso';
            const monto = expense.cantidad || 0;

            // B: Fecha
            if (fechaDate) {
                const cell = sheet.getCell(`B${row}`);
                cell.value = fechaDate;
                cell.numFmt = 'DD/MM/YYYY';
            }
            this._setCellValue(sheet, `C${row}`, tipoFlujo);       // Tipo Flujo
            this._setCellValue(sheet, `D${row}`, descripcion);      // Concepto
            this._setCellValue(sheet, `E${row}`, proveedorNombre);  // Lugar/Proveedor
            // F (No. integrantes) y G (Nombre participantes) → no aplica
            this._setCellValue(sheet, `H${row}`, unidadNombre);     // Proyecto/Sucursal
            this._setCellValue(sheet, `I${row}`, formaPagoNombre);  // Forma de Pago
            this._setCellValue(sheet, `J${row}`, facturado);        // ¿Facturado?
            this._setCellValue(sheet, `K${row}`, expense.folioFiscal || expense.factura || ''); // Folio/UUID
            
            // En el nuevo formato: L = Ingreso (+), M = Gasto (-)
            if (esIngreso) {
                this._setCellValue(sheet, `L${row}`, monto);        // Ingreso (+)
            } else {
                this._setCellValue(sheet, `M${row}`, monto);        // Gasto (-)
            }
            // N (Saldo Líquido) → fórmula del template, no se modifica
        });

        // ─── Limpiar datos de muestra en columnas fuera de la tabla ─────────────
        ['R3', 'R4', 'R5', 'R6', 'R7', 'R8'].forEach(addr => {
            try { sheet.getCell(addr).value = null; } catch (_) {}
        });

        // ─── Generar buffer y descargar ──────────────────────────────────────────
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer as ArrayBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        const safePeriodo = periodoLabel.replace(/[\s\/\\:*?"<>|]/g, '_');
        const fileName = `Reporte_Gastos_${unidadLabel}_${safePeriodo}.xlsx`;
        saveAs(blob, fileName);
    }

    // ─── Helpers privados ────────────────────────────────────────────────────────

    private _setCellValue(sheet: any, address: string, value: any): void {
        try { sheet.getCell(address).value = value; } catch (_) {}
    }

    /**
     * Intenta resolver el nombre del usuario desde localStorage con múltiples
     * variantes de propiedad (compatible con distintos backends).
     */
    private _resolveNombreFromStorage(): string {
        try {
            const info = JSON.parse(localStorage.getItem('userInformation') || '{}');
            const user = info.usuario || info || {};
            const partes = [user.nombre, user.apellidoPaterno, user.apellidoMaterno].filter(Boolean);
            if (partes.length > 0) return partes.join(' ');
            return user.nombreCompleto || user.fullName || user.displayName
                || user.nombreUsuario || user.email || 'N/A';
        } catch {
            return 'N/A';
        }
    }

    /**
     * Intenta obtener el puesto o cargo del usuario logueado en la sesión
     */
    private _resolvePuestoFromStorage(): string {
        try {
            const info = JSON.parse(localStorage.getItem('userInformation') || '{}');
            const user = info.usuario || info || {};
            return user.puesto || user.cargo || 'Supervisor de obra';
        } catch {
            return 'Supervisor de obra';
        }
    }

    /**
     * Resuelve el nombre de la unidad/sucursal con múltiples estrategias:
     * 1. Busca por `id` (campo que usa el componente de gastos)
     * 2. Busca por `unidadId` (campo alternativo)
     * 3. Fallbacks estáticos para las unidades conocidas
     */
    private _resolveUnidad(unidadId: number, unidades: any[]): string {
        if (!unidadId) return '';
        if (unidades?.length > 0) {
            const found = unidades.find(u =>
                u.id === unidadId || u.unidadId === unidadId
            );
            if (found?.nombre) return found.nombre;
        }
        // Fallbacks estáticos (mismos que el componente)
        if (unidadId === 1) return 'Querétaro';
        if (unidadId === 2) return 'Puebla';
        if (unidadId === 3) return 'Hidalgo';
        return '';
    }

    private _buildPeriodoLabel(expenses: Expense[], filtro?: any): string {
        if (filtro?.mes && filtro?.anio) {
            const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                           'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            return `${meses[parseInt(filtro.mes)] || filtro.mes} ${filtro.anio}`;
        }
        const fechasValidas = (expenses || []).filter(e => e.fecha && moment(e.fecha).isValid());
        if (fechasValidas.length > 0) {
            const momentos = fechasValidas.map(e => moment(e.fecha));
            const min = moment.min(momentos);
            const max = moment.max(momentos);
            if (min.isSame(max, 'month')) return min.format('MMMM YYYY');
            return `${min.format('DD-MM-YYYY')} al ${max.format('DD-MM-YYYY')}`;
        }
        return moment().format('MMMM YYYY');
    }

    private _getProveedorNombre(expense: Expense, catalogs: ExpenseCatalogs): string {
        const p = expense.proveedor;
        if (!p) return expense.gastoProveedor?.nombre || '';
        if (typeof p === 'string') return p;
        if (typeof p === 'number') return catalogs?.proveedores?.find(x => x.proveedorId === p)?.nombre || '';
        return p.nombre || '';
    }
}
