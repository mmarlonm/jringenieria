import '../finanzas.locale';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { Subscription, concatMap, from, toArray } from 'rxjs';

import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';
import { FinanzasService } from '../finanzas.service';
import {
    ClaseMovimiento,
    ClaseSugerida,
    Cuenta,
    Empresa,
    MovimientoConciliacion,
    FalloLote,
    Pagina,
    ResumenConciliacion,
    Vinculo
} from '../finanzas.types';
import {
    CLASES_MOVIMIENTO,
    ESTADOS_MOVIMIENTO,
    altasPendientes,
    etiquetaClase,
    etiquetaEstadoMovimiento,
    fechaLocalISO,
    mensajeDeError,
    partir,
    periodoValido,
    primerDiaDelMes,
    textoSugerir
} from '../finanzas.utils';
import { ManualDialogComponent, ManualDialogData } from './manual-dialog/manual-dialog.component';
import { PaginadorComponent } from '../shared/paginador/paginador.component';
import { MovimientoTarjetaComponent } from './movimiento-tarjeta/movimiento-tarjeta.component';

@Component({
    selector: 'app-finanzas-conciliacion',
    standalone: true,
    templateUrl: './conciliacion.component.html',
    imports: [
        CurrencyPipe,
        DatePipe,
        FormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        PaginadorComponent,
        MovimientoTarjetaComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConciliacionComponent implements OnInit {
    private readonly _service = inject(FinanzasService);
    private readonly _permisos = inject(PermisosEspecialesService);
    private readonly _dialog = inject(MatDialog);
    private readonly _destroyRef = inject(DestroyRef);

    private _subCuentas?: Subscription;
    private _subLista?: Subscription;
    private _subResumen?: Subscription;
    private _subClases?: Subscription;
    private _subSugerir?: Subscription;
    private _subLote?: Subscription;

    readonly estadosMovimiento = ESTADOS_MOVIMIENTO;
    readonly etiquetaEstado = etiquetaEstadoMovimiento;
    readonly CLASES = CLASES_MOVIMIENTO;
    readonly etiquetaClase = etiquetaClase;

    // Permisos
    readonly puedeEscribir = computed(() => this._permisos.tiene('finanzas.conciliar'));

    // Empresa
    readonly empresas = signal<Empresa[]>([]);
    readonly empresaId = signal<number | null>(null);
    readonly cargandoEmpresas = signal(false);
    readonly errorEmpresas = signal<string | null>(null);

    // Cuenta
    readonly cuentas = signal<Cuenta[]>([]);
    readonly cuentaId = signal<number | null>(null); // null = todas
    readonly cargandoCuentas = signal(false);

    // Filtros con ngModel respaldados por señales privadas para reactividad OnPush
    private readonly _desde = signal('');
    private readonly _hasta = signal('');
    private readonly _estado = signal('');
    private readonly _q = signal('');

    get desde(): string { return this._desde(); }
    set desde(v: string) { this._desde.set(v); }

    get hasta(): string { return this._hasta(); }
    set hasta(v: string) { this._hasta.set(v); }

    get estado(): string { return this._estado(); }
    set estado(v: string) { this._estado.set(v); }

    get q(): string { return this._q(); }
    set q(v: string) { this._q.set(v); }

    readonly errorPeriodo = signal<string | null>(null);

    // Avisos y estado de acciones (F5)
    readonly sugiriendo = signal(false);
    readonly mensajeExito = signal<string | null>(null);
    readonly mensajeError = signal<string | null>(null);
    readonly confirmandoLoteFranja = signal(false);
    readonly procesandoLote = signal(false);
    readonly fallidasLote = signal<FalloLote[]>([]);

    // Resumen
    readonly resumen = signal<ResumenConciliacion | null>(null);
    readonly cargandoResumen = signal(false);
    readonly errorResumen = signal<string | null>(null);
    readonly motivoResumenInvalido = signal<string | null>(null);

    // Lista y paginador
    readonly lista = signal<Pagina<MovimientoConciliacion> | null>(null);
    readonly paginaActual = signal(1);
    readonly cargandoLista = signal(false);
    readonly errorLista = signal<string | null>(null);

    readonly tieneFiltrosActivos = computed(() =>
        this.cuentaId() !== null || this._estado() !== '' || (this._q()?.trim() ?? '') !== ''
    );

    readonly altas = computed(() => altasPendientes(this.lista()?.items ?? []));

    // Para la tarjeta de movimiento (preparadas para F5/F6)
    readonly ocupados = signal<ReadonlySet<number>>(new Set());
    readonly movimientosOcupados = signal<ReadonlySet<number>>(new Set());
    readonly clasesSugeridasPorId = signal<ReadonlyMap<number, ClaseSugerida>>(new Map());
    readonly seleccionados = signal<ReadonlySet<number>>(new Set());
    readonly claseSeleccionada = signal<ClaseMovimiento | null>(null);
    readonly buscandoClases = signal(false);
    readonly procesandoClasificacion = signal(false);

    readonly clasesSugeridasResumen = computed(() => {
        const map = this.clasesSugeridasPorId();
        const groups = new Map<ClaseMovimiento, number[]>();
        for (const item of map.values()) {
            const list = groups.get(item.clase) ?? [];
            list.push(item.movimientoId);
            groups.set(item.clase, list);
        }
        return Array.from(groups.entries()).map(([clase, ids]) => ({ clase, count: ids.length, ids }));
    });

    ngOnInit(): void {
        this.cargarEmpresas();
    }

    cargarEmpresas(): void {
        this.cargandoEmpresas.set(true);
        this.errorEmpresas.set(null);
        this._service.empresas().pipe(
            takeUntilDestroyed(this._destroyRef)
        ).subscribe({
            next: (data) => {
                this.empresas.set(data);
                this.cargandoEmpresas.set(false);
            },
            error: (err) => {
                this.errorEmpresas.set(mensajeDeError(err));
                this.cargandoEmpresas.set(false);
            }
        });
    }

    elegirEmpresa(id: number): void {
        this.empresaId.set(id);
        this.lista.set(null);
        this.paginaActual.set(1);
        this.resumen.set(null);
        this.cuentaId.set(null);
        this.errorLista.set(null);
        this.errorResumen.set(null);
        this.errorPeriodo.set(null);
        this.motivoResumenInvalido.set(null);
        this.seleccionados.set(new Set());
        this.ocupados.set(new Set());
        this.movimientosOcupados.set(new Set());
        this.descartarClases();
        // El aviso de la empresa anterior no debe aparecer en la nueva.
        this._subSugerir?.unsubscribe();
        this._subLote?.unsubscribe();
        this.sugiriendo.set(false);
        this.confirmandoLoteFranja.set(false);
        this.procesandoLote.set(false);
        this.limpiarAvisos();

        const hoy = new Date();
        this.desde = primerDiaDelMes(hoy);
        this.hasta = fechaLocalISO(hoy);
        this.estado = '';
        this.q = '';

        this.cargarCuentas(id);
        this.cargarResumen();
        this.cargarLista(1);
    }

    cargarCuentas(empresaId: number): void {
        this._subCuentas?.unsubscribe();
        this.cargandoCuentas.set(true);
        this._subCuentas = this._service.cuentas(empresaId).pipe(
            takeUntilDestroyed(this._destroyRef)
        ).subscribe({
            next: (data) => {
                this.cuentas.set(data);
                this.cargandoCuentas.set(false);
            },
            error: () => {
                this.cargandoCuentas.set(false);
            }
        });
    }

    elegirCuenta(id: number | null): void {
        this.cuentaId.set(id);
        this.limpiarSeleccion();
        this.descartarClases();
        this.cargarLista(1);
        this.cargarResumen();
    }

    alCambiarFiltro(): void {
        this.limpiarSeleccion();
        this.descartarClases();
        if (this.desde && this.hasta && this.desde > this.hasta) {
            this.errorPeriodo.set('La fecha inicial no puede ser posterior a la final.');
            // Sin esto quedarían a la vista el resumen y la lista del periodo anterior.
            this.cargarResumen();
            this._subLista?.unsubscribe();
            this.cargandoLista.set(false);
            this.errorLista.set(null);
            this.lista.set(null);
            return;
        }
        this.errorPeriodo.set(null);
        this.cargarLista(1);
        this.cargarResumen();
    }

    alCambiarEstado(nuevoEstado: string): void {
        this.limpiarSeleccion();
        this.estado = nuevoEstado;
        this.cargarLista(1);
    }

    pulsarEstadoResumen(estadoClickeado: string): void {
        this.limpiarSeleccion();
        if (this.estado === estadoClickeado) {
            this.estado = '';
        } else {
            this.estado = estadoClickeado;
        }
        this.cargarLista(1);
    }

    limpiarFiltros(): void {
        this.limpiarSeleccion();
        this.descartarClases();
        const hoy = new Date();
        this.desde = primerDiaDelMes(hoy);
        this.hasta = fechaLocalISO(hoy);
        this.cuentaId.set(null);
        this.estado = '';
        this.q = '';
        this.errorPeriodo.set(null);
        this.cargarLista(1);
        this.cargarResumen();
    }

    /** `conservarSeleccion` lo usa `recargar()`: tras confirmar o rechazar un vínculo las casillas marcadas siguen marcadas. */
    cargarLista(pagina: number, conservarSeleccion = false): void {
        if (!this.empresaId()) return;

        if (!conservarSeleccion) this.limpiarSeleccion();
        this.paginaActual.set(pagina);

        if (this.desde && this.hasta && this.desde > this.hasta) {
            this.errorPeriodo.set('La fecha inicial no puede ser posterior a la final.');
            return;
        }
        this.errorPeriodo.set(null);

        this._subLista?.unsubscribe();
        this.cargandoLista.set(true);
        this.errorLista.set(null);

        this._subLista = this._service.movimientosConciliacion({
            empresaId: this.empresaId()!,
            cuentaId: this.cuentaId(),
            desde: this.desde || null,
            hasta: this.hasta || null,
            estado: this.estado || null,
            q: this.q?.trim() || null,
            pagina,
            tamano: 50
        }).pipe(
            takeUntilDestroyed(this._destroyRef)
        ).subscribe({
            next: (data) => {
                // La página ya no existe (p. ej. se confirmó el último movimiento de «Con sugerencia» en la página 2): pide la última válida.
                const ultima = Math.ceil(data.total / data.tamano);
                if (data.items.length === 0 && data.total > 0 && data.pagina > 1 && ultima < data.pagina) {
                    this.cargarLista(ultima);
                    return;
                }
                this.lista.set(data);
                // Solo siguen marcados los movimientos que aún están en la página.
                const visibles = new Set(data.items.map((m) => m.movimientoId));
                this.seleccionados.update((s) => new Set(Array.from(s).filter((id) => visibles.has(id))));
                this.cargandoLista.set(false);
            },
            error: (err) => {
                this.errorLista.set(mensajeDeError(err));
                this.cargandoLista.set(false);
            }
        });
    }

    cargarResumen(): void {
        if (!this.empresaId()) return;

        const motivo = periodoValido(this.desde, this.hasta);
        if (motivo !== null) {
            this._subResumen?.unsubscribe();
            this.resumen.set(null);
            this.motivoResumenInvalido.set(motivo);
            this.cargandoResumen.set(false);
            return;
        }

        this.motivoResumenInvalido.set(null);
        this._subResumen?.unsubscribe();
        this.cargandoResumen.set(true);
        this.errorResumen.set(null);

        this._subResumen = this._service.resumenConciliacion(
            this.empresaId()!,
            this.cuentaId(),
            this.desde,
            this.hasta
        ).pipe(
            takeUntilDestroyed(this._destroyRef)
        ).subscribe({
            next: (data) => {
                this.resumen.set(data);
                this.cargandoResumen.set(false);
            },
            error: () => {
                this.errorResumen.set('No se pudo cargar el resumen.');
                this.cargandoResumen.set(false);
            }
        });
    }

    recargar(): void {
        const pagina = this.lista()?.pagina ?? 1;
        this.cargarLista(pagina, true);
        this.cargarResumen();
    }

    monedaDeMovimiento(cuentaId: number): string {
        const c = this.cuentas().find((x) => x.cuentaId === cuentaId);
        return c?.moneda ?? 'MXN';
    }

    claseSugeridaDe(movimientoId: number): ClaseSugerida | null {
        return this.clasesSugeridasPorId().get(movimientoId) ?? null;
    }

    alCambiarSeleccion(movimientoId: number, seleccionado: boolean): void {
        this.seleccionados.update((set) => {
            const nuevo = new Set(set);
            if (seleccionado) {
                nuevo.add(movimientoId);
            } else {
                nuevo.delete(movimientoId);
            }
            return nuevo;
        });
    }

    limpiarSeleccion(): void {
        this.seleccionados.set(new Set());
        this.claseSeleccionada.set(null);
    }

    clasificarIds(ids: number[], clase: ClaseMovimiento | null): void {
        if (ids.length === 0 || this.procesandoClasificacion()) return;

        this.limpiarAvisos();
        this.procesandoClasificacion.set(true);
        this.movimientosOcupados.update(s => {
            const next = new Set(s);
            ids.forEach(id => next.add(id));
            return next;
        });

        const lotes = partir(ids, 500);
        from(lotes).pipe(
            concatMap(lote => this._service.clasificar({ movimientoIds: lote, clase })),
            toArray(),
            takeUntilDestroyed(this._destroyRef)
        ).subscribe({
            next: () => {
                this.procesandoClasificacion.set(false);
                this.movimientosOcupados.update(s => {
                    const next = new Set(s);
                    ids.forEach(id => next.delete(id));
                    return next;
                });
                if (clase === null) {
                    this.mensajeExito.set(`Clase quitada de ${ids.length} movimientos`);
                } else {
                    this.mensajeExito.set(`${ids.length} movimientos clasificados`);
                }
                this.clasesSugeridasPorId.update(m => {
                    const next = new Map(m);
                    ids.forEach(id => next.delete(id));
                    return next;
                });
                this.limpiarSeleccion();
                this.recargar();
            },
            error: (err) => {
                this.procesandoClasificacion.set(false);
                this.movimientosOcupados.update(s => {
                    const next = new Set(s);
                    ids.forEach(id => next.delete(id));
                    return next;
                });
                this.mensajeError.set(mensajeDeError(err));
                this.recargar();
            }
        });
    }

    aplicarClaseSeleccionada(): void {
        const clase = this.claseSeleccionada();
        if (!clase) return;
        this.clasificarIds(Array.from(this.seleccionados()), clase);
    }

    quitarClaseSeleccionados(): void {
        this.clasificarIds(Array.from(this.seleccionados()), null);
    }

    aceptarClase(movimientoId: number): void {
        if (this.movimientosOcupados().has(movimientoId)) return;
        const sugerida = this.clasesSugeridasPorId().get(movimientoId);
        if (!sugerida) return;
        this.clasificarIds([movimientoId], sugerida.clase);
    }

    quitarClase(movimientoId: number): void {
        if (this.movimientosOcupados().has(movimientoId)) return;
        this.clasificarIds([movimientoId], null);
    }

    aceptarClasesDeTipo(clase: ClaseMovimiento): void {
        const ids: number[] = [];
        for (const [id, s] of this.clasesSugeridasPorId().entries()) {
            if (s.clase === clase) {
                ids.push(id);
            }
        }
        if (ids.length === 0) return;
        this.clasificarIds(ids, clase);
    }

    /** Cancela la búsqueda de clases en curso y vacía las sugeridas: ya no corresponden a la empresa, cuenta o periodo. */
    private descartarClases(): void {
        this._subClases?.unsubscribe();
        this.buscandoClases.set(false);
        this.clasesSugeridasPorId.set(new Map());
    }

    buscarClasesSugeridas(): void {
        if (!this.empresaId() || this.motivoPeriodo() !== null || this.buscandoClases() || this.procesandoClasificacion()) return;

        this.limpiarAvisos();
        this.buscandoClases.set(true);
        this._subClases = this._service.clasesSugeridas({
            empresaId: this.empresaId()!,
            cuentaId: this.cuentaId(),
            desde: this.desde,
            hasta: this.hasta
        }).pipe(
            takeUntilDestroyed(this._destroyRef)
        ).subscribe({
            next: (data) => {
                this.buscandoClases.set(false);
                const map = new Map<number, ClaseSugerida>();
                data.forEach(item => map.set(item.movimientoId, item));
                this.clasesSugeridasPorId.set(map);
                if (data.length === 0) {
                    this.mensajeExito.set('No hay clases que sugerir en este periodo.');
                }
            },
            error: (err) => {
                this.buscandoClases.set(false);
                this.mensajeError.set(mensajeDeError(err));
            }
        });
    }

    limpiarAvisos(): void {
        this.mensajeExito.set(null);
        this.mensajeError.set(null);
        this.fallidasLote.set([]);
    }

    motivoPeriodo(): string | null {
        return periodoValido(this.desde, this.hasta);
    }

    sugerir(): void {
        const motivo = periodoValido(this.desde, this.hasta);
        if (motivo !== null || !this.empresaId() || this.sugiriendo()) return;

        this.limpiarAvisos();
        this.sugiriendo.set(true);

        this._subSugerir = this._service.sugerirConciliaciones({
            empresaId: this.empresaId()!,
            desde: this.desde,
            hasta: this.hasta,
            cuentaId: this.cuentaId()
        }).pipe(
            takeUntilDestroyed(this._destroyRef)
        ).subscribe({
            next: (res) => {
                this.sugiriendo.set(false);
                this.mensajeExito.set(textoSugerir(res));
                this.recargar();
            },
            error: (err) => {
                this.sugiriendo.set(false);
                this.mensajeError.set(mensajeDeError(err));
            }
        });
    }

    confirmar(id: number): void {
        if (this.ocupados().has(id)) return;
        this.limpiarAvisos();
        this.ocupados.update(set => new Set(set).add(id));

        this._service.confirmarVinculo(id).pipe(
            takeUntilDestroyed(this._destroyRef)
        ).subscribe({
            next: () => {
                this.ocupados.update(set => { const n = new Set(set); n.delete(id); return n; });
                this.recargar();
            },
            error: (err) => {
                this.ocupados.update(set => { const n = new Set(set); n.delete(id); return n; });
                this.mensajeError.set(mensajeDeError(err));
                if (err?.status === 409) {
                    this.recargar();
                }
            }
        });
    }

    rechazar(id: number): void {
        if (this.ocupados().has(id)) return;
        this.limpiarAvisos();
        this.ocupados.update(set => new Set(set).add(id));

        this._service.rechazarVinculo(id).pipe(
            takeUntilDestroyed(this._destroyRef)
        ).subscribe({
            next: () => {
                this.ocupados.update(set => { const n = new Set(set); n.delete(id); return n; });
                this.recargar();
            },
            error: (err) => {
                this.ocupados.update(set => { const n = new Set(set); n.delete(id); return n; });
                this.mensajeError.set(mensajeDeError(err));
                if (err?.status === 409) {
                    this.recargar();
                }
            }
        });
    }

    deshacer(id: number): void {
        if (this.ocupados().has(id)) return;
        this.limpiarAvisos();
        this.ocupados.update(set => new Set(set).add(id));

        this._service.deshacerVinculo(id).pipe(
            takeUntilDestroyed(this._destroyRef)
        ).subscribe({
            next: () => {
                this.ocupados.update(set => { const n = new Set(set); n.delete(id); return n; });
                this.recargar();
            },
            error: (err) => {
                this.ocupados.update(set => { const n = new Set(set); n.delete(id); return n; });
                this.mensajeError.set(mensajeDeError(err));
                if (err?.status === 409) {
                    this.recargar();
                }
            }
        });
    }

    iniciarLote(): void {
        this.confirmandoLoteFranja.set(true);
    }

    cancelarLote(): void {
        this.confirmandoLoteFranja.set(false);
    }

    ejecutarConfirmarLote(): void {
        if (this.procesandoLote()) return;
        const ids = this.altas().map(v => v.conciliacionId);
        if (ids.length === 0) return;

        this.limpiarAvisos();
        this.procesandoLote.set(true);

        this._subLote = this._service.confirmarLote(ids).pipe(
            takeUntilDestroyed(this._destroyRef)
        ).subscribe({
            next: (res) => {
                this.procesandoLote.set(false);
                this.confirmandoLoteFranja.set(false);
                this.mensajeExito.set(`Confirmadas: ${res.confirmadas.length}`);
                this.fallidasLote.set(res.fallidas);
                this.recargar();
            },
            error: (err) => {
                this.procesandoLote.set(false);
                this.confirmandoLoteFranja.set(false);
                this.mensajeError.set(mensajeDeError(err));
            }
        });
    }

    aplicarManual(movimiento: MovimientoConciliacion): void {
        this.limpiarAvisos();
        const ref = this._dialog.open<ManualDialogComponent, ManualDialogData, Vinculo>(ManualDialogComponent, {
            width: '40rem',
            maxWidth: '95vw',
            data: { movimiento, moneda: this.monedaDeMovimiento(movimiento.cuentaId) }
        });
        ref.afterClosed().pipe(
            takeUntilDestroyed(this._destroyRef)
        ).subscribe((vinculo) => {
            if (vinculo) {
                this.recargar();
            }
        });
    }

    descripcionMovimientoDeVinculo(conciliacionId: number): string | null {
        const items = this.lista()?.items ?? [];
        for (const m of items) {
            if (m.sugerencias.some(v => v.conciliacionId === conciliacionId) ||
                m.confirmadas.some(v => v.conciliacionId === conciliacionId)) {
                return m.descripcion;
            }
        }
        return null;
    }


}
