import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// 🔹 Highcharts
import * as Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';

// 🔹 Angular Material
import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// 🔹 Servicios
import { ReportExpensesService, DashboardReportResponse, ChartItem } from '../report-expenses.service';
import { ExpensesService } from 'app/modules/admin/dashboards/expenses/expenses.service';
import { Expense, ExpenseCatalogs } from 'app/modules/admin/dashboards/expenses/models/expenses.types';
import moment from 'moment';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
    selector: 'app-reporte-expenses-dashboard',
    standalone: true,
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    imports: [
        CommonModule,
        FormsModule,
        MatIconModule,
        HighchartsChartModule,
        MatFormFieldModule,
        MatSelectModule,
        MatInputModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatButtonModule,
        MatProgressSpinnerModule
    ]
})
export class ReportExpensesDashboardComponent implements OnInit {

    public Highcharts: typeof Highcharts = Highcharts;
    isLoading: boolean = true;

    // 🔹 Variables de Filtros (Conectados al HTML con ngModel)
    filtroAnio: number = new Date().getFullYear();
    filtroMeses: number[] = [];
    filtroAreas: string[] = [];
    filtroConceptos: string[] = [];
    filtroTipos: string[] = [];
    filtroMovimiento: string = ''; // '' = Todos, '1' = Ingresos, '2' = Egresos

    // 🔹 Opciones para Filtros (Cargadas de catálogos)
    areas: any[] = [];
    conceptos: any[] = [];
    tipos: any[] = [];

    // 🔹 Datos crudos para filtrado cruzado
    private allExpenses: Expense[] = [];
    private fullCatalogs: ExpenseCatalogs | null = null;
    private fullData: DashboardReportResponse | null = null;

    // 🔹 Datos filtrados para la tabla
    filteredExpenses: Expense[] = [];

    // 🔹 KPIs
    totalGastos: number = 0;
    totalIngresos: number = 0;
    totalEgresos: number = 0;
    balance: number = 0;
    totalTransacciones: number = 0;
    proporcionGastosVentas: number = 0;

    // 🔹 Opciones de Gráficas (Tema Claro)
    chartOptionsTiempo: Highcharts.Options = {};
    chartOptionsArea: Highcharts.Options = {};
    chartOptionsConcepto: Highcharts.Options = {};
    chartOptionsTipo: Highcharts.Options = {};
    chartOptionsMovimiento: Highcharts.Options = {};

    // 🔹 Configuración Base (Tema Claro)
    private baseTheme: Highcharts.Options = {
        chart: { backgroundColor: 'transparent' },
        title: { text: undefined },
        credits: { enabled: false },
        legend: { itemStyle: { color: '#4b5563', fontWeight: 'normal' } }, // Gris oscuro para texto
        tooltip: { backgroundColor: '#ffffff', style: { color: '#1f2937' }, borderColor: '#e5e7eb', borderRadius: 8, shadow: true }
    };

    constructor(
        private reportExpensesService: ReportExpensesService,
        private _expensesService: ExpensesService,
        private _changeDetectorRef: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.consultar();
        this._loadCatalogFilters();
    }

    private _loadCatalogFilters(): void {
        this._expensesService.getCatalogos().subscribe(cat => {
            if (cat) {
                this.fullCatalogs = cat;
                this.areas = cat.areas || [];
                this.conceptos = cat.conceptos || [];
                this.tipos = cat.tipos || [];
            }
        });
    }

    private getNombreArea(id: number, expense?: Expense): string {
        if (expense?.gastoArea) return expense.gastoArea.nombre;
        return this.fullCatalogs?.areas?.find(a => a.areaId === id)?.nombre || 'S/A';
    }

    private getNombreConcepto(id: number, expense?: Expense): string {
        if (expense?.gastoConcepto) return expense.gastoConcepto.nombre;
        return this.fullCatalogs?.conceptos?.find(c => c.conceptoId === id)?.nombre || 'S/C';
    }

    private getNombreTipo(id: number, expense?: Expense): string {
        if (expense?.gastoTipo) return expense.gastoTipo.nombre;
        return this.fullCatalogs?.tipos?.find(t => t.tipoId === id)?.nombre || 'S/T';
    }

    /**
     * Se ejecuta al cargar y al presionar el botón "Consultar"
     */
    consultar(): void {
        // Solo refrescamos localmente si ya tenemos los datos base
        if (this.allExpenses.length > 0) {
            this.applyLocalFilters();
            return;
        }

        this.isLoading = true;

        let unidadId = 1;
        try {
            const userInformation = JSON.parse(localStorage.getItem('userInformation') || '{}');
            const unidad = userInformation.usuario?.unidadNegocio || userInformation;
            unidadId = unidad.id || unidad.unidadId || 1;
        } catch (e) { }

        // Obtenemos los gastos crudos para poder hacer cross-filtering real
        this._expensesService.getExpenses(unidadId).subscribe({
            next: (expenses: Expense[]) => {
                this.allExpenses = expenses;
                this.applyLocalFilters();
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error al consultar gastos crudos:', err);
                this.isLoading = false;
            }
        });
    }

    private applyLocalFilters(): void {
        if (!this.allExpenses.length) return;

        // 1. Filtrar Lista Maestra por todos los criterios
        const filtered = this.allExpenses.filter(e => {
            const date = moment(e.fecha);
            const matchAnio = date.year() === this.filtroAnio;
            const matchMes = this.filtroMeses.length === 0 || this.filtroMeses.includes(date.month() + 1);
            const matchArea = this.filtroAreas.length === 0 || this.filtroAreas.includes(this.getNombreArea(e.areaId, e));
            const matchConcepto = this.filtroConceptos.length === 0 || this.filtroConceptos.includes(this.getNombreConcepto(e.conceptoId, e));
            const matchTipo = this.filtroTipos.length === 0 || this.filtroTipos.includes(this.getNombreTipo(e.tipoId, e));

            // Filtro de Movimiento
            const moveType = e.tipoMovimiento?.toString() || (e.esIngreso ? '1' : '2');
            const matchMovimiento = !this.filtroMovimiento || moveType === this.filtroMovimiento;

            return matchAnio && matchMes && matchArea && matchConcepto && matchTipo && matchMovimiento;
        });

        this.filteredExpenses = filtered;

        // 2. Agregación Dinámica para KPIs
        this.totalTransacciones = filtered.length;
        this.totalEgresos = filtered
            .filter(e => e.tipoMovimiento?.toString() === '2' || e.esIngreso === false)
            .reduce((acc, curr) => acc + curr.cantidad, 0);
        this.totalIngresos = filtered
            .filter(e => e.tipoMovimiento?.toString() === '1' || e.esIngreso === true)
            .reduce((acc, curr) => acc + curr.cantidad, 0);

        this.totalGastos = this.totalEgresos; // Gasto es sinónimo de Egreso en este contexto
        this.balance = this.totalIngresos - this.totalEgresos;

        // --- Gráfica Tiempo (Spline con 2 líneas) ---
        const mesesMap: { [key: number]: string } = {
            1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr', 5: 'May', 6: 'Jun',
            7: 'Jul', 8: 'Ago', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dic'
        };
        const tiempoDataIngresos: number[] = [];
        const tiempoDataEgresos: number[] = [];
        const categoriasEjeX: string[] = [];

        for (let i = 1; i <= 12; i++) {
            const sumIngresos = filtered
                .filter(e => moment(e.fecha).month() + 1 === i && (e.tipoMovimiento?.toString() === '1' || e.esIngreso === true))
                .reduce((a, b) => a + b.cantidad, 0);

            const sumEgresos = filtered
                .filter(e => moment(e.fecha).month() + 1 === i && (e.tipoMovimiento?.toString() === '2' || e.esIngreso === false))
                .reduce((a, b) => a + b.cantidad, 0);

            if (sumIngresos > 0 || sumEgresos > 0 || this.filtroMeses.length === 0) {
                categoriasEjeX.push(mesesMap[i]);
                tiempoDataIngresos.push(sumIngresos);
                tiempoDataEgresos.push(sumEgresos);
            }
        }
        // --- Preparación de Datos Agrupados (Área, Concepto, Tipo) ---
        const prepareGroupedData = (getter: (id: number, e: Expense) => string, idField: keyof Expense) => {
            const categorias = new Set<string>();
            const ingMap = new Map<string, number>();
            const egrMap = new Map<string, number>();

            filtered.forEach(e => {
                const name = getter.call(this, e[idField] as number, e);
                categorias.add(name);
                if (e.tipoMovimiento?.toString() === '1' || e.esIngreso === true) {
                    ingMap.set(name, (ingMap.get(name) || 0) + e.cantidad);
                } else {
                    egrMap.set(name, (egrMap.get(name) || 0) + e.cantidad);
                }
            });

            const catArray = Array.from(categorias).sort();
            return {
                categorias: catArray,
                ingresos: catArray.map(c => ingMap.get(c) || 0),
                egresos: catArray.map(c => egrMap.get(c) || 0)
            };
        };

        const areaGroup = prepareGroupedData(this.getNombreArea, 'areaId');
        const conceptoGroup = prepareGroupedData(this.getNombreConcepto, 'conceptoId');
        const tipoGroup = prepareGroupedData(this.getNombreTipo, 'tipoId');

        // --- Gráfica Distribución Movimiento ---
        const movimientoData = [
            { name: 'Ingresos', y: this.totalIngresos, color: '#10b981' },
            { name: 'Egresos', y: this.totalEgresos, color: '#f43f5e' }
        ];

        // 3. Re-renderizar (Forzar nuevas referencias para Highcharts)
        this.chartOptionsTiempo = this.buildChartTiempoOptions(categoriasEjeX, tiempoDataIngresos, tiempoDataEgresos);
        this.chartOptionsArea = this.buildChartGroupedOptions('Movimientos por Área', areaGroup);
        this.chartOptionsConcepto = this.buildChartGroupedOptions('Movimientos por Concepto', conceptoGroup);
        this.chartOptionsTipo = this.buildChartGroupedOptions('Movimientos por Tipo', tipoGroup);
        this.chartOptionsMovimiento = this.buildChartMovimientoOptions(movimientoData);

        this._changeDetectorRef.detectChanges();
    }

    private buildChartTiempoOptions(categories: string[], ingresos: number[], egresos: number[]): Highcharts.Options {
        return {
            ...this.baseTheme,
            chart: { type: 'spline', backgroundColor: 'transparent' },
            xAxis: {
                categories: categories,
                labels: { style: { color: '#6b7280' } },
                lineColor: '#d1d5db'
            },
            yAxis: {
                title: { text: null },
                labels: { style: { color: '#6b7280' }, format: '${value:.,0f}' },
                gridLineColor: '#f3f4f6'
            },
            plotOptions: {
                spline: {
                    dataLabels: { enabled: true, format: '${y:.,0f}', style: { color: '#374151', textOutline: 'none', fontWeight: 'bold' } }
                }
            },
            series: [
                {
                    type: 'spline',
                    name: 'Ingresos',
                    data: ingresos,
                    color: '#10b981', // Verde esmeralda
                    lineWidth: 3,
                    marker: { enabled: true, radius: 4 },
                    visible: this.filtroMovimiento !== '2'
                },
                {
                    type: 'spline',
                    name: 'Egresos',
                    data: egresos,
                    color: '#f43f5e', // Rosa/Rojo
                    lineWidth: 3,
                    marker: { enabled: true, radius: 4 },
                    visible: this.filtroMovimiento !== '1'
                }
            ]
        };
    }

    private buildChartGroupedOptions(title: string, group: any): Highcharts.Options {
        const isColumn = group.categorias.length <= 5;
        return {
            ...this.baseTheme,
            chart: { type: isColumn ? 'column' : 'bar', backgroundColor: 'transparent' },
            xAxis: {
                categories: group.categorias,
                labels: { style: { color: '#6b7280' } },
                lineColor: '#d1d5db'
            },
            yAxis: {
                title: { text: null },
                labels: { style: { color: '#6b7280' }, format: '${value:.,0f}' },
                gridLineColor: '#f3f4f6'
            },
            tooltip: { ...this.baseTheme.tooltip, valuePrefix: '$', valueDecimals: 2 },
            plotOptions: {
                column: { borderRadius: 4 },
                bar: { borderRadius: 4 }
            },
            series: [
                {
                    name: 'Ingresos',
                    data: group.ingresos,
                    color: '#10b981',
                    type: isColumn ? 'column' : 'bar',
                    visible: this.filtroMovimiento !== '2'
                },
                {
                    name: 'Egresos',
                    data: group.egresos,
                    color: '#f43f5e',
                    type: isColumn ? 'column' : 'bar',
                    visible: this.filtroMovimiento !== '1'
                }
            ]
        };
    }

    private buildChartMovimientoOptions(data: any[]): Highcharts.Options {
        return {
            ...this.baseTheme,
            chart: { type: 'pie', backgroundColor: 'transparent' },
            title: { text: '' },
            tooltip: { ...this.baseTheme.tooltip, pointFormat: '<b>${point.y:,.2f}</b> ({point.percentage:.1f}%)' },
            plotOptions: {
                pie: {
                    innerSize: '65%',
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    dataLabels: {
                        enabled: true,
                        format: '{point.name}: {point.percentage:.1f}%',
                        style: { color: '#374151', textOutline: 'none', fontWeight: '500' },
                        distance: 15
                    },
                    showInLegend: true,
                    states: {
                        hover: {
                            brightness: 0.1,
                            halo: { size: 9, opacity: 0.1 }
                        }
                    }
                }
            },
            legend: {
                align: 'center',
                verticalAlign: 'bottom',
                layout: 'horizontal',
                itemStyle: { fontSize: '10px' }
            },
            series: [{
                type: 'pie',
                name: 'Movimientos',
                data: data.filter(d => {
                    if (this.filtroMovimiento === '1') return d.name === 'Ingresos';
                    if (this.filtroMovimiento === '2') return d.name === 'Egresos';
                    return true;
                })
            }]
        };
    }

    public exportToPDF(): void {
        const data = document.getElementById('pdf-content');
        if (data) {
            html2canvas(data, { scale: 2, backgroundColor: '#f9fafb' }).then(canvas => {
                const imgWidth = 208;
                const pageHeight = 295;
                const imgHeight = canvas.height * imgWidth / canvas.width;
                const pdf = new jsPDF('p', 'mm', 'a4');
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
                pdf.save(`Reporte-Gastos.pdf`);
            });
        }
    }
}