import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Subscription } from 'rxjs';
import { filter, switchMap, tap } from 'rxjs/operators';
import { FinanzasService } from '../finanzas.service';
import { Credito, Empresa } from '../finanzas.types';
import { etiquetaTipoCredito, fechaIsoACorta, fechaVencida, formatearMonto, formatearTasa, mensajeDeError } from '../finanzas.utils';
import { CreditoDialogComponent } from './credito-dialog/credito-dialog.component';

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
        MatSelectModule
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

    nuevo(): void {
        this._dialog
            .open<CreditoDialogComponent, { credito?: Credito }, Credito>(CreditoDialogComponent, {
                width: '40rem',
                maxWidth: '95vw',
                data: {}
            })
            .afterClosed()
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe((res) => {
                if (res) {
                    this.cargar();
                }
            });
    }

    editar(c: Credito): void {
        this._dialog
            .open<CreditoDialogComponent, { credito?: Credito }, Credito>(CreditoDialogComponent, {
                width: '40rem',
                maxWidth: '95vw',
                data: { credito: c }
            })
            .afterClosed()
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe((res) => {
                if (res) {
                    this.cargar();
                }
            });
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
                },
                error: (e) => {
                    this.eliminando.set(null);
                    this._snackBar.open(mensajeDeError(e), 'Cerrar', { duration: 7000 });
                }
            });
    }

    verCalendario(c: Credito): void {
        // En Q7 abrirá CuotasDialogComponent
    }
}

