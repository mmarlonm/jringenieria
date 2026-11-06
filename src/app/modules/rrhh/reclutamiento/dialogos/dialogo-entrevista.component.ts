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
    selector: 'app-dialogo-entrevista',
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
        <div class="flex flex-col max-w-2xl w-full">
            <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <mat-icon svgIcon="heroicons_outline:chat-bubble-left-right"></mat-icon>
                    Registrar Entrevista - {{ data.candidatoNombre }}
                </h2>
                <button mat-icon-button mat-dialog-close>
                    <mat-icon svgIcon="heroicons_outline:x-mark"></mat-icon>
                </button>
            </div>

            <form [formGroup]="form" (ngSubmit)="guardar()" class="flex flex-col gap-4 pt-4">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Tipo de Entrevista</mat-label>
                        <mat-select formControlName="tipo">
                            <mat-option value="RRHH">RRHH</mat-option>
                            <mat-option value="Tecnica">Técnica</mat-option>
                        </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Nombre del Entrevistador</mat-label>
                        <input matInput formControlName="entrevistadorNombre" placeholder="Ej. Lic. Brenda Morales" />
                        <mat-error *ngIf="form.get('entrevistadorNombre')?.hasError('required')">El entrevistador es requerido</mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Resultado</mat-label>
                        <mat-select formControlName="resultado">
                            <mat-option value="Favorable">Favorable</mat-option>
                            <mat-option value="EnEspera">En Espera</mat-option>
                            <mat-option value="Desfavorable">Desfavorable</mat-option>
                        </mat-select>
                    </mat-form-field>
                </div>

                <!-- Rubros con escala 1 a 5 y etiquetas descriptivas -->
                <div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-col gap-3">
                    <h3 class="text-sm font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                        Evaluación de Competencias (Escala 1 a 5)
                    </h3>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <mat-form-field appearance="outline" class="w-full">
                            <mat-label>Comunicación</mat-label>
                            <mat-select formControlName="calificacionComunicacion">
                                <mat-option *ngFor="let opt of escalas" [value]="opt.valor">
                                    {{ opt.valor }} - {{ opt.etiqueta }}
                                </mat-option>
                            </mat-select>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="w-full">
                            <mat-label>Experiencia</mat-label>
                            <mat-select formControlName="calificacionExperiencia">
                                <mat-option *ngFor="let opt of escalas" [value]="opt.valor">
                                    {{ opt.valor }} - {{ opt.etiqueta }}
                                </mat-option>
                            </mat-select>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="w-full">
                            <mat-label>Competencias Técnicas</mat-label>
                            <mat-select formControlName="calificacionCompetenciasTecnicas">
                                <mat-option *ngFor="let opt of escalas" [value]="opt.valor">
                                    {{ opt.valor }} - {{ opt.etiqueta }}
                                </mat-option>
                            </mat-select>
                        </mat-form-field>
                    </div>

                    <div class="text-right text-sm font-medium text-primary">
                        Promedio de la entrevista: {{ promedioCalculado.toFixed(1) }} / 5.0
                    </div>
                </div>

                <!-- Notas STAR -->
                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Notas en Formato STAR (Situación, Tarea, Acción, Resultado)</mat-label>
                    <textarea matInput formControlName="notasStar" rows="4"
                              placeholder="S: Describir la situación afrontada por el candidato&#10;T: Tarea u objetivo a resolver&#10;A: Acciones que tomó&#10;R: Resultados obtenidos"></textarea>
                </mat-form-field>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button mat-button type="button" mat-dialog-close>Cancelar</button>
                    <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || guardando">
                        {{ guardando ? 'Guardando...' : 'Registrar Entrevista' }}
                    </button>
                </div>
            </form>
        </div>
    `
})
export class DialogoEntrevistaComponent implements OnInit {
    private readonly _fb = inject(FormBuilder);
    private readonly _dialogRef = inject(MatDialogRef<DialogoEntrevistaComponent>);
    private readonly _service = inject(ReclutamientoService);

    form!: FormGroup;
    guardando = false;

    readonly escalas = [
        { valor: 1.0, etiqueta: 'Deficiente' },
        { valor: 2.0, etiqueta: 'Regular' },
        { valor: 3.0, etiqueta: 'Bueno' },
        { valor: 4.0, etiqueta: 'Muy Bueno' },
        { valor: 5.0, etiqueta: 'Excelente' }
    ];

    constructor(@Inject(MAT_DIALOG_DATA) public data: { candidatoId: number; candidatoNombre: string }) {}

    get promedioCalculado(): number {
        if (!this.form) return 0;
        const c = this.form.get('calificacionComunicacion')?.value || 0;
        const e = this.form.get('calificacionExperiencia')?.value || 0;
        const t = this.form.get('calificacionCompetenciasTecnicas')?.value || 0;
        return (c + e + t) / 3;
    }

    ngOnInit(): void {
        this.form = this._fb.group({
            tipo: ['RRHH', [Validators.required]],
            entrevistadorNombre: ['', [Validators.required, Validators.maxLength(150)]],
            resultado: ['Favorable', [Validators.required]],
            calificacionComunicacion: [3.0, [Validators.required, Validators.min(1), Validators.max(5)]],
            calificacionExperiencia: [3.0, [Validators.required, Validators.min(1), Validators.max(5)]],
            calificacionCompetenciasTecnicas: [3.0, [Validators.required, Validators.min(1), Validators.max(5)]],
            notasStar: ['']
        });
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.guardando = true;
        const val = this.form.value;

        this._service.registrarEntrevista({
            candidatoId: this.data.candidatoId,
            tipo: val.tipo,
            entrevistadorNombre: val.entrevistadorNombre,
            resultado: val.resultado,
            calificacionComunicacion: val.calificacionComunicacion,
            calificacionExperiencia: val.calificacionExperiencia,
            calificacionCompetenciasTecnicas: val.calificacionCompetenciasTecnicas,
            notasStar: val.notasStar
        }).subscribe({
            next: (res) => {
                this.guardando = false;
                this._dialogRef.close(res);
            },
            error: (err) => {
                this.guardando = false;
                alert(err?.error?.mensaje || 'Error al registrar la entrevista');
            }
        });
    }
}

