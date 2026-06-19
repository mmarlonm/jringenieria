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
import { EventosService, DashboardMetricasDto, EventoEdicion, Asistente, ActividadMetricsDto } from '../eventos.service';

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
    public ultimosIngresos: Asistente[] = [];
    public talleresMetrics: ActividadMetricsDto[] = [];

    private fullAnnouncedIds = new Set<number>();
    private soonAnnouncedIds = new Set<number>();
    private checkSoonInterval: any;

    // ApexCharts Configurations
    public chartAsistencia: ApexOptions = {};
    public chartMedios: ApexOptions = {};

    private destroy$ = new Subject<void>();

    ngOnInit(): void {
        this._eventosService.ediciones$
            .pipe(takeUntil(this.destroy$))
            .subscribe(list => {
                this.ediciones = list || [];
                this._cdr.markForCheck();
            });

        // Initialize empty chart configs
        this.initChartsConfig();

        // Subscribe to Selected Event ID
        this._eventosService.selectedEventoId$
            .pipe(takeUntil(this.destroy$))
            .subscribe(id => {
                this.selectedEventoId = id;
                this._eventosService.loadTalleresMetrics(id);
                this._cdr.markForCheck();
            });

        // Subscribe to SignalR connection status
        this._eventosService.signalrStatus$
            .pipe(takeUntil(this.destroy$))
            .subscribe(status => {
                this.signalrStatus = status;
                this._cdr.markForCheck();
            });

        // Subscribe to Assistants stream to display real-time check-ins
        this._eventosService.asistentes$
            .pipe(takeUntil(this.destroy$))
            .subscribe(list => {
                if (list) {
                    this.ultimosIngresos = list
                        .filter(a => a.asistencia === 'Presente' && a.fechaCheckInRaw)
                        .sort((a, b) => (b.fechaCheckInRaw || '').localeCompare(a.fechaCheckInRaw || '')) // Chronological sort (newest first)
                        .slice(0, 5); // Take the top 5
                    this._cdr.markForCheck();
                }
            });

        // Subscribe to Metrics stream (SignalR ReceiveLiveMetrics + REST Fallback)
        this._eventosService.metricas$
            .pipe(takeUntil(this.destroy$))
            .subscribe(metrics => {
                this.metricas = metrics;
                this.updateCharts(metrics);
                this._cdr.markForCheck();
            });

        // Subscribe to Workshop Metrics stream
        this._eventosService.talleresMetrics$
            .pipe(takeUntil(this.destroy$))
            .subscribe(metrics => {
                this.talleresMetrics = metrics || [];
                this.checkFullWorkshopsAlerts(this.talleresMetrics);
                this._cdr.markForCheck();
            });

        // Check starting soon workshops and setup interval
        this.checkWorkshopsStartingSoon();
        this.checkSoonInterval = setInterval(() => {
            this.checkWorkshopsStartingSoon();
        }, 30000);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        if (this.checkSoonInterval) {
            clearInterval(this.checkSoonInterval);
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }

    // --- UI Interactions ---

    public onEventoChanged(eventoId: number): void {
        this._eventosService.setSeleccionEdicion(eventoId);
    }

    public getAsistenciaPorcentaje(): number {
        if (!this.metricas || this.metricas.totalRegistrados === 0) return 0;
        return Math.round((this.metricas.totalAsistieron / this.metricas.totalRegistrados) * 100);
    }

    // --- Workshop Capacity Helpers ---
    public getOccupancyPercent(taller: ActividadMetricsDto): number {
        if (!taller || taller.cupoMaximo === 0) return 0;
        return Math.min(100, Math.round((taller.ingresaronActuales / taller.cupoMaximo) * 100));
    }

    public getProgressBarColor(taller: ActividadMetricsDto): string {
        const percent = this.getOccupancyPercent(taller);
        if (percent < 70) return 'bg-emerald-500';
        if (percent < 100) return 'bg-amber-500';
        return 'bg-rose-500 animate-pulse';
    }

    // --- Chart Helpers ---

    private initChartsConfig(): void {
        // Attendance chart config (Area chart for modern feel)
        this.chartAsistencia = {
            chart: {
                type: 'area',
                height: 250,
                toolbar: { show: false },
                background: 'transparent',
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
                borderColor: 'rgba(148, 163, 184, 0.08)',
                strokeDashArray: 4
            },
            tooltip: {
                theme: 'dark',
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
                background: 'transparent',
                animations: { enabled: true, speed: 600 }
            },
            colors: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#ec4899'],
            labels: [],
            legend: {
                position: 'bottom',
                fontSize: '11px',
                fontFamily: 'Inter, sans-serif',
                labels: { colors: '#94a3b8' },
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
                                fontSize: '13px',
                                fontFamily: 'Inter, sans-serif',
                                color: '#94a3b8'
                            },
                            value: {
                                show: true,
                                fontSize: '24px',
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 'bold',
                                color: '#6366f1', // Always Indigo for high contrast readability
                                formatter: (val) => val
                            },
                            total: {
                                show: true,
                                label: 'Total',
                                color: '#94a3b8',
                                formatter: (w) => {
                                    return w.globals.seriesTotals.reduce((a, b) => a + b, 0).toString();
                                }
                            }
                        }
                    }
                }
            },
            stroke: {
                width: 2,
                colors: ['rgba(30, 41, 59, 0.2)']
            },
            dataLabels: { enabled: false },
            tooltip: { theme: 'dark' }
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

    private checkFullWorkshopsAlerts(metrics: ActividadMetricsDto[]): void {
        metrics.forEach(taller => {
            const isFull = taller.estaLleno || (taller.ingresaronActuales >= taller.cupoMaximo);
            if (isFull) {
                if (!this.fullAnnouncedIds.has(taller.actividadId)) {
                    this.fullAnnouncedIds.add(taller.actividadId);
                    const announcement = `Atención: El taller "${taller.titulo}" ha alcanzado su cupo máximo.`;
                    this.playChimeThenAnnounce(announcement);
                }
            } else {
                if (this.fullAnnouncedIds.has(taller.actividadId)) {
                    this.fullAnnouncedIds.delete(taller.actividadId);
                }
            }
        });
    }

    private checkWorkshopsStartingSoon(): void {
        const now = new Date();
        this.talleresMetrics.forEach(taller => {
            if (!taller.fechaHoraInicio) return;
            const startTime = new Date(taller.fechaHoraInicio);
            const diffMs = startTime.getTime() - now.getTime();
            const diffMins = diffMs / (1000 * 60);

            // Announce if workshop starts in 10 to 15.5 minutes
            if (diffMins > 10 && diffMins <= 15.5 && !this.soonAnnouncedIds.has(taller.actividadId)) {
                this.soonAnnouncedIds.add(taller.actividadId);
                const announcement = `El taller "${taller.titulo}" iniciará en quince minutos. Por favor, proceda a su sala.`;
                this.playChimeThenAnnounce(announcement);
            }
        });
    }

    private announceText(text: string): void {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'es-ES';
            utterance.rate = 0.95;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    }

    private playChimeThenAnnounce(announcement: string): void {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const playTone = (freq: number, start: number, duration: number) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, start);
                gain.gain.setValueAtTime(0, start);
                gain.gain.linearRampToValueAtTime(0.15, start + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
                osc.start(start);
                osc.stop(start + duration);
            };

            playTone(587.33, audioCtx.currentTime, 0.4); // D5
            playTone(880.00, audioCtx.currentTime + 0.15, 0.5); // A5

            setTimeout(() => {
                this.announceText(announcement);
            }, 500);
        } catch (e) {
            this.announceText(announcement);
        }
    }
}
