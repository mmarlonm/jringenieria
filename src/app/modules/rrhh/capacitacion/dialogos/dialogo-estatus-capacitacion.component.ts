import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CapacitacionService } from '../capacitacion.service';
import { CapacitacionDetalle, ESTATUS_CAPACITACION } from '../capacitacion.types';

@Component({
    selector: 'app-dialogo-estatus-capacitacion',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatIconModule
    ],
    template: `
        <div class="flex flex-col max-w-lg w-full">
            <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">
                    Cambiar Estatus: {{ data.capacitacion.folio }}
                </h2>
                <button mat-icon-button mat-dialog-close>
                    <mat-icon svgIcon="heroicons_outline:x-mark"></mat-icon>
                </button>
            </div>

            <form [formGroup]="form" (ngSubmit)="guardar()" class="flex flex-col gap-4 pt-4">
                <div class="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
                    Estatus actual: <span class="font-bold">{{ data.capacitacion.estatus }}</span>
                </div>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Nuevo Estatus</mat-label>
                    <mat-select formControlName="nuevoEstatus">
                        <mat-option *ngFor="let e of estatuses" [value]="e">{{ e }}</mat-option>
                    </mat-select>
                    <mat-error *ngIf="form.get('nuevoEstatus')?.hasError('required')">El estatus es obligatorio</mat-error>
                </mat-form-field>

                <!-- Si es Completada, requiere/sugiere fecha término -->
                <div *ngIf="form.get('nuevoEstatus')?.value === 'Completada'" class="flex flex-col gap-2">
                    <div class="text-xs text-amber-600 dark:text-amber-400">
                        Nota: Para completar se requiere tener al menos 1 participante registrado.
                    </div>
                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Fecha de Término</mat-label>
                        <input matInput type="date" formControlName="fechaTermino" />
                    </mat-form-field>
                </div>

                <!-- Si es Cancelada, requiere motivo -->
                <div *ngIf="form.get('nuevoEstatus')?.value === 'Cancelada'" class="flex flex-col gap-2">
                    <div class="text-xs text-red-600 dark:text-red-400">
                        Al cancelar, el costo real del curso se ajustará automáticamente a $0.00.
                    </div>
                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Motivo de Cancelación</mat-label>
                        <textarea matInput formControlName="motivoCancelacion" rows="3" placeholder="Explique la causa de cancelación..."></textarea>
                        <mat-error *ngIf="form.get('motivoCancelacion')?.hasError('required')">El motivo es obligatorio para cancelar</mat-error>
                    </mat-form-field>
                </div>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button mat-button type="button" mat-dialog-close [disabled]="guardando">
                        Cancelar
                    </button>
                    <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || guardando">
                        <mat-icon *ngIf="guardando" svgIcon="heroicons_outline:arrow-path" class="animate-spin mr-2"></mat-icon>
                        <span>Confirmar Cambio</span>
                    </button>
                </div>
            </form>
        </div>
    `
})
export class DialogoEstatusCapacitacionComponent implements OnInit {
    private readonly _fb = inject(FormBuilder);
    private readonly _dialogRef = inject(MatDialogRef<DialogoEstatusCapacitacionComponent>);
    private readonly _service = inject(CapacitacionService);

    form!: FormGroup;
    guardando = false;
    estatuses = ESTATUS_CAPACITACION;

    constructor(@Inject(MAT_DIALOG_DATA) public data: { capacitacion: CapacitacionDetalle }) {}

    ngOnInit(): void {
        const fechaTermStr = this.data.capacitacion.fechaTermino
            ? this.data.capacitacion.fechaTermino.substring(0, 10)
            : new Date().toISOString().substring(0, 10);

        this.form = this._fb.group({
            nuevoEstatus: [this.data.capacitacion.estatus, [Validators.required]],
            fechaTermino: [fechaTermStr],
            motivoCancelacion: ['']
        });

        this.form.get('nuevoEstatus')?.valueChanges.subscribe((nuevo) => {
            const motivoControl = this.form.get('motivoCancelacion');
            if (nuevo === 'Cancelada') {
                motivoControl?.setValidators([Validators.required, Validators.maxLength(500)]);
            } else {
                motivoControl?.clearValidators();
            }
            motivoControl?.updateValueAndValidity();
        });
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.guardando = true;
        const val = this.form.value;

        const payload = {
            nuevoEstatus: val.nuevoEstatus,
            motivoCancelacion: val.motivoCancelacion ? val.motivoCancelacion.trim() : null,
            fechaTermino: val.fechaTermino ? new Date(val.fechaTermino).toISOString() : null
        };

        this._service.cambiarEstatus(this.data.capacitacion.capacitacionId, payload).subscribe({
            next: (res) => {
                this.guardando = false;
                this._dialogRef.close(res);
            },
            error: (err) => {
                this.guardando = false;
                alert(err?.error?.mensaje || 'Error al cambiar el estatus');
            }
        });
    }
}
