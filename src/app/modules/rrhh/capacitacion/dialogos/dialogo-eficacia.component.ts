import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { CapacitacionService } from '../capacitacion.service';
import { CapacitacionDetalle } from '../capacitacion.types';

@Component({
    selector: 'app-dialogo-eficacia',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule
    ],
    template: `
        <div class="flex flex-col max-w-lg w-full">
            <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">
                    Evaluación de Eficacia: {{ data.capacitacion.folio }}
                </h2>
                <button mat-icon-button mat-dialog-close>
                    <mat-icon svgIcon="heroicons_outline:x-mark"></mat-icon>
                </button>
            </div>

            <form [formGroup]="form" (ngSubmit)="guardar()" class="flex flex-col gap-4 pt-4">
                <div class="text-sm text-gray-600 dark:text-gray-400">
                    Evalúe el impacto real de la capacitación en el desempeño y cumplimiento de objetivos (umbral mínimo de eficacia: <span class="font-bold">80%</span>).
                </div>

                <!-- Porcentaje -->
                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Evaluación de Eficacia (%)</mat-label>
                    <input matInput type="number" formControlName="evaluacionEficaciaPorcentaje" min="0" max="100" step="1" placeholder="Ej. 85" />
                    <mat-error *ngIf="form.get('evaluacionEficaciaPorcentaje')?.invalid">Debe ser entre 0 y 100</mat-error>
                </mat-form-field>

                <!-- Semáforo/Resultado previo -->
                <div *ngIf="resultadoCalculado === 'Eficaz'" class="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm flex items-center gap-2">
                    <mat-icon class="text-green-600" svgIcon="heroicons_outline:check-circle"></mat-icon>
                    <span><strong>Resultado: EFICAZ</strong> (Cumple el objetivo y umbral de calidad)</span>
                </div>

                <div *ngIf="resultadoCalculado === 'NoEficaz'" class="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm flex items-center gap-2">
                    <mat-icon class="text-red-600" svgIcon="heroicons_outline:exclamation-triangle"></mat-icon>
                    <span><strong>Resultado: NO EFICAZ</strong> (Menor al 80%, requiere plan de refuerzo)</span>
                </div>

                <div *ngIf="resultadoCalculado === 'Pendiente'" class="p-3 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-sm flex items-center gap-2">
                    <mat-icon svgIcon="heroicons_outline:clock"></mat-icon>
                    <span><strong>Resultado: Pendiente</strong> (Sin evaluación registrada)</span>
                </div>

                <!-- Retroalimentación -->
                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Retroalimentación y Comentarios de Desempeño</mat-label>
                    <textarea matInput formControlName="retroalimentacionColaborador" rows="4" placeholder="Comentarios del jefe directo, evidencias del impacto en el puesto o hallazgos..."></textarea>
                </mat-form-field>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button mat-button type="button" mat-dialog-close [disabled]="guardando">
                        Cancelar
                    </button>
                    <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || guardando">
                        <mat-icon *ngIf="guardando" svgIcon="heroicons_outline:arrow-path" class="animate-spin mr-2"></mat-icon>
                        <span>Guardar Evaluación</span>
                    </button>
                </div>
            </form>
        </div>
    `
})
export class DialogoEficaciaComponent implements OnInit {
    private readonly _fb = inject(FormBuilder);
    private readonly _dialogRef = inject(MatDialogRef<DialogoEficaciaComponent>);
    private readonly _service = inject(CapacitacionService);

    form!: FormGroup;
    guardando = false;

    constructor(@Inject(MAT_DIALOG_DATA) public data: { capacitacion: CapacitacionDetalle }) {}

    get resultadoCalculado(): string {
        const val = this.form?.get('evaluacionEficaciaPorcentaje')?.value;
        if (val === null || val === undefined || val === '') return 'Pendiente';
        const num = Number(val);
        return num >= 80 ? 'Eficaz' : 'NoEficaz';
    }

    ngOnInit(): void {
        this.form = this._fb.group({
            evaluacionEficaciaPorcentaje: [
                this.data.capacitacion.evaluacionEficaciaPorcentaje ?? null,
                [Validators.min(0), Validators.max(100)]
            ],
            retroalimentacionColaborador: [
                this.data.capacitacion.retroalimentacionColaborador || '',
                [Validators.maxLength(2000)]
            ]
        });
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.guardando = true;
        const val = this.form.value;

        const payload = {
            evaluacionEficaciaPorcentaje: val.evaluacionEficaciaPorcentaje !== null && val.evaluacionEficaciaPorcentaje !== ''
                ? Number(val.evaluacionEficaciaPorcentaje)
                : null,
            retroalimentacionColaborador: val.retroalimentacionColaborador ? val.retroalimentacionColaborador.trim() : null
        };

        this._service.registrarEficacia(this.data.capacitacion.capacitacionId, payload).subscribe({
            next: (res) => {
                this.guardando = false;
                this._dialogRef.close(res);
            },
            error: (err) => {
                this.guardando = false;
                alert(err?.error?.mensaje || 'Error al registrar la eficacia');
            }
        });
    }
}
