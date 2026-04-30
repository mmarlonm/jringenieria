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
    
    fechaInicio: any = '';
    fechaFin: any = '';
    showFilters: boolean = true;

    toggleFilters(): void {
        this.showFilters = !this.showFilters;
    }
    
    solicitudes: SolicitudCompra[] = [];
    totalsByCurrency: { [key: string]: number } = {};
    countSolicitudes: number = 0;
    promedioMonto: number = 0;
    totalVentaConfirmada: { [moneda: string]: number } = {};
    currenciesList: string[] = [];

    chartOptionsCentroCosto: any = {};
    chartOptionsPrioridad: any = {};
    chartOptionsTimeline: any = {};
    chartOptionsSucursal: any = {};
    chartOptionsLiquidacion: any = {};
    chartOptionsFormaPago: any = {};
    chartOptionsArea: any = {};
    chartOptionsTimelinePago: any = {};
    
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    private baseTheme: any = {
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
        this.chartOptionsFormaPago = {};
        this.chartOptionsArea = {};
        this.chartOptionsTimelinePago = {};
        this.totalVentaConfirmada = {};
    }

    private _processData(): void {
        if (!this.solicitudes.length) {
            this._resetCharts();
            return;
        }

        this.countSolicitudes = this.solicitudes.length;
        this.totalsByCurrency = {};
        this.totalVentaConfirmada = {};
        
        this.solicitudes.forEach(s => {
            const mon = (s.moneda || 'MXN').toUpperCase();
            this.totalsByCurrency[mon] = (this.totalsByCurrency[mon] || 0) + (s.monto || 0);

            // Check for Venta Confirmada (Priority or Type)
            const prio = (s.prioridad || '').toLowerCase();
            const tipo = (s.tipoCompra || '').toLowerCase();
            if (prio.includes('venta confirmada') || tipo.includes('venta confirmada')) {
                this.totalVentaConfirmada[mon] = (this.totalVentaConfirmada[mon] || 0) + (s.monto || 0);
            }
        });

        const totalMontoMXN = this.solicitudes.reduce((acc, curr) => {
            const montoMXN = this._exchangeRateService.convertMontoToMXN(curr.monto || 0, curr.moneda);
            return acc + montoMXN;
        }, 0);
        this.promedioMonto = this.countSolicitudes > 0 ? totalMontoMXN / this.countSolicitudes : 0;

        const colors = { 'MXN': '#6366f1', 'USD': '#10b981', 'EURO': '#f59e0b', 'EUR': '#f59e0b' };
        const uniqueCurrencies = new Set<string>();
        
        // 1. Centro de Costo
        const ccMonedaMap = new Map<string, { [moneda: string]: number }>();
        const uniqueCCs = new Set<string>();
        this.solicitudes.forEach(s => {
            const cc = s.centroCosto || 'Sin Centro de Costo';
            const mon = (s.moneda || 'MXN').toUpperCase();
            uniqueCurrencies.add(mon);
            uniqueCCs.add(cc);
            if (!ccMonedaMap.has(cc)) ccMonedaMap.set(cc, {});
            const ccData = ccMonedaMap.get(cc);
            ccData[mon] = (ccData[mon] || 0) + (s.monto || 0);
        });
        const sortedCCs = Array.from(uniqueCCs).sort();
        const currenciesList = Array.from(uniqueCurrencies).sort();
        const ccSeries = currenciesList.map(mon => ({
            name: mon, data: sortedCCs.map(cc => ccMonedaMap.get(cc)[mon] || 0), color: (colors as any)[mon]
        }));

        // 2. Prioridad
        const prioridadMap = new Map<string, number>();
        this.solicitudes.forEach(s => {
            const p = s.prioridad || 'Normal';
            prioridadMap.set(p, (prioridadMap.get(p) || 0) + 1);
        });
        const priorityData = Array.from(prioridadMap.entries()).map(([name, y]) => {
            let color: any = '#94a3b8';
            if (name.toLowerCase().includes('urgente')) color = { radialGradient: { cx: 0.5, cy: 0.3, r: 0.7 }, stops: [[0, '#fb7185'], [1, '#e11d48']] };
            if (name.toLowerCase().includes('alta')) color = { radialGradient: { cx: 0.5, cy: 0.3, r: 0.7 }, stops: [[0, '#fcd34d'], [1, '#d97706']] };
            if (name.toLowerCase().includes('normal')) color = { radialGradient: { cx: 0.5, cy: 0.3, r: 0.7 }, stops: [[0, '#7dd3fc'], [1, '#0284c7']] };
            if (name.toLowerCase().includes('venta confirmada')) color = { radialGradient: { cx: 0.5, cy: 0.3, r: 0.7 }, stops: [[0, '#a78bfa'], [1, '#7c3aed']] }; // Purple/Violet
            return { name, y, color };
        });

        // 3. Timeline General
        const timelineMonedaMap = new Map<string, Map<number, number>>();
        this.solicitudes.forEach(s => {
            if (!s.fechaSolicitud) return;
            const mon = (s.moneda || 'MXN').toUpperCase();
            const baseDate = (s.fechaSolicitud as any).toJSDate ? (s.fechaSolicitud as any).toJSDate() : s.fechaSolicitud;
            const date = moment(baseDate).startOf('day').valueOf();
            if (!timelineMonedaMap.has(mon)) timelineMonedaMap.set(mon, new Map<number, number>());
            const dateMap = timelineMonedaMap.get(mon);
            dateMap.set(date, (dateMap.get(date) || 0) + (s.monto || 0));
        });
        const timelineSeries: any[] = [];
        timelineMonedaMap.forEach((dateMap, mon) => {
            const seriesData: any[] = [];
            const sortedTimestamps = Array.from(dateMap.keys()).sort((a, b) => a - b);
            if (sortedTimestamps.length > 0) {
                const start = moment(sortedTimestamps[0]).startOf('day');
                const end = moment(sortedTimestamps[sortedTimestamps.length - 1]).startOf('day');
                for (let m = moment(start); m.isSameOrBefore(end); m.add(1, 'days')) {
                    const ts = m.startOf('day').valueOf();
                    const val = dateMap.get(ts) || 0;
                    seriesData.push({ x: ts, y: val, marker: { enabled: val > 0 } });
                }
            }
            timelineSeries.push({ name: mon, data: seriesData, color: (colors as any)[mon] });
        });

        // 4. Sucursal
        const sucMonedaMap = new Map<string, { [moneda: string]: number }>();
        const uniqueSucs = new Set<string>();
        this.solicitudes.forEach(s => {
            const suc = s.sucursal || 'Sin Sucursal';
            const mon = (s.moneda || 'MXN').toUpperCase();
            uniqueSucs.add(suc);
            if (!sucMonedaMap.has(suc)) sucMonedaMap.set(suc, {});
            const sucData = sucMonedaMap.get(suc);
            sucData[mon] = (sucData[mon] || 0) + (s.monto || 0);
        });
        const sortedSucs = Array.from(uniqueSucs).sort();
        this.currenciesList = Array.from(uniqueCurrencies).sort();
        const currenciesListFinal = this.currenciesList;
        const sucursalSeries = currenciesListFinal.map(mon => ({
            name: mon, data: sortedSucs.map(suc => sucMonedaMap.get(suc)[mon] || 0), color: (colors as any)[mon]
        }));

        // 5. Liquidación
        const statusMonedaMap = new Map<string, { [moneda: string]: number }>();
        ['Liquidado', 'Anticipo', 'Pendiente'].forEach(status => statusMonedaMap.set(status, {}));
        this.solicitudes.forEach(s => {
            const mon = (s.moneda || 'MXN').toUpperCase();
            let status = 'Pendiente';
            if (s.estadoLiquidacion === 1) status = 'Liquidado';
            else if (s.estadoLiquidacion === 2) status = 'Anticipo';
            const statusData = statusMonedaMap.get(status);
            if (statusData) statusData[mon] = (statusData[mon] || 0) + (s.monto || 0);
        });
        const liquidacionSeries = [
            { name: 'Liquidado', color: '#10b981', data: currenciesListFinal.map(mon => statusMonedaMap.get('Liquidado')[mon] || 0) },
            { name: 'Anticipo', color: '#f59e0b', data: currenciesListFinal.map(mon => statusMonedaMap.get('Anticipo')[mon] || 0) },
            { name: 'Pendiente', color: '#ef4444', data: currenciesListFinal.map(mon => statusMonedaMap.get('Pendiente')[mon] || 0) }
        ];

        // 6. Forma de Pago
        const paymentMonedaMap = new Map<string, { [moneda: string]: number }>();
        ['Contado', 'Crédito'].forEach(pm => paymentMonedaMap.set(pm, {}));
        this.solicitudes.forEach(s => {
            const mon = (s.moneda || 'MXN').toUpperCase();
            const fp = (s.formaPago || '').toUpperCase();
            let method = fp.includes('CREDITO') ? 'Crédito' : 'Contado';
            const paymentData = paymentMonedaMap.get(method);
            if (paymentData) paymentData[mon] = (paymentData[mon] || 0) + (s.monto || 0);
        });
        const paymentSeries = [
            { name: 'Contado', color: '#38bdf8', data: currenciesListFinal.map(mon => paymentMonedaMap.get('Contado')[mon] || 0) },
            { name: 'Crédito', color: '#818cf8', data: currenciesListFinal.map(mon => paymentMonedaMap.get('Crédito')[mon] || 0) }
        ];

        // 7. Área Solicitante
        const areaMonedaMap = new Map<string, { [moneda: string]: number }>();
        const uniqueAreas = new Set<string>();
        this.solicitudes.forEach(s => {
            const area = s.areaSolicitante || 'Sin Área';
            const mon = (s.moneda || 'MXN').toUpperCase();
            uniqueAreas.add(area);
            if (!areaMonedaMap.has(area)) areaMonedaMap.set(area, {});
            const areaData = areaMonedaMap.get(area);
            areaData[mon] = (areaData[mon] || 0) + (s.monto || 0);
        });
        const sortedAreas = Array.from(uniqueAreas).sort();
        const areaSeries = currenciesListFinal.map(mon => ({
            name: mon, data: sortedAreas.map(area => areaMonedaMap.get(area)[mon] || 0), color: (colors as any)[mon]
        }));

        // 8. Timeline Pago (Daily Contado vs Crédito)
        const timelinePagoMap = new Map<string, Map<number, number>>();
        ['Contado', 'Crédito'].forEach(pm => timelinePagoMap.set(pm, new Map<number, number>()));
        this.solicitudes.forEach(s => {
            if (!s.fechaSolicitud) return;
            const fp = (s.formaPago || '').toUpperCase();
            let method = fp.includes('CREDITO') ? 'Crédito' : 'Contado';
            const baseDate = (s.fechaSolicitud as any).toJSDate ? (s.fechaSolicitud as any).toJSDate() : s.fechaSolicitud;
            const date = moment(baseDate).startOf('day').valueOf();
            const dateMap = timelinePagoMap.get(method);
            if (dateMap) dateMap.set(date, (dateMap.get(date) || 0) + (s.monto || 0));
        });
        const timelinePagoSeries: any[] = [];
        timelinePagoMap.forEach((dateMap, method) => {
            const seriesData: any[] = [];
            const sortedTimestamps = Array.from(dateMap.keys()).sort((a, b) => a - b);
            if (sortedTimestamps.length > 0) {
                const start = moment(sortedTimestamps[0]).startOf('day');
                const end = moment(sortedTimestamps[sortedTimestamps.length - 1]).startOf('day');
                for (let m = moment(start); m.isSameOrBefore(end); m.add(1, 'days')) {
                    const ts = m.startOf('day').valueOf();
                    const val = dateMap.get(ts) || 0;
                    seriesData.push({ x: ts, y: val, marker: { enabled: val > 0 } });
                }
            }
            timelinePagoSeries.push({ name: method, data: seriesData, color: method === 'Contado' ? '#38bdf8' : '#818cf8' });
        });

        this.chartOptionsCentroCosto = this._buildCentroCostoChart(sortedCCs, ccSeries);
        this.chartOptionsPrioridad = this._buildPrioridadChart(priorityData);
        this.chartOptionsTimeline = this._buildTimelineChart(timelineSeries);
        this.chartOptionsSucursal = this._buildSucursalChart(sortedSucs, sucursalSeries);
        this.chartOptionsLiquidacion = this._buildLiquidacionChart(currenciesListFinal, liquidacionSeries);
        this.chartOptionsFormaPago = this._buildFormaPagoChart(currenciesListFinal, paymentSeries);
        this.chartOptionsArea = this._buildAreaChart(sortedAreas, areaSeries);
        this.chartOptionsTimelinePago = this._buildTimelinePagoChart(timelinePagoSeries);
        
        this._changeDetectorRef.markForCheck();
    }

    private _buildTimelineChart(series: any[]): any {
        return Highcharts.merge(this.baseTheme, {
            chart: { type: 'areaspline' },
            xAxis: { type: 'datetime', dateTimeLabelFormats: { day: '%e %b', month: '%b %y' }, gridLineWidth: 0, lineColor: '#e5e7eb' },
            yAxis: { title: { text: 'Inversión' }, gridLineDashStyle: 'Dash', gridLineColor: '#f3f4f6' },
            plotOptions: { areaspline: { fillOpacity: 0.1, lineWidth: 3, marker: { radius: 4, symbol: 'circle' } } },
            series: series
        });
    }

    private _buildCentroCostoChart(categories: string[], series: any[]): any {
        return Highcharts.merge(this.baseTheme, {
            chart: { type: 'column' },
            xAxis: { categories: categories, labels: { rotation: -45, style: { fontSize: '10px' } }, lineColor: '#e5e7eb' },
            yAxis: { title: { text: 'Inversión' }, gridLineColor: '#f3f4f6' },
            plotOptions: { column: { borderRadius: 4, borderWidth: 0 } },
            series: series
        });
    }

    private _buildPrioridadChart(data: any[]): any {
        return Highcharts.merge(this.baseTheme, {
            chart: { type: 'pie' },
            tooltip: { pointFormat: 'Cantidad: <b>{point.y}</b> ({point.percentage:.1f}%)' },
            plotOptions: { pie: { innerSize: '65%', dataLabels: { enabled: true, format: '{point.name}', style: { fontSize: '10px' } }, showInLegend: true } },
            series: [{ name: 'Prioridades', data: data }]
        });
    }

    private _buildSucursalChart(categories: string[], series: any[]): any {
        return Highcharts.merge(this.baseTheme, {
            chart: { type: 'bar' },
            xAxis: { categories: categories, gridLineWidth: 0, lineColor: '#e5e7eb' },
            yAxis: { title: { text: 'Monto Total' }, gridLineColor: '#f3f4f6' },
            plotOptions: { bar: { borderRadius: 8, borderWidth: 0 } },
            series: series
        });
    }

    private _buildLiquidacionChart(categories: string[], series: any[]): any {
        return Highcharts.merge(this.baseTheme, {
            chart: { type: 'column', height: 320 },
            xAxis: { categories: categories, lineColor: '#e5e7eb' },
            yAxis: { title: { text: 'Monto' }, gridLineColor: '#f3f4f6' },
            plotOptions: { column: { stacking: 'normal', borderRadius: 6, dataLabels: { enabled: false } } },
            series: series
        });
    }

    private _buildFormaPagoChart(categories: string[], series: any[]): any {
        return Highcharts.merge(this.baseTheme, {
            chart: { type: 'column', height: 320 },
            xAxis: { categories: categories, lineColor: '#e5e7eb' },
            yAxis: { title: { text: 'Monto' }, gridLineColor: '#f3f4f6' },
            plotOptions: { column: { borderRadius: 6, dataLabels: { enabled: false } } },
            series: series
        });
    }

    private _buildAreaChart(categories: string[], series: any[]): any {
        return Highcharts.merge(this.baseTheme, {
            chart: { type: 'bar' },
            xAxis: { categories: categories, gridLineWidth: 0, lineColor: '#e5e7eb' },
            yAxis: { title: { text: 'Inversión' }, gridLineColor: '#f3f4f6' },
            plotOptions: { bar: { borderRadius: 8, borderWidth: 0 } },
            series: series
        });
    }

    private _buildTimelinePagoChart(series: any[]): any {
        return Highcharts.merge(this.baseTheme, {
            chart: { type: 'spline' },
            xAxis: { type: 'datetime', dateTimeLabelFormats: { day: '%e %b', month: '%b %y' }, gridLineWidth: 0, lineColor: '#e5e7eb' },
            yAxis: { title: { text: 'Monto Diario' }, gridLineDashStyle: 'Dash', gridLineColor: '#f3f4f6' },
            plotOptions: { spline: { lineWidth: 3, marker: { radius: 4, symbol: 'circle' } } },
            series: series
        });
    }
}
