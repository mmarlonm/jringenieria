import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { filter, switchMap, tap } from 'rxjs/operators';
import { FinanzasService } from '../../finanzas.service';
import { Credito, CreditoPago, CreditoPagoGuardar, EstadoPagoCredito } from '../../finanzas.types';
import { fechaIsoACorta, fechaLocalISO, formatearMonto, mensajeDeError } from '../../finanzas.utils';

export interface CuotasDialogData {
    credito: Credito;
}

@Component({
    selector: 'app-finanzas-cuotas-dialog',
    standalone: true,
    templateUrl: './cuotas-dialog.component.html',
    imports: [
        FormsModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatSelectModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CuotasDialogComponent implements OnInit {
    private readonly _service = inject(FinanzasService);
    private readonly _dialogRef = inject<MatDialogRef<CuotasDialogComponent, boolean>>(MatDialogRef);
    private readonly _confirmacion = inject(FuseConfirmationService);
    private readonly _destroyRef = inject(DestroyRef);
    readonly data = inject<CuotasDialogData>(MAT_DIALOG_DATA);

    readonly credito = this.data.credito;
    readonly cuotas = signal<CreditoPago[]>([]);
    readonly cargando = signal(false);
    readonly error = signal<string | null>(null);
    readonly huboCambios = signal(false);
    readonly guardandoNueva = signal(false);
    /** Una sola acción a la vez (agregar, marcar pagada, guardar o eliminar): un doble clic no manda dos peticiones. */
    readonly ocupado = signal(false);

    // Fila de alta
    readonly nuevaVencimiento = signal<string>('');
    readonly nuevaCapital = signal<number>(0);
    readonly nuevaInteres = signal<number>(0);
    readonly totalNueva = computed(() => Number(this.nuevaCapital() || 0) + Number(this.nuevaInteres() || 0));

    // Edición inline
    readonly editandoPagoId = signal<number | null>(null);
    readonly editVencimiento = signal<string>('');
    readonly editCapital = signal<number>(0);
    readonly editInteres = signal<number>(0);
    readonly editEstado = signal<EstadoPagoCredito>('Pendiente');
    readonly editFechaPago = signal<string | null>(null);
    readonly totalEdit = computed(() => Number(this.editCapital() || 0) + Number(this.editInteres() || 0));

    readonly fechaIsoACorta = fechaIsoACorta;
    readonly formatearMonto = formatearMonto;

    ngOnInit(): void {
        this.cargar();
    }

    cargar(): void {
        this.cargando.set(true);
        this.error.set(null);
        this._service
            .pagosCredito(this.credito.creditoId)
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (pagos) => {
                    this.cargando.set(false);
                    this.cuotas.set(pagos);
                },
                error: (e) => {
                    this.cargando.set(false);
                    this.error.set(mensajeDeError(e));
                }
            });
    }

    agregarCuota(): void {
        if (this.ocupado()) {
            return;
        }
        const capital = Number(this.nuevaCapital() || 0);
        const interes = Number(this.nuevaInteres() || 0);
        const vencimiento = this.nuevaVencimiento();

        if (capital < 0 || interes < 0 || capital + interes <= 0 || !vencimiento) {
            return;
        }

        this.ocupado.set(true);
        this.guardandoNueva.set(true);
        this.error.set(null);

        const dto: CreditoPagoGuardar = {
            vencimiento,
            capital,
            interes,
            estado: 'Pendiente',
            fechaPago: null
        };

        this._service
            .agregarPagoCredito(this.credito.creditoId, dto)
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: () => {
                    this.ocupado.set(false);
                    this.guardandoNueva.set(false);
                    this.huboCambios.set(true);
                    this.nuevaVencimiento.set('');
                    this.nuevaCapital.set(0);
                    this.nuevaInteres.set(0);
                    this.cargar();
                },
                error: (e) => {
                    this.ocupado.set(false);
                    this.guardandoNueva.set(false);
                    this.error.set(mensajeDeError(e));
                }
            });
    }

    marcarPagada(p: CreditoPago): void {
        if (this.ocupado()) {
            return;
        }
        this.ocupado.set(true);
        const hoy = fechaLocalISO(new Date());
        const dto: CreditoPagoGuardar = {
            vencimiento: p.vencimiento ? p.vencimiento.slice(0, 10) : hoy,
            capital: p.capital,
            interes: p.interes,
            estado: 'Pagada',
            fechaPago: hoy
        };

        this._service
            .actualizarPagoCredito(this.credito.creditoId, p.pagoId, dto)
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: () => {
                    this.ocupado.set(false);
                    this.huboCambios.set(true);
                    this.cargar();
                },
                error: (e) => {
                    this.ocupado.set(false);
                    this.error.set(mensajeDeError(e));
                }
            });
    }

    iniciarEdicion(p: CreditoPago): void {
        this.editandoPagoId.set(p.pagoId);
        this.editVencimiento.set(p.vencimiento ? p.vencimiento.slice(0, 10) : '');
        this.editCapital.set(p.capital);
        this.editInteres.set(p.interes);
        this.editEstado.set(p.estado);
        this.editFechaPago.set(p.fechaPago ? p.fechaPago.slice(0, 10) : null);
    }

    guardarEdicion(p: CreditoPago): void {
        if (this.ocupado()) {
            return;
        }
        const capital = Number(this.editCapital() || 0);
        const interes = Number(this.editInteres() || 0);
        if (capital < 0 || interes < 0 || capital + interes <= 0 || !this.editVencimiento()) {
            return;
        }

        this.ocupado.set(true);
        const dto: CreditoPagoGuardar = {
            vencimiento: this.editVencimiento(),
            capital,
            interes,
            estado: this.editEstado(),
            fechaPago: this.editEstado() === 'Pagada' ? (this.editFechaPago() ?? fechaLocalISO(new Date())) : null
        };

        this._service
            .actualizarPagoCredito(this.credito.creditoId, p.pagoId, dto)
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: () => {
                    this.ocupado.set(false);
                    this.huboCambios.set(true);
                    this.editandoPagoId.set(null);
                    this.cargar();
                },
                error: (e) => {
                    this.ocupado.set(false);
                    this.error.set(mensajeDeError(e));
                }
            });
    }

    cancelarEdicion(): void {
        this.editandoPagoId.set(null);
    }

    eliminarCuota(p: CreditoPago): void {
        if (this.ocupado()) {
            return;
        }
        // Ocupado desde que se abre la confirmación: un doble clic no abre dos confirmaciones ni manda dos DELETE.
        this.ocupado.set(true);
        this._confirmacion
            .open({
                title: 'Eliminar cuota',
                message: '¿Eliminar esta cuota? No se puede deshacer.',
                icon: { show: true, name: 'heroicons_outline:exclamation-triangle', color: 'warn' },
                actions: { confirm: { label: 'Eliminar', color: 'warn' } }
            })
            .afterClosed()
            .pipe(
                tap((res) => {
                    if (res !== 'confirmed') {
                        this.ocupado.set(false);
                    }
                }),
                filter((res) => res === 'confirmed'),
                switchMap(() => this._service.eliminarPagoCredito(this.credito.creditoId, p.pagoId)),
                takeUntilDestroyed(this._destroyRef)
            )
            .subscribe({
                next: () => {
                    this.ocupado.set(false);
                    this.huboCambios.set(true);
                    this.cargar();
                },
                error: (e) => {
                    this.ocupado.set(false);
                    this.error.set(mensajeDeError(e));
                }
            });
    }

    cerrar(): void {
        this._dialogRef.close(this.huboCambios());
    }
}

