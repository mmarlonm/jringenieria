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
     * basado en el template oficial "FORMATO OFICAL REPORTE DE GASTOS.xlsx"
     *
     * Estructura del template (sheet "Reporte de Gastos"):
     *   - Tabla: B6:O68  (14 columnas, datos desde fila 7)
     *   - Columnas: B=Fecha, C=Tipo Flujo, D=Concepto, E=Lugar/Proveedor,
     *     F=No.Integrantes, G=Nombre Participantes, H=Proyecto/Sucursal,
     *     I=FormaPago, J=Facturado?, K=Folio/UUID, L=MontoIndividual(fórmula),
     *     M=Ingreso(+), N=Gasto(-), O=SaldoLíquido(fórmula)
     */
    async downloadReporteGastos(
        expenses: Expense[],
        catalogs: ExpenseCatalogs,
        unidadesNegocio: any[],
        filtro?: { mes?: string; anio?: string; unidad?: string }
    ): Promise<void> {

        const userInfo = this._getUserInfo();
        const periodoLabel = this._buildPeriodoLabel(expenses, filtro);
        const unidadLabel = this._buildUnidadLabel(unidadesNegocio, userInfo.unidadId, filtro?.unidad);

        // Construir URL del template relativa al baseHref de la app
        const baseHref = document.querySelector('base')?.getAttribute('href') || '/';
        const templateUrl = `${baseHref}assets/templates/reporte-gastos-template.xlsx`.replace('//', '/');

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
            alert('Error: no se encontró la hoja en el template. Verifique el archivo.');
            return;
        }

        // ─── Encabezado del reporte (fuera de la tabla) ──────────────────────────
        // J3 = Nombre del empleado
        this._setCellValue(sheet, 'J3', userInfo.nombre);
        // H4 = Puesto
        this._setCellValue(sheet, 'H4', userInfo.puesto || 'N/A');
        // J4 = Sucursal/Unidad
        this._setCellValue(sheet, 'J4', unidadLabel);
        // P3 = Periodo
        this._setCellValue(sheet, 'P3', periodoLabel);
        // P4 = No. de reporte
        const reporteNum = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        this._setCellValue(sheet, 'P4', reporteNum);

        // ─── Limpiar filas de muestra del template (filas 7 y 8 tienen datos de ejemplo) ──
        const DATA_START_ROW = 7;
        const DATA_END_ROW = 68;

        for (let r = DATA_START_ROW; r <= DATA_END_ROW; r++) {
            ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'M', 'N'].forEach(col => {
                const cell = sheet.getCell(`${col}${r}`);
                cell.value = null;
            });
        }

        // ─── Insertar datos de gastos (máx. 62 registros) ───────────────────────
        const MAX_REGISTROS = DATA_END_ROW - DATA_START_ROW + 1;
        expenses.slice(0, MAX_REGISTROS).forEach((expense, idx) => {
            const row = DATA_START_ROW + idx;

            // --- Resolución de campos ---
            const proveedorNombre = this._getProveedorNombre(expense, catalogs);
            const formaPagoNombre = catalogs?.formasPago?.find(f => f.formaPagoId === expense.formaPagoId)?.nombre || '';
            const conceptoNombre = catalogs?.conceptos?.find(c => c.conceptoId === expense.conceptoId)?.nombre || '';
            const descripcion = [conceptoNombre, expense.nombreGasto].filter(x => x && x.trim()).join(' - ');
            const unidadNombre = unidadesNegocio?.find(u => u.id === expense.unidadId)?.nombre || '';
            const esFecha = expense.fecha && moment(expense.fecha).isValid();
            const fechaDate = esFecha ? moment(expense.fecha).toDate() : null;
            const tipoFlujo = expense.tipoMovimiento === 1 ? 'Ingreso'
                            : expense.tipoMovimiento === 2 ? 'Gasto'
                            : expense.esIngreso ? 'Ingreso' : 'Gasto';
            const facturado = (expense.factura && expense.factura.trim()) ? 'Sí' : 'No';
            const esIngreso = tipoFlujo === 'Ingreso';
            const monto = expense.cantidad || 0;

            // --- Escritura de celdas ---
            if (fechaDate) {
                const cell = sheet.getCell(`B${row}`);
                cell.value = fechaDate;
                cell.numFmt = 'DD/MM/YYYY';
            }
            this._setCellValue(sheet, `C${row}`, tipoFlujo);
            this._setCellValue(sheet, `D${row}`, descripcion);
            this._setCellValue(sheet, `E${row}`, proveedorNombre);
            // F = No. integrantes → no aplica, omitir
            // G = Nombre participantes → no aplica, omitir
            this._setCellValue(sheet, `H${row}`, unidadNombre);
            this._setCellValue(sheet, `I${row}`, formaPagoNombre);
            this._setCellValue(sheet, `J${row}`, facturado);
            this._setCellValue(sheet, `K${row}`, expense.folioFiscal || expense.factura || '');
            // L = Monto individual (fórmula del template, no tocar)
            if (esIngreso) {
                this._setCellValue(sheet, `M${row}`, monto);
            } else {
                this._setCellValue(sheet, `N${row}`, monto);
            }
            // O = Saldo Líquido (fórmula del template, no tocar)
        });

        // ─── Limpieza de saldos de muestra en columna R (datos de ejemplo) ──────
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
        try {
            sheet.getCell(address).value = value;
        } catch (_) { /* Celda fuera de rango, ignorar */ }
    }

    private _getUserInfo(): { nombre: string; puesto: string; unidadId: number } {
        try {
            const info = JSON.parse(localStorage.getItem('userInformation') || '{}');
            const user = info.usuario || {};
            const unidad = user.unidadNegocio || info.unidadNegocio || {};
            const partes = [user.nombre, user.apellidoPaterno, user.apellidoMaterno].filter(Boolean);
            const nombre = partes.length > 0 ? partes.join(' ') : (user.email || 'N/A');
            return {
                nombre,
                puesto: user.puesto || user.cargo || 'N/A',
                unidadId: unidad.id || unidad.unidadId || 0
            };
        } catch {
            return { nombre: 'N/A', puesto: 'N/A', unidadId: 0 };
        }
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
            if (min.isSame(max, 'month')) {
                return min.format('MMMM YYYY');
            }
            return `${min.format('DD-MM-YYYY')} al ${max.format('DD-MM-YYYY')}`;
        }
        return moment().format('MMMM YYYY');
    }

    private _buildUnidadLabel(unidades: any[], unidadId: number, filtroUnidad?: string): string {
        if (filtroUnidad) return filtroUnidad;
        const found = unidades?.find(u => u.id === unidadId);
        return found?.nombre || 'General';
    }

    private _getProveedorNombre(expense: Expense, catalogs: ExpenseCatalogs): string {
        const p = expense.proveedor;
        if (!p) return expense.gastoProveedor?.nombre || '';
        if (typeof p === 'string') return p;
        if (typeof p === 'number') return catalogs?.proveedores?.find(x => x.proveedorId === p)?.nombre || '';
        return p.nombre || '';
    }
}
