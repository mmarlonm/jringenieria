import { MAT_DATE_FORMATS } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DateTime } from 'luxon';
import { IncidenciaGuardar, SubtipoIncapacidad, TipoIncidencia } from '../../ausencias/ausencias.types';
import { aFechaIso, textoONull } from '../colaboradores.utils';

import { FORMATOS_FECHA_CORTA } from '../../ausencias/ausencias.formats';

@Component({
    selector: 'rrhh-incidencia-dialog',
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
        MatDatepickerModule,
        MatSelectModule
    ],
    template: `
        <div class="flex flex-col max-w-full">
            <h2 mat-dialog-title class="!text-lg !font-bold">Registrar falta o incapacidad</h2>
            <mat-dialog-content class="!pt-3">
                <form [formGroup]="form" class="flex flex-col gap-4">
                    <div>
                        <label class="text-xs font-semibold text-secondary block mb-1.5">Tipo de incidencia</label>
                        <mat-button-toggle-group formControlName="tipo" class="w-full">
                            <mat-button-toggle value="FALTA" class="flex-1">Falta injustificada</mat-button-toggle>
                            <mat-button-toggle value="INCAPACIDAD" class="flex-1">Incapacidad IMSS</mat-button-toggle>
                        </mat-button-toggle-group>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <mat-form-field class="w-full">
                            <mat-label>Fecha de inicio</mat-label>
                            <input matInput [matDatepicker]="pickerInicio" formControlName="fechaInicio" />
                            <mat-datepicker-toggle matIconSuffix [for]="pickerInicio"></mat-datepicker-toggle>
                            <mat-datepicker #pickerInicio></mat-datepicker>
                        </mat-form-field>

                        <mat-form-field class="w-full">
                            <mat-label>Fecha de fin</mat-label>
                            <input matInput [matDatepicker]="pickerFin" [min]="form.controls.fechaInicio.value" formControlName="fechaFin" />
                            <mat-datepicker-toggle matIconSuffix [for]="pickerFin"></mat-datepicker-toggle>
                            <mat-datepicker #pickerFin></mat-datepicker>
                        </mat-form-field>
                    </div>

                    @if (form.controls.tipo.value === 'INCAPACIDAD') {
                        <mat-form-field class="w-full">
                            <mat-label>Tipo de incapacidad</mat-label>
                            <mat-select formControlName="subtipo">
                                <mat-option [value]="'Enfermedad general'">Enfermedad general</mat-option>
                                <mat-option [value]="'Riesgo de trabajo'">Riesgo de trabajo</mat-option>
                                <mat-option [value]="'Maternidad'">Maternidad</mat-option>
                            </mat-select>
                        </mat-form-field>

                        <mat-form-field class="w-full">
                            <mat-label>Folio del certificado</mat-label>
                            <input matInput formControlName="folio" maxlength="40" />
                        </mat-form-field>
                    }

                    <mat-form-field class="w-full">
                        <mat-label>Notas adicionales</mat-label>
                        <textarea matInput formControlName="notas" rows="2" maxlength="300"></textarea>
                    </mat-form-field>
                </form>
            </mat-dialog-content>
            <mat-dialog-actions align="end" class="!px-6 !pb-6">
                <button mat-stroked-button type="button" (click)="cancelar()">Cancelar</button>
                <button mat-flat-button color="primary" type="button" [disabled]="form.invalid || !fechasValidas" (click)="guardar()">
                    Guardar
                </button>
            </mat-dialog-actions>
        </div>
    `
})
export class IncidenciaDialogComponent {
    private readonly _dialogRef = inject(MatDialogRef<IncidenciaDialogComponent>);

    readonly form = new FormGroup({
        tipo: new FormControl<TipoIncidencia>('FALTA', { nonNullable: true, validators: [Validators.required] }),
        fechaInicio: new FormControl<DateTime | null>(DateTime.local().startOf('day'), { validators: [Validators.required] }),
        fechaFin: new FormControl<DateTime | null>(DateTime.local().startOf('day'), { validators: [Validators.required] }),
        subtipo: new FormControl<SubtipoIncapacidad | null>(null),
        folio: new FormControl<string>('', { nonNullable: true, validators: [Validators.maxLength(40)] }),
        notas: new FormControl<string>('', { nonNullable: true, validators: [Validators.maxLength(300)] })
    });

    constructor() {
        this.form.controls.tipo.valueChanges.subscribe((tipo) => {
            if (tipo === 'INCAPACIDAD') {
                this.form.controls.subtipo.setValidators([Validators.required]);
            } else {
                this.form.controls.subtipo.clearValidators();
                this.form.controls.subtipo.setValue(null);
                this.form.controls.folio.setValue('');
            }
            this.form.controls.subtipo.updateValueAndValidity();
        });
    }

    get fechasValidas(): boolean {
        const { fechaInicio, fechaFin } = this.form.getRawValue();
        if (!fechaInicio || !fechaFin) return false;
        return fechaFin >= fechaInicio;
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
        const resultado: IncidenciaGuardar = {
            tipo: v.tipo,
            fechaInicio: aFechaIso(v.fechaInicio)!,
            fechaFin: aFechaIso(v.fechaFin)!,
            subtipo: v.tipo === 'INCAPACIDAD' ? v.subtipo : null,
            folio: v.tipo === 'INCAPACIDAD' ? textoONull(v.folio) : null,
            notas: textoONull(v.notas)
        };

        this._dialogRef.close(resultado);
    }
}
