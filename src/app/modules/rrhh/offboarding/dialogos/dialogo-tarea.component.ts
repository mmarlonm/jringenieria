import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { OffboardingService } from '../offboarding.service';
import { TareaOffboarding } from '../offboarding.types';
import { aFechaInput, etiquetaTarea } from '../offboarding.utils';

/** Actualiza una tarea del checklist: estatus, evidencia entregada y observaciones. */
@Component({
    selector: 'app-dialogo-tarea-baja',
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
        <div class="flex flex-col w-full max-w-lg">
            <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">Actualizar tarea</h2>
                <button mat-icon-button mat-dialog-close>
                    <mat-icon svgIcon="heroicons_outline:x-mark"></mat-icon>
                </button>
            </div>

            <form [formGroup]="form" (ngSubmit)="guardar()" class="flex flex-col gap-3 pt-4">
                <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                    <div class="font-semibold text-gray-800 dark:text-gray-100">{{ data.tarea.tarea }}</div>
                    <div class="text-xs text-gray-500 mt-1">
                        {{ data.tarea.responsable }} • {{ data.tarea.plazo }} • Evidencia esperada: {{ data.tarea.evidencia }}
                    </div>
                </div>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Estatus</mat-label>
                    <mat-select formControlName="estatus">
                        <mat-option *ngFor="let e of estatuses" [value]="e">{{ etiquetaTarea(e) }}</mat-option>
                    </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Evidencia entregada (folio, acuse, enlace...)</mat-label>
                    <input matInput formControlName="evidenciaCapturada" maxlength="500" />
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Observaciones</mat-label>
                    <textarea matInput formControlName="observaciones" rows="3" maxlength="500"
                              placeholder="Si no aplica, explica el motivo (por ejemplo, el colaborador se negó a firmar)"></textarea>
                    <mat-error>Explica por qué no aplica</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Fecha compromiso</mat-label>
                    <input matInput type="date" formControlName="fechaCompromiso" />
                </mat-form-field>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button mat-button type="button" mat-dialog-close [disabled]="guardando">Cancelar</button>
                    <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || guardando">
                        <mat-icon *ngIf="guardando" svgIcon="heroicons_outline:arrow-path" class="animate-spin mr-2"></mat-icon>
                        <span>Guardar</span>
                    </button>
                </div>
            </form>
        </div>
    `
})
export class DialogoTareaBajaComponent implements OnInit {
    private readonly _fb = inject(FormBuilder);
    private readonly _dialogRef = inject(MatDialogRef<DialogoTareaBajaComponent>);
    private readonly _service = inject(OffboardingService);

    form!: FormGroup;
    guardando = false;
    readonly estatuses = ['Pendiente', 'EnProceso', 'Hecha', 'NoAplica'];
    readonly etiquetaTarea = etiquetaTarea;

    constructor(@Inject(MAT_DIALOG_DATA) public data: { tarea: TareaOffboarding }) {}

    ngOnInit(): void {
        const t = this.data.tarea;
        this.form = this._fb.group({
            estatus: [t.estatus, [Validators.required]],
            evidenciaCapturada: [t.evidenciaCapturada ?? ''],
            observaciones: [t.observaciones ?? ''],
            fechaCompromiso: [aFechaInput(t.fechaCompromiso)]
        });

        this.form.controls['estatus'].valueChanges.subscribe((e) => {
            const obs = this.form.controls['observaciones'];
            obs.setValidators(e === 'NoAplica' ? [Validators.required] : []);
            obs.updateValueAndValidity();
        });
        // si ya venía como "no aplica" la observación sigue siendo obligatoria
        if (t.estatus === 'NoAplica') {
            this.form.controls['observaciones'].setValidators([Validators.required]);
            this.form.controls['observaciones'].updateValueAndValidity();
        }
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.guardando = true;
        const v = this.form.value;
        this._service.actualizarTarea(this.data.tarea.tareaId, {
            estatus: v.estatus,
            evidenciaCapturada: v.evidenciaCapturada?.trim() || null,
            observaciones: v.observaciones?.trim() || null,
            fechaCompromiso: v.fechaCompromiso || null
        }).subscribe({
            next: (res) => {
                this.guardando = false;
                this._dialogRef.close(res);
            },
            error: (err) => {
                this.guardando = false;
                alert(err?.error?.mensaje || 'No se pudo actualizar la tarea');
            }
        });
    }
}
