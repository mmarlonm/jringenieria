import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ReclutamientoService } from '../reclutamiento.service';
import { Candidato } from '../reclutamiento.types';

@Component({
    selector: 'app-dialogo-candidato',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        MatIconModule
    ],
    template: `
        <div class="flex flex-col max-w-xl w-full">
            <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">
                    {{ data?.candidato ? 'Editar Candidato' : 'Registrar Nuevo Candidato' }}
                </h2>
                <button mat-icon-button mat-dialog-close>
                    <mat-icon svgIcon="heroicons_outline:x-mark"></mat-icon>
                </button>
            </div>

            <form [formGroup]="form" (ngSubmit)="guardar()" class="flex flex-col gap-4 pt-4">
                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Nombre Completo</mat-label>
                    <input matInput formControlName="nombre" placeholder="Ej. Juan Pérez García" />
                    <mat-error *ngIf="form.get('nombre')?.hasError('required')">El nombre es obligatorio</mat-error>
                </mat-form-field>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Correo Electrónico</mat-label>
                        <input matInput type="email" formControlName="email" placeholder="juan@ejemplo.com" />
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Teléfono</mat-label>
                        <input matInput formControlName="telefono" placeholder="Ej. 771 123 4567" />
                    </mat-form-field>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Fuente de Reclutamiento</mat-label>
                        <mat-select formControlName="fuente">
                            <mat-option value="LinkedIn">LinkedIn</mat-option>
                            <mat-option value="Computrabajo">Computrabajo</mat-option>
                            <mat-option value="OCC">OCC</mat-option>
                            <mat-option value="Referido">Referido</mat-option>
                            <mat-option value="Bolsa de trabajo interna">Bolsa de trabajo interna</mat-option>
                            <mat-option value="Feria de empleo">Feria de empleo</mat-option>
                            <mat-option value="Otro">Otro</mat-option>
                        </mat-select>
                        <mat-error *ngIf="form.get('fuente')?.hasError('required')">La fuente es obligatoria</mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Expectativa Salarial Mensual</mat-label>
                        <input matInput type="number" formControlName="expectativaSalarial" placeholder="0.00" />
                    </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Notas Iniciales</mat-label>
                    <textarea matInput formControlName="notas" rows="2" placeholder="Observaciones iniciales del candidato..."></textarea>
                </mat-form-field>

                <!-- Aviso de privacidad -->
                <div class="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50">
                    <mat-checkbox formControlName="avisoPrivacidadAceptado" color="primary">
                        <span class="font-medium text-amber-900 dark:text-amber-200">
                            Aviso de privacidad firmado / aceptado
                        </span>
                    </mat-checkbox>
                    <p class="text-xs text-amber-700 dark:text-amber-300 mt-1 pl-7">
                        Obligatorio para que el candidato pueda ser entrevistado, evaluado o calificado.
                    </p>
                </div>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button mat-button type="button" mat-dialog-close>Cancelar</button>
                    <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || guardando">
                        {{ guardando ? 'Guardando...' : (data?.candidato ? 'Actualizar' : 'Registrar Candidato') }}
                    </button>
                </div>
            </form>
        </div>
    `
})
export class DialogoCandidatoComponent implements OnInit {
    private readonly _fb = inject(FormBuilder);
    private readonly _dialogRef = inject(MatDialogRef<DialogoCandidatoComponent>);
    private readonly _service = inject(ReclutamientoService);

    form!: FormGroup;
    guardando = false;

    constructor(@Inject(MAT_DIALOG_DATA) public data: { requisicionId: number; candidato?: Candidato }) {}

    ngOnInit(): void {
        this.form = this._fb.group({
            nombre: [this.data?.candidato?.nombre || '', [Validators.required, Validators.maxLength(200)]],
            email: [this.data?.candidato?.email || '', [Validators.email, Validators.maxLength(150)]],
            telefono: [this.data?.candidato?.telefono || '', [Validators.maxLength(50)]],
            fuente: [this.data?.candidato?.fuente || 'LinkedIn', [Validators.required]],
            expectativaSalarial: [this.data?.candidato?.expectativaSalarial || null],
            notas: [this.data?.candidato?.notas || ''],
            avisoPrivacidadAceptado: [this.data?.candidato?.avisoPrivacidadAceptado || false]
        });
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.guardando = true;
        const val = this.form.value;

        if (this.data?.candidato) {
            this._service.actualizarCandidato(this.data.candidato.candidatoId, val).subscribe({
                next: (res) => {
                    this.guardando = false;
                    this._dialogRef.close(res);
                },
                error: (err) => {
                    this.guardando = false;
                    alert(err?.error?.mensaje || 'Error al actualizar el candidato');
                }
            });
        } else {
            this._service.crearCandidato({
                ...val,
                requisicionId: this.data.requisicionId
            }).subscribe({
                next: (res) => {
                    this.guardando = false;
                    this._dialogRef.close(res);
                },
                error: (err) => {
                    this.guardando = false;
                    alert(err?.error?.mensaje || 'Error al registrar el candidato');
                }
            });
        }
    }
}

