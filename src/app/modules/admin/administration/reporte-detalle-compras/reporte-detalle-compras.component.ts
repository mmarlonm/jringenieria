import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import * as Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';
import Exporting from 'highcharts/modules/exporting';
import { DateTime } from 'luxon';

// Material
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatNativeDateModule } from '@angular/material/core';

// Service & Types
import { SolicitudCompraService } from '../solicitudes-compra/solicitud-compra.service';
import { SolicitudCompra } from '../solicitudes-compra/models/solicitud-compra.types';
import { ExchangeRateService } from 'app/core/services/exchange-rate.service';

Exporting(Highcharts);

Highcharts.setOptions({
    time: { useUTC: false },
    lang: {
        decimalPoint: '.',
        thousandsSep: ',',
        months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
        weekdays: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
        shortMonths: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    }
});

import { CommonExcelExportService } from 'app/shared/utils/common-excel-export.service';

@Component({
    selector: 'reporte-detalle-compras',
    standalone: true,
    templateUrl: './reporte-detalle-compras.component.html',
    imports: [
        CommonModule,
        FormsModule,
        HighchartsChartModule,
        MatButtonModule,
        MatDatepickerModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        MatNativeDateModule
    ]
})
export class ReporteDetalleComprasComponent implements OnInit, OnDestroy {
    public Highcharts: typeof Highcharts = Highcharts;
    isLoading: boolean = false;
    showFilters: boolean = true;

    fechaInicio: any = '';
    fechaFin: any = '';
    
    // Filters selected
    selectedSucursal: string = '';
    selectedArea: string = '';
    selectedEstatus: string = '';
    selectedPrioridad: string = '';
    
    // Dropdown options
    sucursales: string[] = [];
    areas: string[] = [];
    estatusList: string[] = [];
    prioridades: string[] = [];

    // Data lists
    allSolicitudes: SolicitudCompra[] = [];
    filteredSolicitudes: SolicitudCompra[] = [];

    // KPI Values
    totalGastadoMXN: number = 0;
    countFacturasPendientes: number = 0;
    countPagosPendientes: number = 0;
    countEvidenciasPendientes: number = 0;
    porcentajeFacturacion: number = 0;
    ticketPromedioMXN: number = 0;

    // Charts configurations
    chartOptionsTimeline: any = {};
    chartOptionsComparativo: any = {};
    
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    private baseTheme: any = {
        chart: {
            backgroundColor: 'transparent',
            style: { fontFamily: 'Inter, sans-serif' }
        },
        title: { text: undefined },
        credits: { enabled: false },
        tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            style: { color: '#1f2937' },
            borderColor: '#e5e7eb',
            borderRadius: 12,
            shadow: true,
            padding: 12
        }
    };

    constructor(
        private _solicitudCompraService: SolicitudCompraService,
        private _exchangeRateService: ExchangeRateService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _excelService: CommonExcelExportService
    ) {}

    exportToExcel(): void {
        const solicitudes = this.filteredSolicitudes;
        if (!solicitudes || solicitudes.length === 0) return;

        const headers = [
            'Folio',
            'Tipo Operación',
            'Sucursal',
            'Área Solicitante',
            'Prioridad',
            'Proveedor Sugerido',
            'Estatus Solicitud',
            'Factura CONTPAQi',
            'Estado Pago',
            'Moneda Original',
            'Monto Original',
            'Monto (MXN)'
        ];

        const rows = solicitudes.map(s => {
            const hasFactura = !!(s.datosFacturaContpaqi?.folioInternoFactura || s.datosFacturaContpaqi?.folioFacturaProveedor);
            const isPendientePago = s.estadoLiquidacion !== 1;
            const montoMXN = this._exchangeRateService.convertMontoToMXN(s.monto || 0, s.moneda);

            return [
                s.idSolicitud,
                s.tipoOperacion === 2 ? 'Gasto' : 'Compra',
                s.sucursal || '',
                s.areaSolicitante || '',
                s.prioridad || '',
                s.proveedorSugerido || '',
                s.nombreEstatus || '',
                hasFactura ? 'SI VINCULADA' : 'PENDIENTE',
                isPendientePago ? 'PENDIENTE DE PAGO' : 'PAGADO/LIQUIDADO',
                s.moneda || 'MXN',
                s.monto || 0,
                montoMXN
            ];
        });

        try {
            this._excelService.exportTableToExcel('Reporte_Detallado_Compras', headers, rows);
        } catch (err) {
            console.error('Error al exportar reporte a Excel:', err);
        }
    }

    ngOnInit(): void {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const yearStart = firstDay.getFullYear();
        const monthStart = String(firstDay.getMonth() + 1).padStart(2, '0');
        const dayStart = String(firstDay.getDate()).padStart(2, '0');
        this.fechaInicio = `${yearStart}-${monthStart}-${dayStart}`;

        const yearEnd = now.getFullYear();
        const monthEnd = String(now.getMonth() + 1).padStart(2, '0');
        const dayEnd = String(now.getDate()).padStart(2, '0');
        this.fechaFin = `${yearEnd}-${monthEnd}-${dayEnd}`;

        this._solicitudCompraService.solicitudes$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((solicitudes) => {
                this.allSolicitudes = solicitudes || [];
                this._extractUniqueValues();
                this.aplicarFiltrosLocales();
            });

        this.consultar();
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    toggleFilters(): void {
        this.showFilters = !this.showFilters;
    }

    consultar(): void {
        this.isLoading = true;
        let start = this.fechaInicio;
        let end = this.fechaFin;

        if (start) {
            if (typeof (start as any).toISODate === 'function') {
                start = (start as any).toISODate();
            } else if (start instanceof Date) {
                const year = start.getFullYear();
                const month = String(start.getMonth() + 1).padStart(2, '0');
                const day = String(start.getDate()).padStart(2, '0');
                start = `${year}-${month}-${day}`;
            }
        }
        
        if (end) {
            if (typeof (end as any).toISODate === 'function') {
                end = (end as any).toISODate();
            } else if (end instanceof Date) {
                const year = end.getFullYear();
                const month = String(end.getMonth() + 1).padStart(2, '0');
                const day = String(end.getDate()).padStart(2, '0');
                end = `${year}-${month}-${day}`;
            }
        }

        this._solicitudCompraService.getTodas(start as string, end as string).subscribe({
            next: () => {
                this.isLoading = false;
                this._changeDetectorRef.markForCheck();
            },
            error: () => {
                this.isLoading = false;
                this._changeDetectorRef.markForCheck();
            }
        });
    }

    private _extractUniqueValues(): void {
        const sucs = new Set<string>();
        const ars = new Set<string>();
        const ests = new Set<string>();
        const prios = new Set<string>();

        this.allSolicitudes.forEach(s => {
            if (s.sucursal) sucs.add(s.sucursal);
            if (s.areaSolicitante) ars.add(s.areaSolicitante);
            if (s.nombreEstatus) ests.add(s.nombreEstatus);
            if (s.prioridad) prios.add(s.prioridad);
        });

        this.sucursales = Array.from(sucs).sort();
        this.areas = Array.from(ars).sort();
        this.estatusList = Array.from(ests).sort();
        this.prioridades = Array.from(prios).sort();
    }

    aplicarFiltrosLocales(): void {
        this.filteredSolicitudes = this.allSolicitudes.filter(s => {
            const matchSuc = !this.selectedSucursal || s.sucursal === this.selectedSucursal;
            const matchArea = !this.selectedArea || s.areaSolicitante === this.selectedArea;
            const matchEst = !this.selectedEstatus || s.nombreEstatus === this.selectedEstatus;
            const matchPrio = !this.selectedPrioridad || s.prioridad === this.selectedPrioridad;
            return matchSuc && matchArea && matchEst && matchPrio;
        });

        this._calculateKPIsAndCharts();
    }

    limpiarFiltros(): void {
        this.selectedSucursal = '';
        this.selectedArea = '';
        this.selectedEstatus = '';
        this.selectedPrioridad = '';
        this.aplicarFiltrosLocales();
    }

    private _calculateKPIsAndCharts(): void {
        this.totalGastadoMXN = 0;
        this.countFacturasPendientes = 0;
        this.countPagosPendientes = 0;
        this.countEvidenciasPendientes = 0;

        let totalFacturadas = 0;

        this.filteredSolicitudes.forEach(s => {
            const montoMXN = this._exchangeRateService.convertMontoToMXN(s.monto || 0, s.moneda);
            this.totalGastadoMXN += montoMXN;

            // Invoice Check
            const hasFactura = !!(s.datosFacturaContpaqi?.folioInternoFactura || s.datosFacturaContpaqi?.folioFacturaProveedor);
            if (hasFactura) {
                totalFacturadas++;
            } else {
                this.countFacturasPendientes++;
            }

            // Payment check
            if (s.estadoLiquidacion !== 1) {
                this.countPagosPendientes++;
            }

            // Evidence check
            if (s.idEstatus >= 5 && s.idEstatus < 7) {
                this.countEvidenciasPendientes++;
            }
        });

        this.porcentajeFacturacion = this.filteredSolicitudes.length > 0 
            ? Math.round((totalFacturadas / this.filteredSolicitudes.length) * 100)
            : 0;

        this.ticketPromedioMXN = this.filteredSolicitudes.length > 0
            ? Math.round(this.totalGastadoMXN / this.filteredSolicitudes.length)
            : 0;

        this._buildCharts();
        this._changeDetectorRef.markForCheck();
    }

    private _buildCharts(): void {
        // Group timeline (spline) by date
        const dailyDataMap = new Map<string, number>();
        this.filteredSolicitudes.forEach(s => {
            if (s.fechaSolicitud) {
                const dateStr = (s.fechaSolicitud as any).split('T')[0];
                const val = this._exchangeRateService.convertMontoToMXN(s.monto || 0, s.moneda);
                dailyDataMap.set(dateStr, (dailyDataMap.get(dateStr) || 0) + val);
            }
        });

        const sortedDays = Array.from(dailyDataMap.keys()).sort();
        const splineSeriesData = sortedDays.map(day => {
            const time = new Date(day).getTime();
            return [time, Math.round(dailyDataMap.get(day) || 0)];
        });

        this.chartOptionsTimeline = Highcharts.merge(this.baseTheme, {
            chart: { type: 'areaspline', height: 350 },
            xAxis: { type: 'datetime', labels: { format: '{value:%e %b}' }, gridLineWidth: 0, lineColor: '#e5e7eb' },
            yAxis: { title: { text: 'Total en MXN' }, gridLineDashStyle: 'Dash', gridLineColor: '#f3f4f6' },
            plotOptions: {
                areaspline: {
                    fillColor: {
                        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                        stops: [
                            [0, 'rgba(79, 70, 229, 0.4)'],
                            [1, 'rgba(79, 70, 229, 0.0)']
                        ]
                    },
                    marker: { radius: 4 },
                    lineWidth: 3
                }
            },
            series: [{
                name: 'Flujo Diario de Solicitudes (MXN)',
                data: splineSeriesData,
                color: '#4f46e5'
            }]
        });

        // Group status (column/bar stack) by sucursal or status
        const estatusMap = new Map<string, { total: number, pendientes: number }>();
        this.filteredSolicitudes.forEach(s => {
            const est = s.nombreEstatus || 'Otros';
            const val = this._exchangeRateService.convertMontoToMXN(s.monto || 0, s.moneda);
            const isPendiente = s.estadoLiquidacion !== 1;

            if (!estatusMap.has(est)) {
                estatusMap.set(est, { total: 0, pendientes: 0 });
            }
            const curr = estatusMap.get(est);
            curr.total += val;
            if (isPendiente) {
                curr.pendientes += val;
            }
        });

        const categories = Array.from(estatusMap.keys());
        const totalValues = categories.map(cat => Math.round(estatusMap.get(cat).total));
        const pendingValues = categories.map(cat => Math.round(estatusMap.get(cat).pendientes));

        this.chartOptionsComparativo = Highcharts.merge(this.baseTheme, {
            chart: { type: 'column', height: 350 },
            xAxis: { categories: categories, lineColor: '#e5e7eb' },
            yAxis: { title: { text: 'Inversión (MXN)' }, gridLineColor: '#f3f4f6' },
            plotOptions: {
                column: {
                    borderRadius: 6,
                    borderWidth: 0,
                    dataLabels: { enabled: false }
                }
            },
            series: [
                { name: 'Monto Total', data: totalValues, color: '#3b82f6' },
                { name: 'Monto Pendiente Liquidar', data: pendingValues, color: '#ef4444' }
            ]
        });
    }
}
