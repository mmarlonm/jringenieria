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

    // 🔹 Opciones para Filtros (Cargadas de catálogos)
    areas: any[] = [];
    conceptos: any[] = [];
    tipos: any[] = [];

    // 🔹 Datos crudos para filtrado cruzado
    private allExpenses: Expense[] = [];
    private fullCatalogs: ExpenseCatalogs | null = null;
    private fullData: DashboardReportResponse | null = null;

    // 🔹 KPIs
    totalGastos: number = 0;
    proporcionGastosVentas: number = 0;

    // 🔹 Opciones de Gráficas (Tema Claro)
    chartOptionsTiempo: Highcharts.Options = {};
    chartOptionsArea: Highcharts.Options = {};
    chartOptionsConcepto: Highcharts.Options = {};
    chartOptionsTipo: Highcharts.Options = {};

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

    private getNombreArea(id: number): string {
        return this.fullCatalogs?.areas?.find(a => a.areaId === id)?.nombre || 'S/A';
    }

    private getNombreConcepto(id: number): string {
        return this.fullCatalogs?.conceptos?.find(c => c.conceptoId === id)?.nombre || 'S/C';
    }

    private getNombreTipo(id: number): string {
        return this.fullCatalogs?.tipos?.find(t => t.tipoId === id)?.etiqueta || 'S/T';
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
            const matchArea = this.filtroAreas.length === 0 || this.filtroAreas.includes(this.getNombreArea(e.areaId));
            const matchConcepto = this.filtroConceptos.length === 0 || this.filtroConceptos.includes(this.getNombreConcepto(e.conceptoId));
            const matchTipo = this.filtroTipos.length === 0 || this.filtroTipos.includes(this.getNombreTipo(e.tipoId));

            return matchAnio && matchMes && matchArea && matchConcepto && matchTipo;
        });

        // 2. Agregación Dinámica para gráficas
        this.totalGastos = filtered.reduce((acc, curr) => acc + curr.cantidad, 0);

        // --- Gráfica Tiempo ---
        const mesesMap: { [key: number]: string } = {
            1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr', 5: 'May', 6: 'Jun',
            7: 'Jul', 8: 'Ago', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dic'
        };
        const tiempoData: ChartItem[] = [];
        for (let i = 1; i <= 12; i++) {
            const sum = filtered.filter(e => moment(e.fecha).month() + 1 === i).reduce((a, b) => a + b.cantidad, 0);
            if (sum > 0 || this.filtroMeses.length === 0) {
                tiempoData.push({ etiqueta: mesesMap[i], valor: sum });
            }
        }

        // --- Gráfica Área ---
        const areaDataRaw: { [key: string]: number } = {};
        filtered.forEach(e => {
            const name = this.getNombreArea(e.areaId);
            areaDataRaw[name] = (areaDataRaw[name] || 0) + e.cantidad;
        });
        const areaData = Object.keys(areaDataRaw).map(k => ({ etiqueta: k, valor: areaDataRaw[k] }));

        // --- Gráfica Concepto ---
        const conceptoDataRaw: { [key: string]: number } = {};
        filtered.forEach(e => {
            const name = this.getNombreConcepto(e.conceptoId);
            conceptoDataRaw[name] = (conceptoDataRaw[name] || 0) + e.cantidad;
        });
        const conceptoData = Object.keys(conceptoDataRaw).map(k => ({ etiqueta: k, valor: conceptoDataRaw[k] }));

        // --- Gráfica Tipo ---
        const tipoDataRaw: { [key: string]: number } = {};
        filtered.forEach(e => {
            const name = this.getNombreTipo(e.tipoId);
            tipoDataRaw[name] = (tipoDataRaw[name] || 0) + e.cantidad;
        });
        const tipoData = Object.keys(tipoDataRaw).map(k => ({ etiqueta: k, valor: tipoDataRaw[k] }));

        // 3. Re-renderizar
        this.buildChartTiempo(tiempoData);
        this.buildChartArea(areaData);
        this.buildChartConcepto(conceptoData);
        this.buildChartTipo(tipoData);

        this._changeDetectorRef.detectChanges();
    }

    private buildChartTiempo(data: ChartItem[]): void {
        this.chartOptionsTiempo = {
            ...this.baseTheme,
            chart: { type: 'spline', backgroundColor: 'transparent' }, // Línea suavizada
            xAxis: {
                categories: data.map(d => d.etiqueta),
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
            series: [{
                type: 'spline',
                name: 'Gastos',
                data: data.map(d => d.valor),
                color: '#2563eb', // Azul primario
                lineWidth: 3,
                marker: { enabled: true, radius: 4 }
            }]
        };
    }

    private buildChartArea(data: ChartItem[]): void {
        this.chartOptionsArea = {
            ...this.baseTheme,
            chart: { type: 'column', backgroundColor: 'transparent' }, // Columnas verticales
            xAxis: {
                categories: data.map(d => d.etiqueta),
                labels: { style: { color: '#6b7280' } },
                lineColor: '#d1d5db'
            },
            yAxis: {
                title: { text: null },
                labels: { style: { color: '#6b7280' }, format: '${value:.,0f}' },
                gridLineColor: '#f3f4f6'
            },
            tooltip: { ...this.baseTheme.tooltip, valuePrefix: '$', valueDecimals: 2 },
            series: [{
                type: 'column',
                name: 'Gastos por Área',
                data: data.map(d => d.valor),
                color: '#3b82f6', // Azul claro
                borderRadius: 4
            }]
        };
    }

    private buildChartConcepto(data: ChartItem[]): void {
        this.chartOptionsConcepto = {
            ...this.baseTheme,
            chart: { type: 'pie', backgroundColor: 'transparent' },
            tooltip: { ...this.baseTheme.tooltip, pointFormat: '<b>${point.y:,.2f}</b> ({point.percentage:.1f}%)' },
            plotOptions: {
                pie: {
                    innerSize: '65%', // Donut
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    dataLabels: { enabled: true, format: '{point.name}: {point.percentage:.1f}%', style: { color: '#374151', textOutline: 'none', fontWeight: 'normal' } },
                    showInLegend: true
                }
            },
            series: [{
                type: 'pie',
                name: 'Conceptos',
                data: data.map(d => ({ name: d.etiqueta, y: d.valor })),
                colors: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6']
            }]
        };
    }

    private buildChartTipo(data: ChartItem[]): void {
        this.chartOptionsTipo = {
            ...this.baseTheme,
            chart: { type: 'pie', backgroundColor: 'transparent' },
            tooltip: { ...this.baseTheme.tooltip, pointFormat: '<b>${point.y:,.2f}</b> ({point.percentage:.1f}%)' },
            plotOptions: {
                pie: {
                    borderWidth: 2,
                    borderColor: '#ffffff', // Pastel normal cerrado
                    dataLabels: { enabled: true, format: '{point.name}: {point.percentage:.1f}%', style: { color: '#374151', textOutline: 'none', fontWeight: 'normal' } },
                    showInLegend: true
                }
            },
            series: [{
                type: 'pie',
                name: 'Tipos',
                data: data.map(d => ({ name: d.etiqueta, y: d.valor })),
                colors: ['#06b6d4', '#f43f5e', '#84cc16']
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