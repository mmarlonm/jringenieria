import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import * as Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';
import { Subject, of } from 'rxjs';
import { catchError, map, switchMap, takeUntil } from 'rxjs/operators';
import { ReporteEncuestaService } from './reporte-encuesta.service';
import { FormularioReporteResumenDto, ReporteEncuestaDetalleDto } from './reporte-encuesta.types';
import { PreguntaReporteComponent } from '../../eventos/reporte-respuestas/pregunta-reporte.component';
import { opcionesPorDia } from '../../eventos/reporte-respuestas/reporte-respuestas.charts';

@Component({
    selector: 'app-reporte-encuesta',
    templateUrl: './reporte-encuesta.component.html',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        HighchartsChartModule,
        MatButtonModule,
        MatIconModule,
        MatSelectModule,
        MatFormFieldModule,
        MatInputModule,
        MatProgressSpinnerModule,
        PreguntaReporteComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReporteEncuestaComponent implements OnInit, OnDestroy {
    public Highcharts: typeof Highcharts = Highcharts;

    private _route = inject(ActivatedRoute);
    private _servicio = inject(ReporteEncuestaService);
    private _cdr = inject(ChangeDetectorRef);

    public tipo: 'producto' | 'servicio' = 'producto';

    public formularios: FormularioReporteResumenDto[] = [];
    public formularioId: number | null = null;
    public desde: string = '';
    public hasta: string = '';

    public reporteDetalle: ReporteEncuestaDetalleDto | null = null;
    public cargandoFormularios: boolean = false;
    public cargandoReporte: boolean = false;
    public errorFormularios: string | null = null;
    public errorReporte: string | null = null;
    public opcionesPorDia: Highcharts.Options | null = null;

    private _destroy$ = new Subject<void>();
    private _solicitudReporte$ = new Subject<{ formularioId: number; desde?: string | null; hasta?: string | null }>();

    ngOnInit(): void {
        const rutaTipo = this._route.snapshot.data['tipo'];
        if (rutaTipo === 'servicio' || rutaTipo === 'producto') {
            this.tipo = rutaTipo;
        }

        this._solicitudReporte$
            .pipe(
                switchMap(peticion => {
                    this.cargandoReporte = true;
                    this.errorReporte = null;
                    this._cdr.markForCheck();
                    return this._servicio.obtenerReporte(this.tipo, peticion.formularioId, peticion.desde, peticion.hasta).pipe(
                        map(rep => ({ rep, err: null as any })),
                        catchError(err => of({ rep: null as ReporteEncuestaDetalleDto | null, err }))
                    );
                }),
                takeUntil(this._destroy$)
            )
            .subscribe(({ rep, err }) => {
                this.cargandoReporte = false;
                this.reporteDetalle = rep;
                this.errorReporte = rep ? null : (err?.error?.mensaje || 'No se pudo generar el reporte.');
                this.opcionesPorDia = rep && rep.reporte?.resumen?.porDia && rep.reporte.resumen.porDia.length > 0
                    ? opcionesPorDia(rep.reporte.resumen)
                    : null;
                this._cdr.markForCheck();
            });

        this.cargarFormularios();
    }

    public cargarFormularios(): void {
        this.cargandoFormularios = true;
        this.errorFormularios = null;
        this._cdr.markForCheck();

        this._servicio.obtenerFormularios(this.tipo)
            .pipe(takeUntil(this._destroy$))
            .subscribe({
                next: (items) => {
                    this.formularios = items || [];
                    this.cargandoFormularios = false;
                    if (this.formularios.length > 0) {
                        this.formularioId = this.formularios[0].id;
                        this.solicitarReporte();
                    } else {
                        this.formularioId = null;
                        this.reporteDetalle = null;
                    }
                    this._cdr.markForCheck();
                },
                error: (err) => {
                    this.cargandoFormularios = false;
                    this.errorFormularios = err?.error?.mensaje || 'No se pudieron cargar los formularios disponibles.';
                    this._cdr.markForCheck();
                }
            });
    }

    public solicitarReporte(): void {
        if (!this.formularioId) {
            return;
        }

        const desdeLimpio = this.desde ? this.desde.trim() : '';
        const hastaLimpio = this.hasta ? this.hasta.trim() : '';

        if (desdeLimpio && hastaLimpio && desdeLimpio > hastaLimpio) {
            this.errorReporte = 'La fecha inicial no puede ser posterior a la final.';
            this.cargandoReporte = false;
            this._cdr.markForCheck();
            return;
        }

        this.errorReporte = null;
        this._solicitudReporte$.next({
            formularioId: this.formularioId,
            desde: desdeLimpio || null,
            hasta: hastaLimpio || null
        });
    }

    public limpiarFechas(): void {
        this.desde = '';
        this.hasta = '';
        this.solicitarReporte();
    }

    public reintentar(): void {
        if (this.errorFormularios || this.formularios.length === 0) {
            this.cargarFormularios();
        } else if (this.formularioId) {
            this.solicitarReporte();
        }
    }

    get hayFiltroDeFechas(): boolean {
        return Boolean((this.desde && this.desde.trim()) || (this.hasta && this.hasta.trim()));
    }

    get tituloVista(): string {
        return this.tipo === 'servicio'
            ? 'Reporte de encuestas de servicios'
            : 'Reporte de encuestas de productos';
    }

    get totalRespuestas(): number {
        return this.reporteDetalle?.reporte?.resumen?.totalRespuestas ?? 0;
    }

    get calificacionTexto(): string {
        const c = this.reporteDetalle?.calificacionPromedio;
        if (c === null || c === undefined) {
            return '—';
        }
        return `${c.toFixed(1)} / 10`;
    }

    get ultimaRespuestaTexto(): string {
        const f = this.reporteDetalle?.reporte?.resumen?.ultimaRespuesta;
        if (!f) {
            return '—';
        }
        // viene en hora de México sin zona (igual que el reporte de Eventos): se lee y se muestra tal cual, sin convertir de zona
        const d = new Date(f);
        if (isNaN(d.getTime())) return f;
        return d.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
    }

    get totalPreguntas(): number {
        const secciones = this.reporteDetalle?.reporte?.secciones;
        if (!secciones) return 0;
        return secciones.reduce((acc, s) => acc + (s.preguntas ? s.preguntas.length : 0), 0);
    }

    ngOnDestroy(): void {
        this._destroy$.next();
        this._destroy$.complete();
    }
}

