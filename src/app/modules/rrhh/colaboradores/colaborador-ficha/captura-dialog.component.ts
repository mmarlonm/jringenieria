import { MAT_DATE_FORMATS } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DateTime } from 'luxon';
import { SolicitudGuardar, TipoAusencia } from '../../ausencias/ausencias.types';
import { aFechaIso, textoONull } from '../colaboradores.utils';

import { FORMATOS_FECHA_CORTA } from '../../ausencias/ausencias.formats';

@Component({
    selector: 'rrhh-captura-dialog',
    standalone: true,
    providers: [{ provide: MAT_DATE_FORMATS, useValue: FORMATOS_FECHA_CORTA }],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatButtonToggleModule,
        MatDatepickerModule
    ],
    template: `
        <div class="flex flex-col max-w-full">
            <h2 mat-dialog-title class="!text-lg !font-bold">Capturar solicitud de ausencia</h2>
            <mat-dialog-content class="!pt-3">
                <form [formGroup]="form" class="flex flex-col gap-4">
                    <div>
                        <label class="text-xs font-semibold text-secondary block mb-1.5">Tipo de ausencia</label>
                        <mat-button-toggle-group formControlName="tipoAusenciaId" class="w-full flex flex-wrap">
                            @for (t of data.tipos; track t.tipoAusenciaId) {
                                <mat-button-toggle [value]="t.tipoAusenciaId" class="flex-1">
                                    {{ t.nombre }}
                                </mat-button-toggle>
                            }
                        </mat-button-toggle-group>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <mat-form-field class="w-full">
                            <mat-label>Fecha de inicio</mat-label>
                            <input matInput [matDatepicker]="pInicio" formControlName="fechaInicio" />
                            <mat-datepicker-toggle matIconSuffix [for]="pInicio"></mat-datepicker-toggle>
                            <mat-datepicker #pInicio></mat-datepicker>
                        </mat-form-field>

                        <mat-form-field class="w-full">
                            <mat-label>Fecha de fin</mat-label>
                            <input matInput [matDatepicker]="pFin" [min]="form.controls.fechaInicio.value" formControlName="fechaFin" />
                            <mat-datepicker-toggle matIconSuffix [for]="pFin"></mat-datepicker-toggle>
                            <mat-datepicker #pFin></mat-datepicker>
                        </mat-form-field>
                    </div>

                    <mat-form-field class="w-full">
                        <mat-label>Motivo{{ tipoSeleccionado?.requiereMotivo ? ' *' : '' }}</mat-label>
                        <textarea matInput formControlName="motivo" rows="3" maxlength="300"></textarea>
                    </mat-form-field>

                    <div class="rounded-xl bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        Queda aprobada de inmediato y se avisa a Gerencia de Administración y Dirección General.
                    </div>
                </form>
            </mat-dialog-content>
            <mat-dialog-actions align="end" class="!px-6 !pb-6">
                <button mat-stroked-button type="button" (click)="cancelar()">Cancelar</button>
                <button mat-flat-button color="primary" type="button" [disabled]="form.invalid || !fechasValidas" (click)="guardar()">
                    Capturar y aprobar
                </button>
            </mat-dialog-actions>
        </div>
    `
})
export class CapturaDialogComponent {
    private readonly _dialogRef = inject(MatDialogRef<CapturaDialogComponent>);
    readonly data = inject<{ tipos: TipoAusencia[] }>(MAT_DIALOG_DATA);

    readonly form = new FormGroup({
        tipoAusenciaId: new FormControl<number | null>(this.data.tipos[0]?.tipoAusenciaId ?? null, {
            validators: [Validators.required]
        }),
        fechaInicio: new FormControl<DateTime | null>(null, { validators: [Validators.required] }),
        fechaFin: new FormControl<DateTime | null>(null, { validators: [Validators.required] }),
        motivo: new FormControl<string>('', { nonNullable: true })
    });

    constructor() {
        this.form.controls.tipoAusenciaId.valueChanges.subscribe(() => {
            this.actualizarValidacionMotivo();
        });
        this.actualizarValidacionMotivo();
    }

    get tipoSeleccionado(): TipoAusencia | undefined {
        return this.data.tipos.find((t) => t.tipoAusenciaId === this.form.controls.tipoAusenciaId.value);
    }

    get fechasValidas(): boolean {
        const { fechaInicio, fechaFin } = this.form.getRawValue();
        if (!fechaInicio || !fechaFin) return false;
        return fechaFin >= fechaInicio;
    }

    private actualizarValidacionMotivo(): void {
        const req = this.tipoSeleccionado?.requiereMotivo;
        if (req) {
            this.form.controls.motivo.setValidators([Validators.required]);
        } else {
            this.form.controls.motivo.clearValidators();
        }
        this.form.controls.motivo.updateValueAndValidity();
    }

    cancelar(): void {
        this._dialogRef.close();
    }

    guardar(): void {
        if (this.form.invalid || !this.fechasValidas) {
            this.form.markAllAsTouched();
            return;
        }

        const v = this.form.getRawValue();
        const resultado: SolicitudGuardar = {
            tipoAusenciaId: v.tipoAusenciaId!,
            fechaInicio: aFechaIso(v.fechaInicio)!,
            fechaFin: aFechaIso(v.fechaFin)!,
            motivo: textoONull(v.motivo)
        };

        this._dialogRef.close(resultado);
    }
}
