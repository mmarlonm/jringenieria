import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
// 🔹 Highcharts
import * as Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';
import Exporting from 'highcharts/modules/exporting';

// 🔹 Luxon & Moment
import { DateTime } from 'luxon';
import moment from 'moment';

// 🔹 Material
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatLuxonDateModule } from '@angular/material-luxon-adapter';

// 🔹 Service & Types
import { SolicitudCompraService } from '../solicitudes-compra/solicitud-compra.service';
import { SolicitudCompra } from '../solicitudes-compra/models/solicitud-compra.types';
import { ExchangeRateService } from 'app/core/services/exchange-rate.service';

// Initialize Highcharts modules
Exporting(Highcharts);

// Configuración global para evitar desfases de zona horaria en los gráficos
Highcharts.setOptions({
    time: {
        useUTC: false
    },
    lang: {
        decimalPoint: '.',
        thousandsSep: ',',
        months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
        weekdays: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
        shortMonths: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    }
});

@Component({
    selector: 'resumen-compras',
    standalone: true,
    templateUrl: './resumen-compras.component.html',
    styleUrls: ['./resumen-compras.component.scss'],
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
        MatLuxonDateModule
    ]
})
export class ResumenComprasComponent implements OnInit, OnDestroy {
    
    public Highcharts: typeof Highcharts = Highcharts;
    isLoading: boolean = false;
    
    // Filters
    fechaInicio: any = '';
    fechaFin: any = '';
    
    // Data
    solicitudes: SolicitudCompra[] = [];
    
    // KPIs
    totalMonto: number = 0;
    countSolicitudes: number = 0;
    promedioMonto: number = 0;
    
    // Chart Options
    chartOptionsCentroCosto: Highcharts.Options = {};
    chartOptionsPrioridad: Highcharts.Options = {};
    chartOptionsTimeline: Highcharts.Options = {};
    
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    // Base Theme for charts
    private baseTheme: Highcharts.Options = {
        chart: { 
            backgroundColor: 'transparent',
            spacingBottom: 20,
            spacingTop: 10,
            spacingLeft: 10,
            spacingRight: 10,
            style: { fontFamily: 'Inter, sans-serif' }
        },
        title: { text: undefined },
        credits: { enabled: false },
        legend: { 
            itemStyle: { color: '#4b5563', fontWeight: 'bold', fontSize: '11px' },
            margin: 10,
            padding: 5
        },
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
        private _changeDetectorRef: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        // Default dates: First day of current month and Today
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        this.fechaInicio = firstDay;
        this.fechaFin = now;

        this._solicitudCompraService.solicitudes$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((solicitudes) => {
                this.solicitudes = solicitudes || [];
                this._processData();
            });

        this.consultar();
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    consultar(): void {
        this.isLoading = true;
        
        // Handle both native Date and Luxon DateTime objects
        let start = this.fechaInicio;
        let end = this.fechaFin;

        if (start && typeof (start as any).toISODate === 'function') {
            start = (start as any).toISODate();
        } else if (start instanceof Date) {
            start = start.toISOString().split('T')[0];
        }

        if (end && typeof (end as any).toISODate === 'function') {
            end = (end as any).toISODate();
        } else if (end instanceof Date) {
            end = end.toISOString().split('T')[0];
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

    private _processData(): void {
        if (!this.solicitudes.length) {
            this._resetCharts();
            return;
        }

        // 1. Calculate KPIs (Converted to MXN)
        this.countSolicitudes = this.solicitudes.length;
        this.totalMonto = this.solicitudes.reduce((acc, curr) => {
            const montoMXN = this._exchangeRateService.convertMontoToMXN(curr.monto || 0, curr.moneda);
            return acc + montoMXN;
        }, 0);
        this.promedioMonto = this.countSolicitudes > 0 ? this.totalMonto / this.countSolicitudes : 0;

        // 2. Group by Centro de Costo (Monto)
        const centroCostoMap = new Map<string, number>();
        this.solicitudes.forEach(s => {
            const cc = s.centroCosto || 'Sin Centro de Costo';
            const montoMXN = this._exchangeRateService.convertMontoToMXN(s.monto || 0, s.moneda);
            centroCostoMap.set(cc, (centroCostoMap.get(cc) || 0) + montoMXN);
        });

        const ccData = Array.from(centroCostoMap.entries())
            .map(([name, y]) => ({ name, y }))
            .sort((a, b) => b.y - a.y);

        // 3. Group by Prioridad (Count)
        const prioridadMap = new Map<string, number>();
        this.solicitudes.forEach(s => {
            const p = s.prioridad || 'Normal';
            prioridadMap.set(p, (prioridadMap.get(p) || 0) + 1);
        });

        const priorityData = Array.from(prioridadMap.entries())
            .map(([name, y]) => {
                let color: any = '#94a3b8'; // default
                if (name.toLowerCase().includes('urgente')) color = { radialGradient: { cx: 0.5, cy: 0.3, r: 0.7 }, stops: [[0, '#fb7185'], [1, '#e11d48']] };
                if (name.toLowerCase().includes('alta')) color = { radialGradient: { cx: 0.5, cy: 0.3, r: 0.7 }, stops: [[0, '#fcd34d'], [1, '#d97706']] };
                if (name.toLowerCase().includes('normal')) color = { radialGradient: { cx: 0.5, cy: 0.3, r: 0.7 }, stops: [[0, '#7dd3fc'], [1, '#0284c7']] };
                return { name, y, color };
            });

        // 4. Group by Date for Timeline (Fill gaps)
        const timelineMap = new Map<number, number>();
        this.solicitudes.forEach(s => {
            if (!s.fechaSolicitud) return;
            
            // Asegurar que manejamos Luxon o string/Date correctamente
            const baseDate = (s.fechaSolicitud as any).toJSDate ? (s.fechaSolicitud as any).toJSDate() : s.fechaSolicitud;
            const date = moment(baseDate).startOf('day').valueOf();
            
            const montoMXN = this._exchangeRateService.convertMontoToMXN(s.monto || 0, s.moneda);
            timelineMap.set(date, (timelineMap.get(date) || 0) + montoMXN);
        });

        // Fill gaps between min and max dates
        const timelineData: any[] = [];
        if (timelineMap.size > 0) {
            const sortedTimestamps = Array.from(timelineMap.keys()).sort((a, b) => a - b);
            const start = moment(sortedTimestamps[0]).startOf('day');
            const end = moment(sortedTimestamps[sortedTimestamps.length - 1]).startOf('day');
            
            for (let m = moment(start); m.isSameOrBefore(end); m.add(1, 'days')) {
                const ts = m.startOf('day').valueOf(); // Re-ensure start of day
                const val = timelineMap.get(ts) || 0;
                timelineData.push({
                    x: ts,
                    y: val,
                    marker: { enabled: val > 0 }
                });
            }
        }

        // 5. Build Charts
        this.chartOptionsCentroCosto = this._buildCentroCostoChart(ccData);
        this.chartOptionsPrioridad = this._buildPrioridadChart(priorityData);
        this.chartOptionsTimeline = this._buildTimelineChart(timelineData);
        
        this._changeDetectorRef.markForCheck();
    }

    private _buildTimelineChart(data: any[]): Highcharts.Options {
        return {
            ...this.baseTheme,
            chart: { ...this.baseTheme.chart, type: 'areaspline' },
            xAxis: {
                type: 'datetime',
                dateTimeLabelFormats: { month: '%b %Y', day: '%e %b' },
                labels: { style: { color: '#6b7280', fontSize: '10px' } },
                lineColor: '#e5e7eb'
            },
            yAxis: {
                title: { text: null },
                labels: { format: '${value:.,0f}', style: { color: '#9ca3af', fontSize: '10px' } },
                gridLineColor: '#f1f5f9',
                gridLineDashStyle: 'Dash'
            },
            tooltip: { 
                ...this.baseTheme.tooltip, 
                xDateFormat: '%A, %e de %B',
                pointFormat: '<span style="color:{series.color}">\u25CF</span> {series.name}: <b>${point.y:,.2f}</b><br/>'
            },
            plotOptions: {
                areaspline: {
                    fillColor: {
                        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                        stops: [
                            [0, 'rgba(99, 102, 241, 0.3)'],
                            [1, 'rgba(99, 102, 241, 0)']
                        ]
                    },
                    marker: { radius: 4, symbol: 'circle', lineWidth: 2, lineColor: '#ffffff' },
                    lineWidth: 3,
                    states: { hover: { lineWidth: 4 } },
                    threshold: null
                }
            },
            series: [{
                type: 'areaspline',
                name: 'Inversión Diaria',
                data: data,
                color: '#6366f1'
            }]
        };
    }

    private _buildCentroCostoChart(data: any[]): Highcharts.Options {
        return {
            ...this.baseTheme,
            chart: { ...this.baseTheme.chart, type: 'column' },
            xAxis: {
                type: 'category',
                labels: { rotation: -45, style: { fontSize: '10px', color: '#6b7280', fontWeight: '500' } },
                lineColor: '#e5e7eb'
            },
            yAxis: {
                title: { text: null },
                labels: { format: '${value:.,0f}', style: { color: '#9ca3af', fontSize: '10px' } },
                gridLineColor: '#f1f5f9'
            },
            legend: { enabled: false },
            tooltip: { ...this.baseTheme.tooltip, valuePrefix: '$', valueDecimals: 2 },
            plotOptions: {
                column: { 
                    borderRadius: 6, 
                    borderWidth: 0,
                    groupPadding: 0.1,
                    color: {
                        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                        stops: [
                            [0, '#818cf8'],
                            [1, '#4f46e5']
                        ]
                    }
                }
            },
            series: [{
                type: 'column',
                name: 'Monto Total',
                data: data
            }]
        };
    }

    private _buildPrioridadChart(data: any[]): Highcharts.Options {
        return {
            ...this.baseTheme,
            chart: { ...this.baseTheme.chart, type: 'pie' },
            tooltip: { ...this.baseTheme.tooltip, pointFormat: 'Cantidad: <b>{point.y}</b> ({point.percentage:.1f}%)' },
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    dataLabels: {
                        enabled: true,
                        format: '{point.name}',
                        style: { fontSize: '10px', fontWeight: 'bold', color: '#4b5563', textOutline: 'none' },
                        connectorWidth: 1,
                        distance: 20
                    },
                    showInLegend: true,
                    innerSize: '65%',
                    borderWidth: 0
                }
            },
            series: [{
                type: 'pie',
                name: 'Prioridades',
                data: data
            }]
        };
    }

    private _resetCharts(): void {
        this.totalMonto = 0;
        this.countSolicitudes = 0;
        this.promedioMonto = 0;
        this.chartOptionsCentroCosto = {};
        this.chartOptionsPrioridad = {};
        this.chartOptionsTimeline = {};
        this._changeDetectorRef.markForCheck();
    }
}
