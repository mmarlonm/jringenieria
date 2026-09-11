import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
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
    private _router = inject(Router);

    // State Variables
    public metricas!: DashboardMetricasDto;
    public ediciones: EventoEdicion[] = [];
    public selectedEventoId: number = 2026;
    public signalrStatus: string = 'Disconnected';
    public ultimosIngresos: Asistente[] = [];
    public talleresMetrics: ActividadMetricsDto[] = [];
    public chartView: '15min' | '1h' | 'jornada' = 'jornada';
    private _fullHistorial: { hora: string; cantidad: number }[] = [];

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

    public irAEncuestas(): void {
        this._router.navigate(['/eventos/encuestas-dashboard'], { queryParams: { id: this.selectedEventoId } });
    }

    public getAsistenciaPorcentaje(): number {
        if (!this.metricas || this.metricas.totalRegistrados === 0) return 0;
        return Math.round((this.metricas.totalAsistieron / this.metricas.totalRegistrados) * 100);
    }

    public setChartView(view: '15min' | '1h' | 'jornada'): void {
        this.chartView = view;
        this._applyChartView();
        this._cdr.markForCheck();
    }

    public get isEventoPasado(): boolean {
        if (!this.ediciones || this.ediciones.length === 0) return false;
        const ed = this.ediciones.find(e => e.id === this.selectedEventoId);
        if (!ed) return false;
        const currentYear = new Date().getFullYear();
        return ((ed as any).anio || 0) < currentYear;
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
        this.chartAsistencia = {
            chart: {
                type: 'area',
                height: '100%',
                toolbar: { show: false },
                background: 'transparent',
                animations: { enabled: true, speed: 500, dynamicAnimation: { enabled: true, speed: 300 } },
                zoom: { enabled: false }
            },
            colors: ['#6366f1'],
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 2.5 },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.35,
                    opacityTo: 0.02,
                    stops: [0, 100]
                }
            },
            markers: {
                size: 4,
                colors: ['#6366f1'],
                strokeColors: '#fff',
                strokeWidth: 2,
                hover: { size: 7 }
            },
            xaxis: {
                categories: [],
                labels: {
                    style: { colors: '#94a3b8', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: '600' }
                },
                axisBorder: { show: false },
                axisTicks: { show: false },
                crosshairs: {
                    show: true,
                    stroke: { color: '#6366f1', width: 1, dashArray: 4 }
                }
            },
            yaxis: {
                labels: {
                    style: { colors: '#94a3b8', fontFamily: 'Inter, sans-serif', fontSize: '10px' },
                    formatter: (val: number) => `${val} pers/h`
                },
                min: 0
            },
            grid: {
                borderColor: 'rgba(148, 163, 184, 0.07)',
                strokeDashArray: 4,
                padding: { top: 4, right: 8, bottom: 0, left: 8 }
            },
            tooltip: {
                theme: 'dark',
                x: { show: true },
                y: {
                    title: { formatter: () => 'Ingresos: ' },
                    formatter: (val: number) => `${val} personas`
                },
                style: { fontFamily: 'Inter, sans-serif', fontSize: '11px' }
            },
            annotations: {}
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
                                color: '#6366f1',
                                formatter: (val) => val
                            },
                            total: {
                                show: true,
                                label: 'Total',
                                color: '#94a3b8',
                                formatter: (w) => {
                                    return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0).toString();
                                }
                            }
                        }
                    }
                }
            },
            stroke: { width: 2, colors: ['rgba(30, 41, 59, 0.2)'] },
            dataLabels: { enabled: false },
            tooltip: { theme: 'dark' }
        };
    }

    /**
     * Aggregates time-series data into fixed-minute buckets.
     * Parses hora strings like "09:15" and groups them.
     */
    private _bucketData(
        data: { hora: string; cantidad: number }[],
        intervalMinutes: number
    ): { hora: string; cantidad: number }[] {
        if (!data || data.length === 0) return [];

        const buckets = new Map<string, number>();

        data.forEach(point => {
            const parts = (point.hora || '').split(':');
            if (parts.length >= 2) {
                const h = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10);
                if (!isNaN(h) && !isNaN(m)) {
                    const totalMin = h * 60 + m;
                    const bucketMin = Math.floor(totalMin / intervalMinutes) * intervalMinutes;
                    const bh = Math.floor(bucketMin / 60);
                    const bm = bucketMin % 60;
                    const key = `${bh.toString().padStart(2, '0')}:${bm.toString().padStart(2, '0')}`;
                    buckets.set(key, (buckets.get(key) || 0) + point.cantidad);
                    return;
                }
            }
            // Fallback: use hora as-is
            buckets.set(point.hora, (buckets.get(point.hora) || 0) + point.cantidad);
        });

        return Array.from(buckets.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([hora, cantidad]) => ({ hora, cantidad }));
    }

    private _applyChartView(): void {
        // Aggregate into appropriate buckets — always show ALL data (first to last entry)
        let data: { hora: string; cantidad: number }[];
        let yLabel: string;
        let tooltipLabel: string;

        if (this.chartView === '15min') {
            data = this._bucketData(this._fullHistorial, 15);
            yLabel = 'pers/15min';
            tooltipLabel = 'Ingresos (c/15 min): ';
        } else if (this.chartView === '1h') {
            data = this._bucketData(this._fullHistorial, 60);
            yLabel = 'pers/hora';
            tooltipLabel = 'Ingresos por hora: ';
        } else {
            data = [...this._fullHistorial];
            yLabel = 'personas';
            tooltipLabel = 'Total ingresos: ';
        }

        const hours = data.map(h => h.hora);
        const values = data.map(h => h.cantidad);

        // Peak annotation
        const maxVal = values.length > 0 ? Math.max(...values) : 0;
        const maxIdx = values.indexOf(maxVal);
        const peakHora = maxIdx >= 0 ? hours[maxIdx] : null;

        const annotations: any = {};
        if (peakHora && maxVal > 0) {
            annotations.points = [{
                x: peakHora,
                y: maxVal,
                marker: { size: 8, fillColor: '#f59e0b', strokeColor: '#fff', strokeWidth: 2, radius: 3 },
                label: {
                    text: `\u2B50 Pico: ${maxVal} ${yLabel}`,
                    borderColor: 'transparent',
                    offsetY: -14,
                    style: {
                        background: '#1e293b',
                        color: '#f59e0b',
                        fontSize: '10px',
                        fontWeight: '700',
                        fontFamily: 'Inter, sans-serif',
                        padding: { left: 8, right: 8, top: 4, bottom: 4 }
                    }
                }
            }];
        }

        // 'Ahora' vertical line — only for live (non-past) events
        if (hours.length > 0 && !this.isEventoPasado) {
            annotations.xaxis = [{
                x: hours[hours.length - 1],
                borderColor: '#818cf8',
                borderWidth: 2,
                strokeDashArray: 5,
                label: {
                    text: `\u26A1 Ahora (${hours[hours.length - 1]})`,
                    borderColor: 'transparent',
                    orientation: 'horizontal',
                    position: 'top',
                    style: {
                        background: '#6366f1',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: '700',
                        fontFamily: 'Inter, sans-serif',
                        padding: { left: 8, right: 8, top: 3, bottom: 3 }
                    }
                }
            }];
        }

        this.chartAsistencia = {
            ...this.chartAsistencia,
            series: [{ name: 'Asistieron', data: values }],
            xaxis: { ...this.chartAsistencia.xaxis, categories: hours },
            yaxis: {
                ...this.chartAsistencia.yaxis,
                labels: {
                    style: { colors: '#94a3b8', fontFamily: 'Inter, sans-serif', fontSize: '10px' },
                    formatter: (val: number) => `${val} ${yLabel}`
                }
            },
            tooltip: {
                ...this.chartAsistencia.tooltip,
                y: {
                    title: { formatter: () => tooltipLabel },
                    formatter: (val: number) => `${val} personas`
                }
            },
            annotations
        };
    }

    private updateCharts(metrics: DashboardMetricasDto): void {
        if (!metrics) return;

        // Store full history for filtering by view
        this._fullHistorial = metrics.historialAsistenciaTiempoReal || [];
        this._applyChartView();

        // Update diffusion channels chart
        const labels = metrics.mediosDifusion.map(m => m.medio);
        const counts = metrics.mediosDifusion.map(m => m.cantidad);
        this.chartMedios = { ...this.chartMedios, series: counts, labels };
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
