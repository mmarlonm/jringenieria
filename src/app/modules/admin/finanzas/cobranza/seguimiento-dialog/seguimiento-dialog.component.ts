import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { FinanzasService } from '../../finanzas.service';
import { EstatusCobranza, FacturaCobranza, Seguimiento, SeguimientoGuardar } from '../../finanzas.types';
import { formatearMonto, fraccionAPorcentaje, mensajeDeError, porcentajeAFraccion, referenciaCfdi } from '../../finanzas.utils';

@Component({
    selector: 'app-finanzas-seguimiento-dialog',
    standalone: true,
    templateUrl: './seguimiento-dialog.component.html',
    imports: [
        CommonModule,
        ReactiveFormsModule,
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
export class SeguimientoDialogComponent {
    readonly data: { factura: FacturaCobranza } = inject(MAT_DIALOG_DATA);
    readonly dialogRef = inject(MatDialogRef<SeguimientoDialogComponent, Seguimiento | undefined>);
    private readonly _service = inject(FinanzasService);
    private readonly _fb = inject(FormBuilder);
    private readonly _destroyRef = inject(DestroyRef);

    readonly guardando = signal(false);
    readonly error = signal<string | null>(null);

    readonly form = this._fb.group({
        fechaVencimiento: [this.data.factura.fechaVencimiento ? this.data.factura.fechaVencimiento.slice(0, 10) : ''],
        cobroEsperado: [this.data.factura.cobroEsperado ? this.data.factura.cobroEsperado.slice(0, 10) : ''],
        estatus: [this.data.factura.estatus || 'PorCobrar', [Validators.required]],
        responsable: [this.data.factura.responsable || '', [Validators.maxLength(100)]],
        probabilidad: [
            this.data.factura.probabilidad !== null && this.data.factura.probabilidad !== undefined
                ? fraccionAPorcentaje(this.data.factura.probabilidad)
                : null,
            [Validators.min(0), Validators.max(100)]
        ],
        observaciones: [this.data.factura.observaciones || '', [Validators.maxLength(500)]]
    });

    readonly referencia = referenciaCfdi(this.data.factura);
    readonly formatearMonto = formatearMonto;

    guardar(): void {
        if (this.guardando()) return;
        if (this.form.invalid) return;

        this.guardando.set(true);
        this.error.set(null);
        this.dialogRef.disableClose = true;

        const raw = this.form.getRawValue();
        const prob = raw.probabilidad !== null && raw.probabilidad !== undefined
            ? porcentajeAFraccion(Number(raw.probabilidad))
            : null;

        const dto: SeguimientoGuardar = {
            fechaVencimiento: raw.fechaVencimiento && raw.fechaVencimiento.trim() ? raw.fechaVencimiento.trim() : null,
            cobroEsperado: raw.cobroEsperado && raw.cobroEsperado.trim() ? raw.cobroEsperado.trim() : null,
            estatus: raw.estatus as EstatusCobranza,
            responsable: raw.responsable && raw.responsable.trim() ? raw.responsable.trim() : null,
            probabilidad: prob,
            observaciones: raw.observaciones && raw.observaciones.trim() ? raw.observaciones.trim() : null
        };

        this._service.guardarSeguimiento(this.data.factura.cfdiId, dto)
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (res) => {
                    this.guardando.set(false);
                    this.dialogRef.close(res);
                },
                error: (err) => {
                    this.guardando.set(false);
                    this.dialogRef.disableClose = false;
                    this.error.set(mensajeDeError(err));
                }
            });
    }

    cancelar(): void {
        this.dialogRef.close();
    }
}
