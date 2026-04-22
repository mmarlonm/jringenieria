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
    showFilters: boolean = true;

    toggleFilters(): void {
        this.showFilters = !this.showFilters;
    }
    
    // Data
    solicitudes: SolicitudCompra[] = [];
    
    // KPIs
    totalsByCurrency: { [key: string]: number } = {};
    countSolicitudes: number = 0;
    promedioMonto: number = 0; // Keeping as reference or normalized average
    
    // Chart Options
    chartOptionsCentroCosto: Highcharts.Options = {};
    chartOptionsPrioridad: Highcharts.Options = {};
    chartOptionsTimeline: Highcharts.Options = {};
    chartOptionsSucursal: Highcharts.Options = {};
    chartOptionsLiquidacion: Highcharts.Options = {};
    
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

    private _resetCharts(): void {
        this.chartOptionsCentroCosto = {};
        this.chartOptionsPrioridad = {};
        this.chartOptionsTimeline = {};
        this.chartOptionsSucursal = {};
        this.chartOptionsLiquidacion = {};
    }

    private _processData(): void {
        if (!this.solicitudes.length) {
            this._resetCharts();
            return;
        }

        // 1. Calculate KPIs (Segmented by Currency)
        this.countSolicitudes = this.solicitudes.length;
        this.totalsByCurrency = {};
        
        this.solicitudes.forEach(s => {
            const mon = (s.moneda || 'MXN').toUpperCase();
            this.totalsByCurrency[mon] = (this.totalsByCurrency[mon] || 0) + (s.monto || 0);
        });

        // For reference, still calculate a normalized total for the "Average" KPI if useful
        const totalMontoMXN = this.solicitudes.reduce((acc, curr) => {
            const montoMXN = this._exchangeRateService.convertMontoToMXN(curr.monto || 0, curr.moneda);
            return acc + montoMXN;
        }, 0);
        this.promedioMonto = this.countSolicitudes > 0 ? totalMontoMXN / this.countSolicitudes : 0;

        // 2. Group by Centro de Costo AND Moneda
        const ccMonedaMap = new Map<string, { [moneda: string]: number }>();
        const uniqueCurrencies = new Set<string>();
        const uniqueCCs = new Set<string>();

        this.solicitudes.forEach(s => {
            const cc = s.centroCosto || 'Sin Centro de Costo';
            const mon = (s.moneda || 'MXN').toUpperCase();
            uniqueCurrencies.add(mon);
            uniqueCCs.add(cc);

            if (!ccMonedaMap.has(cc)) {
                ccMonedaMap.set(cc, {});
            }
            const ccData = ccMonedaMap.get(cc);
            ccData[mon] = (ccData[mon] || 0) + (s.monto || 0);
        });

        const sortedCCs = Array.from(uniqueCCs).sort();
        const currenciesList = Array.from(uniqueCurrencies).sort();

        // 3. Group by Prioridad (Count - keep as is, it's independent of amount)
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

        // 4. Group by Date AND Moneda for Timeline
        const timelineMonedaMap = new Map<string, Map<number, number>>();
        this.solicitudes.forEach(s => {
            if (!s.fechaSolicitud) return;
            
            const mon = (s.moneda || 'MXN').toUpperCase();
            const baseDate = (s.fechaSolicitud as any).toJSDate ? (s.fechaSolicitud as any).toJSDate() : s.fechaSolicitud;
            const date = moment(baseDate).startOf('day').valueOf();

            if (!timelineMonedaMap.has(mon)) {
                timelineMonedaMap.set(mon, new Map<number, number>());
            }
            const dateMap = timelineMonedaMap.get(mon);
            dateMap.set(date, (dateMap.get(date) || 0) + (s.monto || 0));
        });

        // Build series for Timeline
        const timelineSeries: any[] = [];
        const colors = { 'MXN': '#6366f1', 'USD': '#10b981', 'EURO': '#f59e0b', 'EUR': '#f59e0b' };

        timelineMonedaMap.forEach((dateMap, mon) => {
            const seriesData: any[] = [];
            const sortedTimestamps = Array.from(dateMap.keys()).sort((a, b) => a - b);
            
            if (sortedTimestamps.length > 0) {
                const start = moment(sortedTimestamps[0]).startOf('day');
                const end = moment(sortedTimestamps[sortedTimestamps.length - 1]).startOf('day');
                
                for (let m = moment(start); m.isSameOrBefore(end); m.add(1, 'days')) {
                    const ts = m.startOf('day').valueOf();
                    const val = dateMap.get(ts) || 0;
                    seriesData.push({
                        x: ts,
                        y: val,
                        marker: { enabled: val > 0 }
                    });
                }
            }

            timelineSeries.push({
                name: mon,
                data: seriesData,
                color: (colors as any)[mon] || undefined // Let Highcharts pick if not defined
            });
        });

        // Build series for Centro de Costo
        const ccSeries: any[] = currenciesList.map(mon => {
            return {
                name: mon,
                data: sortedCCs.map(cc => ccMonedaMap.get(cc)[mon] || 0),
                color: (colors as any)[mon] || undefined
            };
        });

        // 5. Group by Sucursal (Normalized to MXN)
        const sucursalMap = new Map<string, number>();
        this.solicitudes.forEach(s => {
            const suc = s.sucursal || 'Sin Sucursal';
            const montoMXN = this._exchangeRateService.convertMontoToMXN(s.monto || 0, s.moneda);
            sucursalMap.set(suc, (sucursalMap.get(suc) || 0) + montoMXN);
        });

        const sucursalData = Array.from(sucursalMap.entries())
            .map(([name, y]) => ({ name, y }))
            .sort((a, b) => b.y - a.y);

        // 6. Group by Investment Status (Realized vs Pending)
        const statusMap = new Map<string, number>();
        let totalRealized = 0;
        let totalPending = 0;
        let totalAdvance = 0;

        this.solicitudes.forEach(s => {
            const montoMXN = this._exchangeRateService.convertMontoToMXN(s.monto || 0, s.moneda);
            if (s.estadoLiquidacion === 1) {
                totalRealized += montoMXN;
            } else if (s.estadoLiquidacion === 2) {
                totalAdvance += montoMXN;
            } else {
                totalPending += montoMXN;
            }
        });

        const statusData = [
            { name: 'Liquidado', y: totalRealized, color: '#10b981' },
            { name: 'Anticipo', y: totalAdvance, color: '#f59e0b' },
            { name: 'Pendiente', y: totalPending, color: '#ef4444' }
        ].filter(d => d.y > 0);

        // 7. Build Charts
        this.chartOptionsCentroCosto = this._buildCentroCostoChart(sortedCCs, ccSeries);
        this.chartOptionsPrioridad = this._buildPrioridadChart(priorityData);
        this.chartOptionsTimeline = this._buildTimelineChart(timelineSeries);
        this.chartOptionsSucursal = this._buildSucursalChart(sucursalData);
        this.chartOptionsLiquidacion = this._buildLiquidacionChart(statusData);
        
        this._changeDetectorRef.markForCheck();
    }

    private _buildTimelineChart(series: any[]): Highcharts.Options {
        return Highcharts.merge(this.baseTheme, {
            chart: { type: 'areaspline' },
            xAxis: {
                type: 'datetime',
                dateTimeLabelFormats: { day: '%e %b', month: '%b %y' },
                gridLineWidth: 0,
                lineColor: '#e5e7eb'
            },
            yAxis: {
                title: { text: 'Inversión (MXN)' },
                gridLineDashStyle: 'Dash',
                gridLineColor: '#f3f4f6'
            },
            plotOptions: {
                areaspline: {
                    fillOpacity: 0.1,
                    lineWidth: 3,
                    marker: { radius: 4, symbol: 'circle' }
                }
            },
            series: series
        });
    }

    private _buildCentroCostoChart(categories: string[], series: any[]): Highcharts.Options {
        return Highcharts.merge(this.baseTheme, {
            chart: { type: 'column' },
            xAxis: {
                categories: categories,
                labels: { rotation: -45, style: { fontSize: '10px', color: '#6b7280', fontWeight: '500' } },
                lineColor: '#e5e7eb'
            },
            yAxis: {
                title: { text: 'Inversión' },
                gridLineColor: '#f3f4f6'
            },
            plotOptions: {
                column: { 
                    borderRadius: 4, 
                    borderWidth: 0
                }
            },
            series: series
        });
    }

    private _buildPrioridadChart(data: any[]): Highcharts.Options {
        return Highcharts.merge(this.baseTheme, {
            chart: { type: 'pie' },
            tooltip: { pointFormat: 'Cantidad: <b>{point.y}</b> ({point.percentage:.1f}%)' },
            plotOptions: {
                pie: {
                    innerSize: '65%',
                    dataLabels: {
                        enabled: true,
                        format: '{point.name}',
                        style: { fontSize: '10px', fontWeight: 'bold', color: '#4b5563', textOutline: 'none' }
                    },
                    showInLegend: true
                }
            },
            series: [{
                name: 'Prioridades',
                data: data
            }]
        });
    }

    private _buildSucursalChart(data: any[]): Highcharts.Options {
        return Highcharts.merge(this.baseTheme, {
            chart: { type: 'bar' },
            xAxis: {
                categories: data.map(d => d.name),
                gridLineWidth: 0,
                lineColor: '#e5e7eb'
            },
            yAxis: {
                title: { text: 'Monto Total (MXN)' },
                gridLineColor: '#f3f4f6'
            },
            plotOptions: {
                bar: {
                    borderRadius: 8,
                    colorByPoint: true,
                    colors: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e']
                }
            },
            series: [{
                name: 'Inversión',
                data: data.map(d => d.y),
                showInLegend: false
            }]
        });
    }

    private _buildLiquidacionChart(data: any[]): Highcharts.Options {
        // Find specific values for tooltips/labels
        const liquidated = data.find(d => d.name === 'Liquidado')?.y || 0;
        const advance = data.find(d => d.name === 'Anticipo')?.y || 0;
        const pending = data.find(d => d.name === 'Pendiente')?.y || 0;
        const total = liquidated + advance + pending;

        return Highcharts.merge(this.baseTheme, {
            chart: { 
                type: 'bar',
                height: 180,
                marginTop: 20
            },
            xAxis: {
                categories: ['Inversión Total'],
                visible: false
            },
            yAxis: {
                min: 0,
                max: total,
                title: { text: null },
                gridLineWidth: 0,
                labels: { enabled: false }
            },
            legend: {
                enabled: true,
                verticalAlign: 'top',
                align: 'center',
                itemStyle: { fontSize: '12px' }
            },
            plotOptions: {
                series: {
                    stacking: 'normal',
                    borderRadius: 10,
                    dataLabels: {
                        enabled: true,
                        format: '{point.percentage:.0f}%',
                        style: { 
                            fontSize: '14px', 
                            fontWeight: 'bold', 
                            color: 'white', 
                            textOutline: 'none' 
                        }
                    }
                }
            },
            tooltip: {
                valueDecimals: 2,
                valueSuffix: ' MXN',
                shared: true
            },
            series: [
                {
                    name: 'Liquidado',
                    data: [liquidated],
                    color: '#10b981' // emerald-500
                },
                {
                    name: 'Anticipo',
                    data: [advance],
                    color: '#f59e0b' // amber-500
                },
                {
                    name: 'Pendiente',
                    data: [pending],
                    color: '#ef4444' // red-500
                }
            ]
        });
    }
}
