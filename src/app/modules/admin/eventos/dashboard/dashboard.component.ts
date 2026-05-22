import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EventosService, DashboardMetricasDto, EventoEdicion } from '../eventos.service';

@Component({
    selector: 'eventos-dashboard',
    templateUrl: './dashboard.component.html',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatSelectModule,
        NgApexchartsModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventosDashboardComponent implements OnInit, OnDestroy {
    private _eventosService = inject(EventosService);
    private _cdr = inject(ChangeDetectorRef);

    // State Variables
    public metricas!: DashboardMetricasDto;
    public ediciones: EventoEdicion[] = [];
    public selectedEventoId: number = 2026;
    public signalrStatus: string = 'Disconnected';


    // ApexCharts Configurations
    public chartAsistencia: ApexOptions = {};
    public chartMedios: ApexOptions = {};

    private destroy$ = new Subject<void>();

    ngOnInit(): void {
        this.ediciones = this._eventosService.ediciones;

        // Initialize empty chart configs
        this.initChartsConfig();

        // Subscribe to Selected Event ID
        this._eventosService.selectedEventoId$
            .pipe(takeUntil(this.destroy$))
            .subscribe(id => {
                this.selectedEventoId = id;
                this._cdr.markForCheck();
            });

        // Subscribe to SignalR connection status
        this._eventosService.signalrStatus$
            .pipe(takeUntil(this.destroy$))
            .subscribe(status => {
                this.signalrStatus = status;
                this._cdr.markForCheck();
            });



        // Subscribe to Metrics stream (SignalR ReceiveLiveMetrics + REST Fallback)
        this._eventosService.metricas$
            .pipe(takeUntil(this.destroy$))
            .subscribe(metrics => {
                this.metricas = metrics;
                this.updateCharts(metrics);
                this._cdr.markForCheck();
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // --- UI Interactions ---

    public onEventoChanged(eventoId: number): void {
        this._eventosService.setSeleccionEdicion(eventoId);
    }



    public getAsistenciaPorcentaje(): number {
        if (!this.metricas || this.metricas.totalRegistrados === 0) return 0;
        return Math.round((this.metricas.totalAsistieron / this.metricas.totalRegistrados) * 100);
    }

    // --- Chart Helpers ---

    private initChartsConfig(): void {
        // Attendance chart config (Area chart for modern feel)
        this.chartAsistencia = {
            chart: {
                type: 'area',
                height: 320,
                toolbar: { show: false },
                animations: { enabled: true, speed: 800 }
            },
            colors: ['#6366f1'], // Indigo
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 3 },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.45,
                    opacityTo: 0.05,
                    stops: [0, 100]
                }
            },
            xaxis: {
                categories: [],
                labels: {
                    style: { colors: '#94a3b8', fontFamily: 'Inter, sans-serif' }
                },
                axisBorder: { show: false },
                axisTicks: { show: false }
            },
            yaxis: {
                labels: {
                    style: { colors: '#94a3b8', fontFamily: 'Inter, sans-serif' }
                }
            },
            grid: {
                borderColor: '#f1f5f9',
                strokeDashArray: 4
            },
            tooltip: {
                theme: 'light',
                x: { show: true },
                y: {
                    title: { formatter: () => 'Check-ins: ' }
                }
            }
        };

        // Donut chart config
        this.chartMedios = {
            chart: {
                type: 'donut',
                height: 320,
                animations: { enabled: true, speed: 600 }
            },
            colors: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#ec4899'],
            labels: [],
            legend: {
                position: 'bottom',
                fontSize: '13px',
                fontFamily: 'Inter, sans-serif',
                labels: { colors: '#64748b' },
                itemMargin: { horizontal: 8, vertical: 4 }
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: '72%',
                        labels: {
                            show: true,
                            name: {
                                show: true,
                                fontSize: '14px',
                                fontFamily: 'Inter, sans-serif',
                                color: '#64748b'
                            },
                            value: {
                                show: true,
                                fontSize: '24px',
                                fontFamily: 'Outfit, Inter, sans-serif',
                                color: '#1e293b',
                                formatter: (val) => val
                            },
                            total: {
                                show: true,
                                label: 'Total',
                                color: '#64748b',
                                formatter: (w) => {
                                    return w.globals.seriesTotals.reduce((a, b) => a + b, 0).toString();
                                }
                            }
                        }
                    }
                }
            },
            dataLabels: { enabled: false },
            tooltip: { theme: 'light' }
        };
    }

    private updateCharts(metrics: DashboardMetricasDto): void {
        if (!metrics) return;

        // Update attendance chart
        const hours = metrics.historialAsistenciaTiempoReal.map(h => h.hora);
        const values = metrics.historialAsistenciaTiempoReal.map(h => h.cantidad);

        this.chartAsistencia = {
            ...this.chartAsistencia,
            series: [{
                name: 'Asistieron',
                data: values
            }],
            xaxis: {
                ...this.chartAsistencia.xaxis,
                categories: hours
            }
        };

        // Update diffusion channels chart
        const labels = metrics.mediosDifusion.map(m => m.medio);
        const counts = metrics.mediosDifusion.map(m => m.cantidad);

        this.chartMedios = {
            ...this.chartMedios,
            series: counts,
            labels: labels
        };
    }
}
