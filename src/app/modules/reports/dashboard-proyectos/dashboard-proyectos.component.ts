import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { HighchartsChartModule } from 'highcharts-angular';
import * as Highcharts from 'highcharts';
import { environment } from 'environments/environment';
import { EngineeringService } from '../../admin/engineering/engineering.service';
import { DashboardDetalleDialogComponent } from './dialogs/dashboard-detalle-dialog.component';

@Component({
    selector: 'app-dashboard-proyectos',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatSelectModule,
        MatInputModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatTooltipModule,
        MatDialogModule,
        HighchartsChartModule
    ],
    templateUrl: './dashboard-proyectos.component.html'
})
export class DashboardProyectosComponent implements OnInit {
    Highcharts: typeof Highcharts = Highcharts;
    proyectos: any[] = [];
    selectedProyectoId: number = 0;
    
    dateRange = new FormGroup({
        start: new FormControl<Date | null>(null),
        end: new FormControl<Date | null>(null)
    });

    metadata: any = {
        proyecto: 'Todos',
        liderProyecto: 'Todos',
        fechaInicio: '-',
        fechaFin: '-',
        duracion: '-',
        diasLaborables: '-',
        nombreCliente: 'Todos'
    };

    tareasVencenHoy: any[] = [];
    tareasAtrasadas: any[] = [];
    todasLasTareas: any[] = [];
    eisenhower: any[] = [];
    progresoGeneral: number = 0;
    isLoading: boolean = false;

    // Highcharts options
    chartPrioridades: Highcharts.Options = {};
    chartResponsables: Highcharts.Options = {};
    chartEstados: Highcharts.Options = {};

    constructor(
        private _http: HttpClient,
        private _engineeringService: EngineeringService,
        private _cdr: ChangeDetectorRef,
        private _dialog: MatDialog
    ) {}

    ngOnInit(): void {
        this.loadProyectos();
        this.onBuscar();
    }

    loadProyectos(): void {
        this._engineeringService.getSeguimientos().subscribe({
            next: (res) => {
                this.proyectos = res || [];
                this._cdr.markForCheck();
            },
            error: (err) => console.error('Error al cargar proyectos:', err)
        });
    }

    onBuscar(): void {
        this.isLoading = true;
        const startVal = this.dateRange.value.start;
        const endVal = this.dateRange.value.end;

        let params: any = {};
        if (this.selectedProyectoId > 0) {
            params.idSeguimiento = this.selectedProyectoId;
        }
        if (startVal) {
            params.fechaInicio = startVal.toISOString();
        }
        if (endVal) {
            params.fechaFin = endVal.toISOString();
        }

        this._http.get<any>(`${environment.apiUrl}/ReportDashboard/dashboard-proyectos`, { params }).subscribe({
            next: (res) => {
                this.isLoading = false;
                if (res) {
                    this.metadata = res.metadata || {};
                    this.tareasVencenHoy = res.tareasVencenHoy || [];
                    this.tareasAtrasadas = res.tareasAtrasadas || [];
                    this.todasLasTareas = res.todasLasTareas || [];
                    this.eisenhower = res.eisenhowerMatrix || [];
                    this.progresoGeneral = res.progresoGeneralTareas || 0;

                    this.buildCharts(res);
                }
                this._cdr.markForCheck();
            },
            error: (err) => {
                this.isLoading = false;
                console.error(err);
                this._cdr.markForCheck();
            }
        });
    }

    clearFilters(): void {
        this.selectedProyectoId = 0;
        this.dateRange.reset();
        this.onBuscar();
    }

    getEisenhowerColor(cuadrante: string): string {
        switch (cuadrante) {
            case 'Haz Primero': return '#ef4444'; // Red
            case 'Programar': return '#3b82f6'; // Blue
            case 'Delegar': return '#10b981'; // Green
            case 'No Hacer': return '#64748b'; // Slate
            default: return '#6366f1';
        }
    }

    getEisenhowerBg(cuadrante: string): string {
        switch (cuadrante) {
            case 'Haz Primero': return 'bg-red-50 text-red-700 border-red-200 cursor-pointer hover:shadow-md transition-shadow';
            case 'Programar': return 'bg-blue-50 text-blue-700 border-blue-200 cursor-pointer hover:shadow-md transition-shadow';
            case 'Delegar': return 'bg-emerald-50 text-emerald-700 border-emerald-200 cursor-pointer hover:shadow-md transition-shadow';
            case 'No Hacer': return 'bg-slate-50 text-slate-700 border-slate-200 cursor-pointer hover:shadow-md transition-shadow';
            default: return 'bg-slate-50 text-slate-700';
        }
    }

    getPrioridadBadge(prioridad: string): string {
        const p = prioridad?.toLowerCase() || '';
        if (p.includes('alta') || p.includes('urgente')) return 'bg-red-100 text-red-800';
        if (p.includes('baja')) return 'bg-slate-100 text-slate-800';
        return 'bg-blue-100 text-blue-800';
    }

    // Abre el diálogo detallado según el cuadrante o listado clickeado
    openDetalle(titulo: string, tipo: string): void {
        let listadoFiltrado: any[] = [];
        const sourceList = this.todasLasTareas || [];

        if (tipo === 'vencen-hoy') {
            listadoFiltrado = this.tareasVencenHoy;
        } else if (tipo === 'atrasadas') {
            listadoFiltrado = this.tareasAtrasadas;
        } else if (tipo === 'eisenhower') {
            const cuadranteName = titulo;
            if (cuadranteName === 'Haz Primero') {
                listadoFiltrado = sourceList.filter(t => (t.prioridad === 'Alta' || t.prioridad === 'Muy Alta' || t.prioridad === 'IMPORTANTE URGENTE') && t.estado !== 'Completado');
            } else if (cuadranteName === 'Programar') {
                listadoFiltrado = sourceList.filter(t => (t.prioridad === 'Media' || t.prioridad === 'IMPORTANTE NO URGENTE') && t.estado !== 'Completado');
            } else if (cuadranteName === 'Delegar') {
                listadoFiltrado = sourceList.filter(t => (t.prioridad === 'Baja' || t.prioridad === 'NO IMPORTANTE URGENTE') && t.estado !== 'Completado');
            } else {
                listadoFiltrado = sourceList.filter(t => t.prioridad === 'Muy Baja' || t.prioridad === 'NO IMPORTANTE NO URGENTE' || t.estado === 'Completado');
            }
        } else if (tipo === 'prioridad') {
            // El título viene formateado como "Prioridad: X"
            const prioridadRequerida = titulo.replace('Prioridad:', '').trim().toLowerCase();
            listadoFiltrado = sourceList.filter(t => t.prioridad?.toLowerCase() === prioridadRequerida);
        } else if (tipo === 'responsable') {
            // El título viene formateado como "Tareas de X"
            const responsableRequerido = titulo.replace('Tareas de', '').trim().toLowerCase();
            listadoFiltrado = sourceList.filter(t => t.responsable?.toLowerCase().includes(responsableRequerido));
        } else if (tipo === 'estado') {
            // El título viene formateado como "Estado: X"
            const estadoRequerido = titulo.replace('Estado:', '').trim().toLowerCase();
            listadoFiltrado = sourceList.filter(t => t.estado?.toLowerCase() === estadoRequerido);
        }

        this._dialog.open(DashboardDetalleDialogComponent, {
            width: '90vw',
            maxWidth: '1000px',
            data: {
                titulo: titulo,
                tareas: listadoFiltrado
            }
        });
    }

    private buildCharts(data: any): void {
        const self = this;
        // 1. Prioridades (Highcharts Horizontal Bar)
        const prioLabels = (data.prioridadesGrafico || []).map((x: any) => x.label);
        const prioValues = (data.prioridadesGrafico || []).map((x: any) => x.cantidad);
        
        this.chartPrioridades = {
            chart: { type: 'bar', height: 240, backgroundColor: 'transparent' },
            title: { text: '' },
            xAxis: { categories: prioLabels, gridLineWidth: 0 },
            yAxis: { title: { text: '' }, tickInterval: 1 },
            legend: { enabled: false },
            credits: { enabled: false },
            plotOptions: {
                bar: {
                    borderRadius: 6,
                    colorByPoint: true,
                    colors: ['#ef4444', '#f59e0b', '#3b82f6', '#64748b'],
                    cursor: 'pointer',
                    point: {
                        events: {
                            click: function() {
                                self.openDetalle(`Prioridad: ${this.category}`, 'prioridad');
                            }
                        }
                    }
                }
            },
            series: [{
                name: 'Tareas',
                type: 'bar',
                data: prioValues
            }] as any
        };

        // 2. Responsables (Highcharts Column)
        const respLabels = (data.responsablesGrafico || []).map((x: any) => x.label);
        const respValues = (data.responsablesGrafico || []).map((x: any) => x.cantidad);

        this.chartResponsables = {
            chart: { type: 'column', height: 240, backgroundColor: 'transparent' },
            title: { text: '' },
            xAxis: { categories: respLabels, labels: { rotation: -45 } },
            yAxis: { title: { text: '' }, tickInterval: 1 },
            legend: { enabled: false },
            credits: { enabled: false },
            plotOptions: {
                column: {
                    borderRadius: 6,
                    color: '#6366f1',
                    cursor: 'pointer',
                    point: {
                        events: {
                            click: function() {
                                self.openDetalle(`Tareas de ${this.category}`, 'responsable');
                            }
                        }
                    }
                }
            },
            series: [{
                name: 'Tareas',
                type: 'column',
                data: respValues
            }] as any
        };

        // 3. Estados (Highcharts Pie/Donut)
        const estData = (data.estadosGrafico || []).map((x: any) => ({
            name: x.label,
            y: x.cantidad
        }));

        this.chartEstados = {
            chart: { type: 'pie', height: 240, backgroundColor: 'transparent' },
            title: { text: '' },
            credits: { enabled: false },
            plotOptions: {
                pie: {
                    innerSize: '60%',
                    cursor: 'pointer',
                    dataLabels: { enabled: false },
                    showInLegend: true,
                    point: {
                        events: {
                            click: function() {
                                self.openDetalle(`Estado: ${this.name}`, 'estado');
                            }
                        }
                    }
                }
            },
            legend: { align: 'center', verticalAlign: 'bottom', layout: 'horizontal' },
            series: [{
                name: 'Tareas',
                type: 'pie',
                data: estData
            }] as any
        };
    }
}
