import '../finanzas.locale';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Subscription } from 'rxjs';

import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';
import { FinanzasService } from '../finanzas.service';
import {
    ClaseSugerida,
    Cuenta,
    Empresa,
    EstadoMovimiento,
    MovimientoConciliacion,
    Pagina,
    ResumenConciliacion
} from '../finanzas.types';
import {
    ESTADOS_MOVIMIENTO,
    etiquetaEstadoMovimiento,
    fechaLocalISO,
    mensajeDeError,
    periodoValido,
    primerDiaDelMes
} from '../finanzas.utils';
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
    private readonly _destroyRef = inject(DestroyRef);

    private _subLista?: Subscription;
    private _subResumen?: Subscription;

    readonly estadosMovimiento = ESTADOS_MOVIMIENTO;
    readonly etiquetaEstado = etiquetaEstadoMovimiento;

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

    // Para la tarjeta de movimiento (preparadas para F5/F6)
    readonly ocupados = signal<ReadonlySet<number>>(new Set());
    readonly movimientosOcupados = signal<ReadonlySet<number>>(new Set());
    readonly clasesSugeridasPorId = signal<ReadonlyMap<number, ClaseSugerida>>(new Map());
    readonly seleccionados = signal<ReadonlySet<number>>(new Set());

    ngOnInit(): void {
        this.cargarEmpresas();
    }

    cargarEmpresas(): void {
        this.cargandoEmpresas.set(true);
        this.errorEmpresas.set(null);
        this._service.empresas().subscribe({
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
        this.clasesSugeridasPorId.set(new Map());

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
        this.cargandoCuentas.set(true);
        this._service.cuentas(empresaId).subscribe({
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
        this.cargarLista(1);
        this.cargarResumen();
    }

    alCambiarFiltro(): void {
        if (this.desde && this.hasta && this.desde > this.hasta) {
            this.errorPeriodo.set('La fecha inicial no puede ser posterior a la final.');
            return;
        }
        this.errorPeriodo.set(null);
        this.cargarLista(1);
        this.cargarResumen();
    }

    alCambiarEstado(nuevoEstado: string): void {
        this.estado = nuevoEstado;
        this.cargarLista(1);
    }

    pulsarEstadoResumen(estadoClickeado: string): void {
        if (this.estado === estadoClickeado) {
            this.estado = '';
        } else {
            this.estado = estadoClickeado;
        }
        this.cargarLista(1);
    }

    limpiarFiltros(): void {
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

    cargarLista(pagina: number): void {
        if (!this.empresaId()) return;

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
        }).subscribe({
            next: (data) => {
                this.lista.set(data);
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
        this.cargarLista(pagina);
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

    // Métodos stubs para inputs de eventos de tarjeta (se implementan en F5 y F6)
    confirmar(_id: number): void {}
    rechazar(_id: number): void {}
    deshacer(_id: number): void {}
    aplicarManual(_movimiento: MovimientoConciliacion): void {}
    aceptarClase(_movimientoId: number): void {}
    quitarClase(_movimientoId: number): void {}
}
