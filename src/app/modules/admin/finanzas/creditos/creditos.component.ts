import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ComponentType } from '@angular/cdk/portal';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Subscription } from 'rxjs';
import { filter, finalize, switchMap, take, tap } from 'rxjs/operators';
import { FinanzasService } from '../finanzas.service';
import { Credito, Empresa } from '../finanzas.types';
import { etiquetaTipoCredito, fechaIsoACorta, fechaVencida, formatearMonto, formatearTasa, mensajeDeError } from '../finanzas.utils';
import { CreditoDialogComponent } from './credito-dialog/credito-dialog.component';
import { CuotasDialogComponent } from './cuotas-dialog/cuotas-dialog.component';
import { BalanceCreditosComponent } from './balance/balance.component';

@Component({
    selector: 'app-finanzas-creditos',
    standalone: true,
    templateUrl: './creditos.component.html',
    imports: [
        FormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        BalanceCreditosComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreditosComponent implements OnInit {
    private readonly _service = inject(FinanzasService);
    private readonly _dialog = inject(MatDialog);
    private readonly _confirmacion = inject(FuseConfirmationService);
    private readonly _snackBar = inject(MatSnackBar);
    private readonly _destroyRef = inject(DestroyRef);
    private _subCreditos?: Subscription;

    @ViewChild(BalanceCreditosComponent) balanceComp?: BalanceCreditosComponent;

    readonly TODAS = 0;
    readonly empresas = signal<Empresa[]>([]);
    readonly cargandoEmpresas = signal(false);
    readonly errorEmpresas = signal<string | null>(null);

    readonly empresaId = signal<number | null>(null);
    readonly sentido = signal<string>('');
    readonly estado = signal<string>('Activo');

    readonly creditos = signal<Credito[]>([]);
    readonly filasCreditos = computed(() => this.creditos());
    readonly cargando = signal(false);
    readonly error = signal<string | null>(null);
    readonly eliminando = signal<number | null>(null);

    readonly hoy = new Date();

    // Helpers
    readonly etiquetaTipo = etiquetaTipoCredito;
    readonly formatearTasa = formatearTasa;
    readonly fechaVencida = fechaVencida;
    readonly formatearMonto = formatearMonto;
    readonly fechaIsoACorta = fechaIsoACorta;

    ngOnInit(): void {
        this.cargarEmpresas();
        this.cargar();
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

    elegirEmpresa(valor: number): void {
        this.empresaId.set(valor === this.TODAS ? null : valor);
        this.cargar();
    }

    cambiarSentido(v: string): void {
        this.sentido.set(v);
        this.cargar();
    }

    cambiarEstado(v: string): void {
        this.estado.set(v);
        this.cargar();
    }

    cargar(): void {
        this._subCreditos?.unsubscribe();
        this.cargando.set(true);
        this.error.set(null);

        const filtro = {
            empresaId: this.empresaId(),
            sentido: this.sentido() || null,
            estado: this.estado() || null
        };

        this._subCreditos = this._service
            .creditos(filtro)
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (c) => {
                    this.cargando.set(false);
                    this.creditos.set(c);
                },
                error: (e) => {
                    this.cargando.set(false);
                    this.error.set(mensajeDeError(e));
                }
            });
    }

    /** Un solo diálogo a la vez: un doble clic en un botón no apila dos (podría guardar el mismo crédito dos veces). */
    private _dialogoAbierto = false;

    private _abrirDialogo<C, D, R>(componente: ComponentType<C>, config: MatDialogConfig<D>, alCerrar: (resultado: R | undefined) => void): void {
        if (this._dialogoAbierto) {
            return;
        }
        this._dialogoAbierto = true;
        this._dialog
            .open<C, D, R>(componente, config)
            .afterClosed()
            .pipe(
                take(1),
                finalize(() => (this._dialogoAbierto = false)),
                takeUntilDestroyed(this._destroyRef)
            )
            .subscribe(alCerrar);
    }

    nuevo(): void {
        this._abrirDialogo<CreditoDialogComponent, { credito?: Credito }, Credito>(
            CreditoDialogComponent,
            { width: '40rem', maxWidth: '95vw', data: {} },
            (res) => {
                if (res) {
                    this.cargar();
                    this.balanceComp?.cargar();
                }
            }
        );
    }

    editar(c: Credito): void {
        this._abrirDialogo<CreditoDialogComponent, { credito?: Credito }, Credito>(
            CreditoDialogComponent,
            { width: '40rem', maxWidth: '95vw', data: { credito: c } },
            (res) => {
                if (res) {
                    this.cargar();
                    this.balanceComp?.cargar();
                }
            }
        );
    }

    eliminar(c: Credito): void {
        if (this.eliminando() !== null) {
            return;
        }

        this._confirmacion
            .open({
                title: 'Eliminar crédito',
                message: '¿Eliminar este crédito? Se borrarán también todas sus cuotas. No se puede deshacer.',
                icon: { show: true, name: 'heroicons_outline:exclamation-triangle', color: 'warn' },
                actions: { confirm: { label: 'Eliminar', color: 'warn' } }
            })
            .afterClosed()
            .pipe(
                filter((res) => res === 'confirmed'),
                tap(() => this.eliminando.set(c.creditoId)),
                switchMap(() => this._service.eliminarCredito(c.creditoId)),
                takeUntilDestroyed(this._destroyRef)
            )
            .subscribe({
                next: () => {
                    this.eliminando.set(null);
                    this._snackBar.open('Crédito eliminado.', 'Cerrar', { duration: 5000 });
                    this.cargar();
                    this.balanceComp?.cargar();
                },
                error: (e) => {
                    this.eliminando.set(null);
                    this._snackBar.open(mensajeDeError(e), 'Cerrar', { duration: 7000 });
                }
            });
    }

    verCalendario(c: Credito): void {
        this._abrirDialogo<CuotasDialogComponent, { credito: Credito }, boolean>(
            CuotasDialogComponent,
            // disableClose: el diálogo se cierra solo por sus propias vías (botón, clic fuera, Escape) y siempre devuelve si hubo cambios.
            { width: '56rem', maxWidth: '95vw', disableClose: true, data: { credito: c } },
            (cambio) => {
                if (cambio) {
                    this.cargar();
                    this.balanceComp?.cargar();
                }
            }
        );
    }
}
