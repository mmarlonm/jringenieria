import { MAT_DATE_FORMATS } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DateTime } from 'luxon';
import { AjusteGuardar } from '../../ausencias/ausencias.types';
import { aFechaIso } from '../colaboradores.utils';

import { FORMATOS_FECHA_CORTA } from '../../ausencias/ausencias.formats';

@Component({
    selector: 'rrhh-ajuste-dialog',
    standalone: true,
    providers: [{ provide: MAT_DATE_FORMATS, useValue: FORMATOS_FECHA_CORTA }],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatDatepickerModule
    ],
    template: `
        <div class="flex flex-col max-w-full">
            <h2 mat-dialog-title class="!text-lg !font-bold">Ajustar saldo de vacaciones</h2>
            <mat-dialog-content class="!pt-3">
                <form [formGroup]="form" class="flex flex-col gap-4">
                    <mat-form-field class="w-full">
                        <mat-label>Fecha</mat-label>
                        <input matInput [matDatepicker]="picker" formControlName="fecha" />
                        <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                        <mat-datepicker #picker></mat-datepicker>
                    </mat-form-field>

                    <mat-form-field class="w-full">
                        <mat-label>Días (+ / -)</mat-label>
                        <input matInput type="number" step="1" formControlName="dias" />
                        <mat-hint>Positivo suma días (arrastre, días extra de la empresa); negativo los resta (días ya tomados antes del sistema)</mat-hint>
                    </mat-form-field>

                    <mat-form-field class="w-full mt-2">
                        <mat-label>Motivo</mat-label>
                        <textarea matInput formControlName="motivo" rows="3" maxlength="200"></textarea>
                    </mat-form-field>
                </form>
            </mat-dialog-content>
            <mat-dialog-actions align="end" class="!px-6 !pb-6">
                <button mat-stroked-button type="button" (click)="cancelar()">Cancelar</button>
                <button mat-flat-button color="primary" type="button" [disabled]="form.invalid || form.value.dias === 0" (click)="guardar()">
                    Guardar ajuste
                </button>
            </mat-dialog-actions>
        </div>
    `
})
export class AjusteDialogComponent {
    private readonly _dialogRef = inject(MatDialogRef<AjusteDialogComponent>);

    readonly form = new FormGroup({
        fecha: new FormControl<DateTime | null>(DateTime.local().startOf('day'), { validators: [Validators.required] }),
        dias: new FormControl<number | null>(null, { validators: [Validators.required] }),
        motivo: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] })
    });

    cancelar(): void {
        this._dialogRef.close();
    }

    guardar(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const v = this.form.getRawValue();
        if (v.dias === null || v.dias === 0 || !v.fecha) return;

        const resultado: AjusteGuardar = {
            fecha: aFechaIso(v.fecha)!,
            dias: Number(v.dias),
            motivo: v.motivo.trim()
        };

        this._dialogRef.close(resultado);
    }
}
