import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import moment from 'moment';

// 🔹 Highcharts
import * as Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';
import Exporting from 'highcharts/modules/exporting';

// 🔹 Material
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatNativeDateModule } from '@angular/material/core';

// 🔹 Service & Types
import { SolicitudCompraService } from '../solicitudes-compra/solicitud-compra.service';
import { SolicitudCompra } from '../solicitudes-compra/models/solicitud-compra.types';

// Initialize Highcharts modules
if (typeof Exporting === 'function') {
    Exporting(Highcharts);
}

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
        MatNativeDateModule
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
    
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    // Base Theme for charts
    private baseTheme: Highcharts.Options = {
        chart: { 
            backgroundColor: 'transparent',
            spacingBottom: 20,
            spacingTop: 10,
            spacingLeft: 10,
            spacingRight: 10
        },
        title: { text: undefined },
        credits: { enabled: false },
        legend: { 
            itemStyle: { color: '#4b5563', fontWeight: 'normal', fontSize: '11px' },
            margin: 10,
            padding: 5
        },
        tooltip: { 
            backgroundColor: '#ffffff', 
            style: { color: '#1f2937' }, 
            borderColor: '#e5e7eb', 
            borderRadius: 8, 
            shadow: true 
        }
    };

    constructor(
        private _solicitudCompraService: SolicitudCompraService,
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
        
        const start = this.fechaInicio instanceof Date ? this.fechaInicio.toISOString().split('T')[0] : this.fechaInicio;
        const end = this.fechaFin instanceof Date ? this.fechaFin.toISOString().split('T')[0] : this.fechaFin;
        
        this._solicitudCompraService.getTodas(start, end).subscribe({
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

        // 1. Calculate KPIs
        this.countSolicitudes = this.solicitudes.length;
        this.totalMonto = this.solicitudes.reduce((acc, curr) => acc + (curr.monto || 0), 0);
        this.promedioMonto = this.countSolicitudes > 0 ? this.totalMonto / this.countSolicitudes : 0;

        // 2. Group by Centro de Costo (Monto)
        const centroCostoMap = new Map<string, number>();
        this.solicitudes.forEach(s => {
            const cc = s.centroCosto || 'Sin Centro de Costo';
            centroCostoMap.set(cc, (centroCostoMap.get(cc) || 0) + (s.monto || 0));
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
                let color = '#94a3b8'; // default
                if (name.toLowerCase().includes('urgente')) color = '#f43f5e';
                if (name.toLowerCase().includes('alta')) color = '#fbbf24';
                if (name.toLowerCase().includes('normal')) color = '#38bdf8';
                return { name, y, color };
            });

        // 4. Build Charts
        this.chartOptionsCentroCosto = this._buildCentroCostoChart(ccData);
        this.chartOptionsPrioridad = this._buildPrioridadChart(priorityData);
        
        this._changeDetectorRef.markForCheck();
    }

    private _buildCentroCostoChart(data: any[]): Highcharts.Options {
        return {
            ...this.baseTheme,
            chart: { ...this.baseTheme.chart, type: 'column' },
            xAxis: {
                type: 'category',
                labels: { rotation: -45, style: { fontSize: '10px', color: '#6b7280' } },
                lineColor: '#d1d5db'
            },
            yAxis: {
                title: { text: null },
                labels: { format: '${value:.,0f}', style: { color: '#6b7280' } },
                gridLineColor: '#f3f4f6'
            },
            legend: { enabled: false },
            tooltip: { ...this.baseTheme.tooltip, valuePrefix: '$', valueDecimals: 2 },
            plotOptions: {
                column: { borderRadius: 4, color: '#6366f1' }
            },
            series: [{
                type: 'column',
                name: 'Monto Total',
                data: data,
                colorByPoint: false
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
                        format: '<b>{point.name}</b>: {point.y}',
                    },
                    showInLegend: true,
                    innerSize: '50%'
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
        this._changeDetectorRef.markForCheck();
    }
}
