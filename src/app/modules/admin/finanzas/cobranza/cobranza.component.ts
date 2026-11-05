import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { finalize, take } from 'rxjs/operators';
import { FinanzasService } from '../finanzas.service';
import { Cobranza, Empresa, EstadoCobranza, EstatusCobranza, FacturaCobranza, FiltroCobranza, Seguimiento } from '../finanzas.types';
import { etiquetaEstatusCobranza, formatearMonto, formatearProbabilidad, mensajeDeError, referenciaCfdi } from '../finanzas.utils';
import { PaginadorComponent } from '../shared/paginador/paginador.component';
import { SeguimientoDialogComponent } from './seguimiento-dialog/seguimiento-dialog.component';

@Component({
    selector: 'app-finanzas-cobranza',
    standalone: true,
    templateUrl: './cobranza.component.html',
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        PaginadorComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CobranzaComponent implements OnInit {
    private readonly _service = inject(FinanzasService);
    private readonly _dialog = inject(MatDialog);
    private readonly _destroyRef = inject(DestroyRef);
    private _subCobranza?: Subscription;
    private _dialogoAbierto = false;

    readonly TODAS = 0;
    readonly empresas = signal<Empresa[]>([]);
    readonly cargandoEmpresas = signal(false);
    readonly errorEmpresas = signal<string | null>(null);

    readonly empresaId = signal<number | null>(null);
    readonly estado = signal<EstadoCobranza>('Abiertas');
    readonly estatus = signal<EstatusCobranza | ''>('');
    readonly q = signal<string>('');

    readonly datos = signal<Cobranza | null>(null);
    readonly cargando = signal(false);
    readonly error = signal<string | null>(null);
    readonly facturaSeleccionada = signal<FacturaCobranza | null>(null);

    readonly resumen = computed(() => this.datos()?.resumen ?? []);
    readonly filas = computed(() => this.datos()?.facturas.items ?? []);
    readonly paginaActual = computed(() => this.datos()?.facturas.pagina ?? 1);
    readonly tamanoPagina = computed(() => this.datos()?.facturas.tamano ?? 50);
    readonly totalFacturas = computed(() => this.datos()?.facturas.total ?? 0);
    readonly hayFiltros = computed(() =>
        this.empresaId() !== null || this.estado() !== 'Abiertas' || this.estatus() !== '' || this.q().trim() !== ''
    );

    // Helpers
    readonly etiquetaEstatus = etiquetaEstatusCobranza;
    readonly formatearMonto = formatearMonto;
    readonly formatearProbabilidad = formatearProbabilidad;
    readonly referenciaCfdi = referenciaCfdi;

    ngOnInit(): void {
        this.cargarEmpresas();
        this.cargarLista(1);
    }

    cargarEmpresas(): void {
        this.cargandoEmpresas.set(true);
        this.errorEmpresas.set(null);
        this._service
            .empresas()
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (emp) => {
                    this.cargandoEmpresas.set(false);
                    this.empresas.set(emp);
                },
                error: (e) => {
                    this.cargandoEmpresas.set(false);
                    this.errorEmpresas.set(mensajeDeError(e));
                }
            });
    }

    cargarLista(pagina: number = 1): void {
        this._subCobranza?.unsubscribe();
        this.cargando.set(true);
        this.error.set(null);

        const filtro: FiltroCobranza = {
            empresaId: this.empresaId(),
            estado: this.estado(),
            estatus: this.estatus() || undefined,
            q: this.q().trim() || undefined,
            pagina,
            tamano: 50
        };

        this._subCobranza = this._service
            .cobranza(filtro)
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (res) => {
                    this.cargando.set(false);
                    this.datos.set(res);
                },
                error: (e) => {
                    this.cargando.set(false);
                    this.error.set(mensajeDeError(e));
                }
            });
    }

    elegirEmpresa(valor: number): void {
        this.empresaId.set(valor === this.TODAS ? null : valor);
        this.cargarLista(1);
    }

    cambiarEstado(v: EstadoCobranza): void {
        this.estado.set(v);
        this.cargarLista(1);
    }

    cambiarEstatus(v: EstatusCobranza | ''): void {
        this.estatus.set(v);
        this.cargarLista(1);
    }

    buscar(): void {
        this.q.set(this.q().trim());
        this.cargarLista(1);
    }

    limpiar(): void {
        this.empresaId.set(null);
        this.estado.set('Abiertas');
        this.estatus.set('');
        this.q.set('');
        this.cargarLista(1);
    }

    editar(f: FacturaCobranza): void {
        this.facturaSeleccionada.set(f);
        if (this._dialogoAbierto) {
            return;
        }
        this._dialogoAbierto = true;
        this._dialog
            .open<SeguimientoDialogComponent, { factura: FacturaCobranza }, Seguimiento>(SeguimientoDialogComponent, {
                width: '36rem',
                maxWidth: '95vw',
                data: { factura: f }
            })
            .afterClosed()
            .pipe(
                take(1),
                finalize(() => (this._dialogoAbierto = false)),
                takeUntilDestroyed(this._destroyRef)
            )
            .subscribe((res) => {
                if (res) {
                    this.cargarLista(this.paginaActual());
                }
            });
    }

    cambiarPagina(pagina: number): void {
        this.cargarLista(pagina);
    }
}
