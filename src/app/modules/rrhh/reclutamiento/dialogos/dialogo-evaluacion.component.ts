import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ReclutamientoService } from '../reclutamiento.service';

@Component({
    selector: 'app-dialogo-evaluacion',
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
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <mat-icon svgIcon="heroicons_outline:clipboard-document-check"></mat-icon>
                    Registrar Evaluación - {{ data.candidatoNombre }}
                </h2>
                <button mat-icon-button mat-dialog-close>
                    <mat-icon svgIcon="heroicons_outline:x-mark"></mat-icon>
                </button>
            </div>

            <form [formGroup]="form" (ngSubmit)="guardar()" class="flex flex-col gap-4 pt-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Tipo de Evaluación</mat-label>
                        <mat-select formControlName="tipo">
                            <mat-option value="Psicometrica">Psicométrica</mat-option>
                            <mat-option value="Practica">Práctica</mat-option>
                        </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Calificación (1.0 a 5.0)</mat-label>
                        <input matInput type="number" step="0.1" min="1.0" max="5.0" formControlName="calificacion" />
                        <mat-error *ngIf="form.get('calificacion')?.hasError('required')">Calificación obligatoria</mat-error>
                        <mat-error *ngIf="form.get('calificacion')?.hasError('min') || form.get('calificacion')?.hasError('max')">Debe ser entre 1.0 y 5.0</mat-error>
                    </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Nombre del Evaluador</mat-label>
                    <input matInput formControlName="evaluadorNombre" placeholder="Ej. Psic. Carlos Ruiz" />
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Observaciones y Resultados</mat-label>
                    <textarea matInput formControlName="observaciones" rows="3" placeholder="Detalles de la prueba psicométrica o técnica aplicada..."></textarea>
                </mat-form-field>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button mat-button type="button" mat-dialog-close>Cancelar</button>
                    <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || guardando">
                        {{ guardando ? 'Guardando...' : 'Registrar Evaluación' }}
                    </button>
                </div>
            </form>
        </div>
    `
})
export class DialogoEvaluacionComponent implements OnInit {
    private readonly _fb = inject(FormBuilder);
    private readonly _dialogRef = inject(MatDialogRef<DialogoEvaluacionComponent>);
    private readonly _service = inject(ReclutamientoService);

    form!: FormGroup;
    guardando = false;

    constructor(@Inject(MAT_DIALOG_DATA) public data: { candidatoId: number; candidatoNombre: string; tipoInicial?: string }) {}

    ngOnInit(): void {
        this.form = this._fb.group({
            tipo: [this.data.tipoInicial || 'Psicometrica', [Validators.required]],
            calificacion: [4.0, [Validators.required, Validators.min(1.0), Validators.max(5.0)]],
            evaluadorNombre: [''],
            observaciones: ['']
        });
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.guardando = true;
        const val = this.form.value;

        this._service.registrarEvaluacion({
            candidatoId: this.data.candidatoId,
            tipo: val.tipo,
            evaluadorNombre: val.evaluadorNombre,
            calificacion: val.calificacion,
            observaciones: val.observaciones
        }).subscribe({
            next: (res) => {
                this.guardando = false;
                this._dialogRef.close(res);
            },
            error: (err) => {
                this.guardando = false;
                alert(err?.error?.mensaje || 'Error al registrar la evaluación');
            }
        });
    }
}

