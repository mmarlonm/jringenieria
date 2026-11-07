import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DesempenoService } from '../desempeno.service';
import { ColaboradorDesempeno, EvaluacionDesempeno } from '../desempeno.types';
import { etiquetaEvaluador, etiquetaTipo } from '../desempeno.utils';

/** Alta o edición de una evaluación de desempeño mientras su ciclo está abierto. */
@Component({
    selector: 'app-dialogo-evaluacion-desempeno',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule],
    template: `
        <div class="flex flex-col w-full max-w-2xl">
            <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">
                    {{ data.evaluacion ? 'Editar evaluación de ' + data.evaluacion.colaboradorNombre : 'Nueva evaluación de desempeño' }}
                </h2>
                <button mat-icon-button mat-dialog-close>
                    <mat-icon svgIcon="heroicons_outline:x-mark"></mat-icon>
                </button>
            </div>

            <form [formGroup]="form" (ngSubmit)="guardar()" class="flex flex-col gap-3 pt-4">
                <mat-form-field *ngIf="!data.evaluacion" appearance="outline" class="w-full">
                    <mat-label>Colaborador</mat-label>
                    <mat-select formControlName="colaboradorId">
                        <mat-option *ngFor="let c of colaboradores" [value]="c.colaboradorId">{{ c.nombre }} — {{ c.puesto || 'Sin puesto' }}</mat-option>
                    </mat-select>
                    <mat-error>Selecciona al colaborador</mat-error>
                </mat-form-field>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Periodo (ej. 2026-S1)</mat-label>
                        <input matInput formControlName="periodo" maxlength="40" />
                        <mat-error>El periodo es obligatorio</mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Calificación (1.0 a 5.0)</mat-label>
                        <input matInput type="number" step="0.1" min="1" max="5" formControlName="calificacion" />
                        <mat-error>La calificación va de 1.0 a 5.0</mat-error>
                    </mat-form-field>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Tipo de evaluación</mat-label>
                        <mat-select formControlName="tipoEvaluacion">
                            <mat-option *ngFor="let t of tipos" [value]="t">{{ etiquetaTipo(t) }}</mat-option>
                        </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Evaluador</mat-label>
                        <mat-select formControlName="evaluador">
                            <mat-option *ngFor="let e of evaluadores" [value]="e">{{ etiquetaEvaluador(e) }}</mat-option>
                        </mat-select>
                    </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Objetivo</mat-label>
                    <textarea matInput formControlName="objetivo" rows="3" maxlength="2000"></textarea>
                    <mat-error>El objetivo es obligatorio</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Resultado</mat-label>
                    <textarea matInput formControlName="resultado" rows="3" maxlength="2000"></textarea>
                    <mat-hint>Para cerrar el ciclo se requieren la calificación y el resultado</mat-hint>
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Plan de acción</mat-label>
                    <textarea matInput formControlName="planAccion" rows="2" maxlength="2000"></textarea>
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Razón social (patrón)</mat-label>
                    <input matInput formControlName="razonSocial" maxlength="150" />
                </mat-form-field>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button mat-button type="button" mat-dialog-close [disabled]="guardando">Cancelar</button>
                    <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || guardando">
                        <mat-icon *ngIf="guardando" svgIcon="heroicons_outline:arrow-path" class="animate-spin mr-2"></mat-icon>
                        <span>{{ data.evaluacion ? 'Guardar cambios' : 'Crear evaluación' }}</span>
                    </button>
                </div>
            </form>
        </div>
    `
})
export class DialogoEvaluacionDesempenoComponent implements OnInit {
    private readonly _fb = inject(FormBuilder);
    private readonly _dialogRef = inject(MatDialogRef<DialogoEvaluacionDesempenoComponent>);
    private readonly _service = inject(DesempenoService);

    form!: FormGroup;
    guardando = false;
    colaboradores: ColaboradorDesempeno[] = [];
    tipos = ['Competencias', 'ObjetivosKpis', 'Evaluacion360', 'Mixta'];
    evaluadores = ['Jefe', 'Autoevaluacion', 'Par', 'ColaboradorACargo'];
    readonly etiquetaTipo = etiquetaTipo;
    readonly etiquetaEvaluador = etiquetaEvaluador;

    constructor(@Inject(MAT_DIALOG_DATA) public data: { evaluacion?: EvaluacionDesempeno }) {}

    ngOnInit(): void {
        const e = this.data.evaluacion;
        this.form = this._fb.group({
            colaboradorId: [null, e ? [] : [Validators.required]],
            periodo: [e?.periodo ?? '', [Validators.required, Validators.maxLength(40)]],
            calificacion: [e?.calificacion ?? null, [Validators.min(1), Validators.max(5)]],
            tipoEvaluacion: [e?.tipoEvaluacion ?? 'ObjetivosKpis', [Validators.required]],
            evaluador: [e?.evaluador ?? 'Jefe', [Validators.required]],
            objetivo: [e?.objetivo ?? '', [Validators.required, Validators.maxLength(2000)]],
            resultado: [e?.resultado ?? ''],
            planAccion: [e?.planAccion ?? ''],
            razonSocial: [e?.razonSocial ?? '']
        });

        if (!e) {
            this._service.colaboradores().subscribe({
                next: (lista) => (this.colaboradores = lista),
                error: () => alert('No se pudo cargar la lista de colaboradores')
            });
        }
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.guardando = true;
        const v = this.form.value;
        const dto = {
            colaboradorId: this.data.evaluacion?.colaboradorId ?? v.colaboradorId,
            periodo: v.periodo.trim(),
            objetivo: v.objetivo.trim(),
            resultado: v.resultado?.trim() || null,
            calificacion: v.calificacion === null || v.calificacion === '' ? null : Number(v.calificacion),
            planAccion: v.planAccion?.trim() || null,
            tipoEvaluacion: v.tipoEvaluacion,
            evaluador: v.evaluador,
            razonSocial: v.razonSocial?.trim() || null
        };

        const peticion = this.data.evaluacion
            ? this._service.actualizarEvaluacion(this.data.evaluacion.desempenoId, dto)
            : this._service.crearEvaluacion(dto);

        peticion.subscribe({
            next: (res) => {
                this.guardando = false;
                this._dialogRef.close(res);
            },
            error: (err) => {
                this.guardando = false;
                alert(err?.error?.mensaje || 'No se pudo guardar la evaluación');
            }
        });
    }
}
