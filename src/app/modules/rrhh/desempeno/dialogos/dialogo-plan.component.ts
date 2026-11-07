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
import { ColaboradorDesempeno, PlanDesarrollo } from '../desempeno.types';
import { aFechaInput, etiquetaEstatus } from '../desempeno.utils';

/** Alta o edición del plan de desarrollo individual. RRHH decide después cuándo el colaborador lo ve. */
@Component({
    selector: 'app-dialogo-plan',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule],
    template: `
        <div class="flex flex-col w-full max-w-xl">
            <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">
                    {{ data.plan ? 'Editar plan de ' + data.plan.colaboradorNombre : 'Nuevo plan de desarrollo' }}
                </h2>
                <button mat-icon-button mat-dialog-close>
                    <mat-icon svgIcon="heroicons_outline:x-mark"></mat-icon>
                </button>
            </div>

            <form [formGroup]="form" (ngSubmit)="guardar()" class="flex flex-col gap-3 pt-4">
                <mat-form-field *ngIf="!data.plan" appearance="outline" class="w-full">
                    <mat-label>Colaborador</mat-label>
                    <mat-select formControlName="colaboradorId">
                        <mat-option *ngFor="let c of colaboradores" [value]="c.colaboradorId">{{ c.nombre }} — {{ c.puesto || 'Sin puesto' }}</mat-option>
                    </mat-select>
                    <mat-hint *ngIf="colaboradoresCargados && colaboradores.length === 0" class="!text-amber-700">No hay colaboradores disponibles. Dalos de alta en RRHH › Colaboradores.</mat-hint>
                    <mat-error>Selecciona al colaborador</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Competencia a desarrollar</mat-label>
                    <input matInput formControlName="competencia" maxlength="150" />
                    <mat-error>La competencia es obligatoria</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Acción</mat-label>
                    <textarea matInput formControlName="accion" rows="3" maxlength="1000"></textarea>
                    <mat-error>La acción es obligatoria</mat-error>
                </mat-form-field>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Fecha compromiso</mat-label>
                        <input matInput type="date" formControlName="fechaCompromiso" />
                        <mat-error>La fecha compromiso es obligatoria</mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Seguimiento</mat-label>
                        <mat-select formControlName="estatus">
                            <mat-option *ngFor="let s of estatuses" [value]="s">{{ etiquetaEstatus(s) }}</mat-option>
                        </mat-select>
                    </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Notas de seguimiento</mat-label>
                    <textarea matInput formControlName="seguimiento" rows="2" maxlength="1000"></textarea>
                </mat-form-field>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button mat-button type="button" mat-dialog-close [disabled]="guardando">Cancelar</button>
                    <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || guardando">
                        <mat-icon *ngIf="guardando" svgIcon="heroicons_outline:arrow-path" class="animate-spin mr-2"></mat-icon>
                        <span>{{ data.plan ? 'Guardar cambios' : 'Crear plan' }}</span>
                    </button>
                </div>
            </form>
        </div>
    `
})
export class DialogoPlanComponent implements OnInit {
    private readonly _fb = inject(FormBuilder);
    private readonly _dialogRef = inject(MatDialogRef<DialogoPlanComponent>);
    private readonly _service = inject(DesempenoService);

    form!: FormGroup;
    guardando = false;
    colaboradores: ColaboradorDesempeno[] = [];
    colaboradoresCargados = false;
    readonly estatuses = ['Pendiente', 'EnProceso', 'Completado'];
    readonly etiquetaEstatus = etiquetaEstatus;

    constructor(@Inject(MAT_DIALOG_DATA) public data: { plan?: PlanDesarrollo }) {}

    ngOnInit(): void {
        const p = this.data.plan;
        this.form = this._fb.group({
            colaboradorId: [null, p ? [] : [Validators.required]],
            competencia: [p?.competencia ?? '', [Validators.required, Validators.maxLength(150)]],
            accion: [p?.accion ?? '', [Validators.required, Validators.maxLength(1000)]],
            fechaCompromiso: [aFechaInput(p?.fechaCompromiso), [Validators.required]],
            estatus: [p?.estatus ?? 'Pendiente', [Validators.required]],
            seguimiento: [p?.seguimiento ?? '']
        });

        if (!p) {
            this._service.colaboradores().subscribe({
                next: (lista) => {
                    this.colaboradores = lista;
                    this.colaboradoresCargados = true;
                },
                error: () => alert('No se pudo cargar la lista de colaboradores')
            });
        }
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.guardando = true;
        const v = this.form.value;
        const dto = {
            colaboradorId: this.data.plan?.colaboradorId ?? v.colaboradorId,
            competencia: v.competencia.trim(),
            accion: v.accion.trim(),
            fechaCompromiso: v.fechaCompromiso,
            seguimiento: v.seguimiento?.trim() || null,
            estatus: v.estatus,
            evaluacionCompetenciaId: this.data.plan?.evaluacionCompetenciaId ?? null,
            razonSocial: this.data.plan?.razonSocial ?? null
        };

        const peticion = this.data.plan
            ? this._service.actualizarPlan(this.data.plan.planId, dto)
            : this._service.crearPlan(dto);

        peticion.subscribe({
            next: (res) => {
                this.guardando = false;
                this._dialogRef.close(res);
            },
            error: (err) => {
                this.guardando = false;
                alert(err?.error?.mensaje || 'No se pudo guardar el plan');
            }
        });
    }
}
