import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';
import { DateTime } from 'luxon';
import { Subject, takeUntil } from 'rxjs';
import { AusenciasService } from '../ausencias/ausencias.service';
import { CalendarioItem, TipoCalendario } from '../ausencias/ausencias.types';
import { ColaboradoresService } from '../colaboradores/colaboradores.service';
import { CatalogoItem } from '../colaboradores/colaboradores.types';
import { aFechaIso, desdeIso, mensajeError } from '../colaboradores/colaboradores.utils';
import { DiasNoLaborablesDialogComponent } from './dias-no-laborables-dialog.component';

interface DiaColumna {
    dia: number;
    letra: string;
    esFinDeSemana: boolean;
}

interface EventoCalendario {
    tipo: TipoCalendario;
    estatus: 'APROBADA' | 'PENDIENTE';
    inicio: string;
    fin: string;
    colInicio: number;
    span: number;
    estilo: { [key: string]: string };
    etiqueta: string;
}

interface FilaColaborador {
    colaboradorId: number;
    colaborador: string;
    eventos: EventoCalendario[];
}

@Component({
    selector: 'rrhh-calendario-permisos',
    standalone: true,
    templateUrl: './calendario-permisos.component.html',
    imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatSelectModule]
})
export class CalendarioPermisosComponent implements OnInit, OnDestroy {
    private readonly _service = inject(AusenciasService);
    private readonly _colaboradoresService = inject(ColaboradoresService);
    private readonly _permisos = inject(PermisosEspecialesService);
    private readonly _dialog = inject(MatDialog);
    private readonly _snackBar = inject(MatSnackBar);
    private readonly _destroy = new Subject<void>();

    readonly mesActual = signal<DateTime>(DateTime.local().startOf('month'));
    readonly items = signal<CalendarioItem[]>([]);
    readonly cargando = signal(false);
    readonly cargandoDias = signal(false);
    readonly sucursales = signal<CatalogoItem[]>([]);

    readonly filtroSucursal = new FormControl<number>(0, { nonNullable: true });
    readonly puedeGestionar = this._permisos.tiene('rrhh.permisos.aprobar');

    readonly nombreMes = computed(() => {
        const m = this.mesActual().setLocale('es');
        return m.toFormat('LLLL yyyy');
    });

    readonly diasDelMes = computed<DiaColumna[]>(() => {
        const m = this.mesActual();
        const diasCount = m.daysInMonth ?? 30;
        const dias: DiaColumna[] = [];
        const letras = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

        for (let i = 1; i <= diasCount; i++) {
            const fecha = m.set({ day: i });
            const esFinDeSemana = fecha.weekday === 6 || fecha.weekday === 7;
            dias.push({
                dia: i,
                letra: letras[fecha.weekday - 1],
                esFinDeSemana
            });
        }
        return dias;
    });

    readonly plantillaColumnas = computed(() => {
        return `200px repeat(${this.diasDelMes().length}, minmax(34px, 1fr))`;
    });

    readonly anchoMinimo = computed(() => {
        return 200 + this.diasDelMes().length * 34;
    });

    readonly filas = computed<FilaColaborador[]>(() => {
        const items = this.items();
        const mes = this.mesActual();
        const mesInicio = mes.startOf('day');
        const mesFin = mes.endOf('month').startOf('day');

        const mapa = new Map<number, { colaborador: string; eventos: EventoCalendario[] }>();

        for (const it of items) {
            const itemInicio = desdeIso(it.inicio);
            const itemFin = desdeIso(it.fin);
            if (!itemInicio || !itemFin) continue;

            const clampedInicio = itemInicio < mesInicio ? mesInicio : itemInicio;
            const clampedFin = itemFin > mesFin ? mesFin : itemFin;

            if (clampedFin < mesInicio || clampedInicio > mesFin) continue;

            const span = Math.round(clampedFin.diff(clampedInicio, 'days').days) + 1;
            const colInicio = clampedInicio.day + 1;

            const evento: EventoCalendario = {
                tipo: it.tipo,
                estatus: it.estatus,
                inicio: it.inicio,
                fin: it.fin,
                colInicio,
                span,
                estilo: this.obtenerEstiloEvento(it.tipo, it.estatus, colInicio, span),
                etiqueta: this.etiquetaTipo(it.tipo, it.estatus)
            };

            if (!mapa.has(it.colaboradorId)) {
                mapa.set(it.colaboradorId, {
                    colaborador: it.colaborador,
                    eventos: []
                });
            }
            mapa.get(it.colaboradorId)!.eventos.push(evento);
        }

        const res: FilaColaborador[] = [];
        for (const [colaboradorId, datos] of mapa.entries()) {
            res.push({
                colaboradorId,
                colaborador: datos.colaborador,
                eventos: datos.eventos
            });
        }

        return res.sort((a, b) => a.colaborador.localeCompare(b.colaborador, 'es'));
    });

    ngOnInit(): void {
        if (this.puedeGestionar) {
            this._colaboradoresService
                .catalogos()
                .pipe(takeUntil(this._destroy))
                .subscribe({
                    next: (cat) => this.sucursales.set(cat.sucursales),
                    error: (e) => this._snackBar.open(mensajeError(e, 'No se pudieron cargar las sucursales.'), 'Cerrar', { duration: 5000 })
                });

            this.filtroSucursal.valueChanges.pipe(takeUntil(this._destroy)).subscribe(() => {
                this.cargar();
            });
        }

        this.cargar();
    }

    ngOnDestroy(): void {
        this._destroy.next();
        this._destroy.complete();
    }

    cargar(): void {
        this.cargando.set(true);
        const mes = this.mesActual();
        const desde = aFechaIso(mes.startOf('month')) ?? '';
        const hasta = aFechaIso(mes.endOf('month')) ?? '';
        const sucursalId = this.puedeGestionar && this.filtroSucursal.value ? this.filtroSucursal.value : null;

        this._service.calendario(desde, hasta, sucursalId).subscribe({
            next: (datos) => {
                this.items.set(datos);
                this.cargando.set(false);
            },
            error: (e) => {
                this.cargando.set(false);
                this._snackBar.open(mensajeError(e, 'No se pudo cargar el calendario de ausencias.'), 'Cerrar', { duration: 5000 });
            }
        });
    }

    irMesAnterior(): void {
        this.mesActual.update((m) => m.minus({ months: 1 }));
        this.cargar();
    }

    irMesSiguiente(): void {
        this.mesActual.update((m) => m.plus({ months: 1 }));
        this.cargar();
    }

    abrirDiasNoLaborables(): void {
        const anio = this.mesActual().year;
        this.cargandoDias.set(true);
        this._service.diasNoLaborables(anio).subscribe({
            next: (dias) => {
                this.cargandoDias.set(false);
                this._dialog.open(DiasNoLaborablesDialogComponent, {
                    width: '560px',
                    maxWidth: '95vw',
                    data: { anio, dias }
                });
            },
            error: (e) => {
                this.cargandoDias.set(false);
                this._snackBar.open(mensajeError(e, 'No se pudieron consultar los días no laborables.'), 'Cerrar', { duration: 5000 });
            }
        });
    }

    formatearRango(inicioIso: string, finIso: string): string {
        const i = desdeIso(inicioIso);
        const f = desdeIso(finIso);
        return `${i ? i.toFormat('dd/MM/yyyy') : inicioIso} al ${f ? f.toFormat('dd/MM/yyyy') : finIso}`;
    }

    private etiquetaTipo(tipo: TipoCalendario, estatus: string): string {
        const pend = estatus === 'PENDIENTE' ? ' (Pendiente)' : '';
        switch (tipo) {
            case 'VACACIONES': return `Vacaciones${pend}`;
            case 'PERMISO_CON_GOCE': return `Permiso c/goce${pend}`;
            case 'PERMISO_SIN_GOCE': return `Permiso s/goce${pend}`;
            case 'INCAPACIDAD': return `Incapacidad${pend}`;
            case 'FALTA': return `Falta${pend}`;
        }
    }

    private obtenerEstiloEvento(tipo: TipoCalendario, estatus: 'APROBADA' | 'PENDIENTE', colInicio: number, span: number): { [key: string]: string } {
        const esPendiente = estatus === 'PENDIENTE';
        let background = '';
        let color = '#ffffff';
        let border = 'none';

        switch (tipo) {
            case 'VACACIONES':
                if (esPendiente) {
                    background = 'repeating-linear-gradient(135deg, #bfdbfe, #bfdbfe 6px, #93c5fd 6px, #93c5fd 12px)';
                    color = '#1e3a8a';
                    border = '1px dashed #60a5fa';
                } else {
                    background = '#2563eb';
                }
                break;
            case 'PERMISO_CON_GOCE':
            case 'PERMISO_SIN_GOCE':
                if (esPendiente) {
                    background = 'repeating-linear-gradient(135deg, #fef3c7, #fef3c7 6px, #fde68a 6px, #fde68a 12px)';
                    color = '#78350f';
                    border = '1px dashed #f59e0b';
                } else {
                    background = '#d97706';
                }
                break;
            case 'INCAPACIDAD':
                if (esPendiente) {
                    background = 'repeating-linear-gradient(135deg, #fee2e2, #fee2e2 6px, #fca5a5 6px, #fca5a5 12px)';
                    color = '#7f1d1d';
                    border = '1px dashed #f87171';
                } else {
                    background = '#dc2626';
                }
                break;
            case 'FALTA':
                if (esPendiente) {
                    background = 'repeating-linear-gradient(135deg, #e5e7eb, #e5e7eb 6px, #d1d5db 6px, #d1d5db 12px)';
                    color = '#111827';
                    border = '1px dashed #9ca3af';
                } else {
                    background = '#374151';
                }
                break;
        }

        return {
            'grid-column': `${colInicio} / span ${span}`,
            'grid-row': '1',
            background,
            color,
            border
        };
    }
}
