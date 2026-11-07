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
import { ClasificacionBrecha, ColaboradorDesempeno, EvaluacionCompetencia } from '../desempeno.types';
import { aFechaInput, claseClasificacion, etiquetaClasificacion, etiquetaEstatus } from '../desempeno.utils';

/** Evaluación individual de una competencia: nivel requerido vs. actual (0 a 4) y su brecha. */
@Component({
    selector: 'app-dialogo-evaluacion-competencia',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule],
    template: `
        <div class="flex flex-col w-full max-w-2xl">
            <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">
                    {{ data.evaluacion ? 'Editar ' + data.evaluacion.competencia : 'Nueva evaluación de competencia' }}
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

                <mat-form-field *ngIf="!data.evaluacion" appearance="outline" class="w-full">
                    <mat-label>Competencia</mat-label>
                    <input matInput formControlName="competencia" maxlength="150" />
                    <mat-error>La competencia es obligatoria</mat-error>
                </mat-form-field>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Nivel requerido (0 a 4)</mat-label>
                        <mat-select formControlName="nivelRequerido">
                            <mat-option [value]="null">{{ data.evaluacion ? 'Conservar' : 'Tomar de la matriz' }}</mat-option>
                            <mat-option *ngFor="let n of niveles" [value]="n">{{ n }}</mat-option>
                        </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Nivel actual (0 a 4)</mat-label>
                        <mat-select formControlName="nivelActual">
                            <mat-option *ngFor="let n of niveles" [value]="n">{{ n }}</mat-option>
                        </mat-select>
                        <mat-error>Indica el nivel actual</mat-error>
                    </mat-form-field>
                </div>

                <div *ngIf="brechaVista !== null" class="flex items-center gap-2 text-sm">
                    <span class="text-gray-500">Brecha:</span>
                    <span class="font-bold">{{ brechaVista }}</span>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" [ngClass]="claseClasificacion(clasificacionVista)">
                        {{ etiquetaClasificacion(clasificacionVista) }}
                    </span>
                    <span *ngIf="brechaVista > 0" class="text-xs text-amber-700 dark:text-amber-300">Requiere capacitación</span>
                </div>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Acción requerida</mat-label>
                    <textarea matInput formControlName="accion" rows="2" maxlength="1000"></textarea>
                </mat-form-field>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Responsable</mat-label>
                        <input matInput formControlName="responsable" maxlength="150" />
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Fecha compromiso</mat-label>
                        <input matInput type="date" formControlName="fechaCompromiso" />
                    </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Evidencia</mat-label>
                    <input matInput formControlName="evidencia" maxlength="500" />
                </mat-form-field>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Estatus</mat-label>
                        <mat-select formControlName="estatus">
                            <mat-option *ngFor="let s of estatuses" [value]="s">{{ etiquetaEstatus(s) }}</mat-option>
                        </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Razón social (patrón)</mat-label>
                        <input matInput formControlName="razonSocial" maxlength="150" />
                    </mat-form-field>
                </div>

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
export class DialogoEvaluacionCompetenciaComponent implements OnInit {
    private readonly _fb = inject(FormBuilder);
    private readonly _dialogRef = inject(MatDialogRef<DialogoEvaluacionCompetenciaComponent>);
    private readonly _service = inject(DesempenoService);

    form!: FormGroup;
    guardando = false;
    colaboradores: ColaboradorDesempeno[] = [];
    readonly niveles = [0, 1, 2, 3, 4];
    readonly estatuses = ['Pendiente', 'EnProceso', 'Cerrada'];
    readonly etiquetaEstatus = etiquetaEstatus;
    readonly etiquetaClasificacion = etiquetaClasificacion;
    readonly claseClasificacion = claseClasificacion;

    constructor(@Inject(MAT_DIALOG_DATA) public data: { evaluacion?: EvaluacionCompetencia }) {}

    /** Brecha en vivo cuando ya se conocen los dos niveles (si el requerido viene de la matriz, la calcula el API). */
    get brechaVista(): number | null {
        const req = this.form?.value.nivelRequerido ?? this.data.evaluacion?.nivelRequerido;
        const act = this.form?.value.nivelActual;
        if (req === null || req === undefined || act === null || act === undefined) return null;
        return Number(req) - Number(act);
    }

    get clasificacionVista(): ClasificacionBrecha {
        const b = this.brechaVista ?? 0;
        return b <= 0 ? 'SinBrecha' : b === 1 ? 'BrechaMenor' : 'BrechaCritica';
    }

    ngOnInit(): void {
        const e = this.data.evaluacion;
        this.form = this._fb.group({
            colaboradorId: [null, e ? [] : [Validators.required]],
            competencia: [e?.competencia ?? '', e ? [] : [Validators.required, Validators.maxLength(150)]],
            nivelRequerido: [null as number | null],
            nivelActual: [e?.nivelActual ?? null, [Validators.required]],
            accion: [e?.accion ?? ''],
            responsable: [e?.responsable ?? ''],
            fechaCompromiso: [aFechaInput(e?.fechaCompromiso)],
            evidencia: [e?.evidencia ?? ''],
            estatus: [e?.estatus ?? 'Pendiente', [Validators.required]],
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
            competencia: (this.data.evaluacion?.competencia ?? v.competencia).trim(),
            nivelRequerido: v.nivelRequerido,
            nivelActual: Number(v.nivelActual),
            accion: v.accion?.trim() || null,
            responsable: v.responsable?.trim() || null,
            fechaCompromiso: v.fechaCompromiso || null,
            evidencia: v.evidencia?.trim() || null,
            estatus: v.estatus,
            razonSocial: v.razonSocial?.trim() || null
        };

        const peticion = this.data.evaluacion
            ? this._service.actualizarCompetencia(this.data.evaluacion.evaluacionId, dto)
            : this._service.crearCompetencia(dto);

        peticion.subscribe({
            next: (res) => {
                this.guardando = false;
                this._dialogRef.close(res);
            },
            error: (err) => {
                this.guardando = false;
                alert(err?.error?.mensaje || 'No se pudo guardar la evaluación de competencia');
            }
        });
    }
}
