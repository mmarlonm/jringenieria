import { MAT_DATE_FORMATS } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DateTime } from 'luxon';
import { AusenciasService } from '../ausencias/ausencias.service';
import { DiaNoLaborable } from '../ausencias/ausencias.types';
import { aFechaIso, mensajeError } from '../colaboradores/colaboradores.utils';

import { FORMATOS_FECHA_CORTA } from '../ausencias/ausencias.formats';

@Component({
    selector: 'rrhh-dias-no-laborables-dialog',
    standalone: true,
    providers: [{ provide: MAT_DATE_FORMATS, useValue: FORMATOS_FECHA_CORTA }],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatDatepickerModule
    ],
    template: `
        <div class="flex flex-col max-w-full">
            <div class="flex items-center justify-between px-6 pt-6 pb-2">
                <h2 class="text-lg font-bold">Días no laborables</h2>
                <div class="flex items-center gap-1">
                    <button mat-icon-button type="button" aria-label="Año anterior" (click)="cambiarAnio(-1)">
                        <mat-icon [svgIcon]="'heroicons_outline:chevron-left'"></mat-icon>
                    </button>
                    <span class="font-bold text-base min-w-[4rem] text-center">{{ anioActual() }}</span>
                    <button mat-icon-button type="button" aria-label="Año siguiente" (click)="cambiarAnio(1)">
                        <mat-icon [svgIcon]="'heroicons_outline:chevron-right'"></mat-icon>
                    </button>
                </div>
            </div>

            <mat-dialog-content class="!px-6 !pt-2 !pb-4">
                <!-- Formulario para agregar -->
                <form [formGroup]="form" (ngSubmit)="agregar()" class="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-6 p-4 rounded-xl border bg-gray-50/50 dark:bg-gray-800/20 dark:border-gray-800">
                    <mat-form-field class="sm:col-span-5">
                        <mat-label>Fecha</mat-label>
                        <input matInput [matDatepicker]="pickerDia" formControlName="fecha" />
                        <mat-datepicker-toggle matIconSuffix [for]="pickerDia"></mat-datepicker-toggle>
                        <mat-datepicker #pickerDia></mat-datepicker>
                    </mat-form-field>

                    <mat-form-field class="sm:col-span-5">
                        <mat-label>Nombre o motivo</mat-label>
                        <input matInput formControlName="nombre" maxlength="80" placeholder="Ej. Día de la Constitución" />
                    </mat-form-field>

                    <div class="sm:col-span-2 flex items-center mb-5">
                        <button mat-flat-button color="primary" class="w-full" type="submit" [disabled]="form.invalid || guardando()">
                            Agregar
                        </button>
                    </div>
                </form>

                <!-- Lista de días del año -->
                <div class="space-y-2 max-h-[360px] overflow-y-auto">
                    @for (d of dias(); track d.fecha) {
                        <div class="flex items-center justify-between p-3 rounded-xl border bg-card dark:border-gray-800">
                            <div>
                                <div class="font-semibold">{{ d.fecha | date: 'dd/MM/yyyy' }}</div>
                                <div class="text-sm text-secondary">{{ d.nombre }}</div>
                            </div>
                            <button mat-icon-button color="warn" type="button" aria-label="Quitar día" (click)="quitar(d.fecha)">
                                <mat-icon [svgIcon]="'heroicons_outline:trash'"></mat-icon>
                            </button>
                        </div>
                    } @empty {
                        <div class="p-6 text-center text-secondary border rounded-xl dark:border-gray-800">
                            No hay días no laborables registrados para {{ anioActual() }}.
                        </div>
                    }
                </div>
            </mat-dialog-content>

            <mat-dialog-actions align="end" class="!px-6 !pb-6">
                <button mat-stroked-button type="button" (click)="cerrar()">Cerrar</button>
            </mat-dialog-actions>
        </div>
    `
})
export class DiasNoLaborablesDialogComponent {
    private readonly _dialogRef = inject(MatDialogRef<DiasNoLaborablesDialogComponent>);
    private readonly _ausenciasService = inject(AusenciasService);
    private readonly _snackBar = inject(MatSnackBar);
    private readonly _data = inject<{ anio: number; dias: DiaNoLaborable[] }>(MAT_DIALOG_DATA);

    readonly anioActual = signal(this._data.anio);
    readonly dias = signal<DiaNoLaborable[]>(this._data.dias);
    readonly guardando = signal(false);

    readonly form = new FormGroup({
        fecha: new FormControl<DateTime | null>(null, { validators: [Validators.required] }),
        nombre: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(80)] })
    });

    cambiarAnio(delta: number): void {
        const nuevo = this.anioActual() + delta;
        this.anioActual.set(nuevo);
        this.cargarDias(nuevo);
    }

    cargarDias(anio: number): void {
        this._ausenciasService.diasNoLaborables(anio).subscribe({
            next: (dias) => this.dias.set(dias),
            error: (e) => this.aviso(mensajeError(e, 'No se pudieron cargar los días no laborables.'))
        });
    }

    agregar(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const v = this.form.getRawValue();
        const fechaIso = aFechaIso(v.fecha);
        const nombre = v.nombre.trim();
        if (!fechaIso || !nombre) return;

        this.guardando.set(true);
        this._ausenciasService.agregarDiaNoLaborable(fechaIso, nombre).subscribe({
            next: (r) => {
                this.guardando.set(false);
                this.aviso(r.mensaje || 'Día no laborable agregado.');
                this.form.reset({ fecha: null, nombre: '' });
                this.cargarDias(this.anioActual());
            },
            error: (e) => {
                this.guardando.set(false);
                this.aviso(mensajeError(e, 'No se pudo agregar el día no laborable.'));
            }
        });
    }

    quitar(fecha: string): void {
        const fIso = fecha.includes('T') ? fecha.split('T')[0] : fecha;
        this._ausenciasService.quitarDiaNoLaborable(fIso).subscribe({
            next: (r) => {
                this.aviso(r.mensaje || 'Día no laborable eliminado.');
                this.cargarDias(this.anioActual());
            },
            error: (e) => this.aviso(mensajeError(e, 'No se pudo quitar el día no laborable.'))
        });
    }

    cerrar(): void {
        this._dialogRef.close();
    }

    private aviso(texto: string): void {
        this._snackBar.open(texto, 'Cerrar', { duration: 5000 });
    }
}
