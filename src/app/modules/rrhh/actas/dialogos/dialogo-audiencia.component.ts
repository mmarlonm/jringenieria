import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActasService } from '../actas.service';
import { ActaDetalle } from '../actas.types';

/** Audiencia con el colaborador: sus descargos, o constancia de que no compareció cuando ya venció el plazo del citatorio. */
@Component({
    selector: 'app-dialogo-audiencia',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatCheckboxModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule
    ],
    template: `
        <div class="flex flex-col w-full max-w-xl">
            <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">Audiencia y descargos</h2>
                <button mat-icon-button mat-dialog-close>
                    <mat-icon svgIcon="heroicons_outline:x-mark"></mat-icon>
                </button>
            </div>

            <form [formGroup]="form" (ngSubmit)="guardar()" class="flex flex-col gap-3 pt-4">
                <div class="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
                    No se sanciona sin oír al trabajador (Art. 423 fr. X). Citatorio del
                    <span class="font-bold">{{ data.acta.fechaCitatorio | date:'dd/MM/yyyy' }}</span>.
                </div>

                <mat-checkbox formControlName="noComparecio" color="primary">
                    El colaborador no compareció (ya venció el plazo del citatorio)
                </mat-checkbox>

                <mat-form-field *ngIf="!form.value.noComparecio" appearance="outline" class="w-full">
                    <mat-label>Descargos del colaborador</mat-label>
                    <textarea matInput formControlName="descargos" rows="6" maxlength="4000"
                              placeholder="Lo que el colaborador manifestó en la audiencia..."></textarea>
                    <mat-error>Los descargos son obligatorios</mat-error>
                </mat-form-field>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button mat-button type="button" mat-dialog-close [disabled]="guardando">Cancelar</button>
                    <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || guardando">
                        <mat-icon *ngIf="guardando" svgIcon="heroicons_outline:arrow-path" class="animate-spin mr-2"></mat-icon>
                        <span>Registrar audiencia</span>
                    </button>
                </div>
            </form>
        </div>
    `
})
export class DialogoAudienciaComponent {
    private readonly _fb = inject(FormBuilder);
    private readonly _dialogRef = inject(MatDialogRef<DialogoAudienciaComponent>);
    private readonly _service = inject(ActasService);

    guardando = false;
    form = this._fb.group({
        noComparecio: [false],
        descargos: ['', [Validators.required, Validators.maxLength(4000)]]
    });

    constructor(@Inject(MAT_DIALOG_DATA) public data: { acta: ActaDetalle }) {
        this.form.controls.noComparecio.valueChanges.subscribe((no) => {
            const c = this.form.controls.descargos;
            if (no) c.clearValidators();
            else c.setValidators([Validators.required, Validators.maxLength(4000)]);
            c.updateValueAndValidity();
        });
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.guardando = true;
        const v = this.form.value;
        const descargos = v.noComparecio ? null : (v.descargos ?? '').trim();
        this._service.registrarAudiencia(this.data.acta.actaId, !!v.noComparecio, descargos).subscribe({
            next: (res) => {
                this.guardando = false;
                this._dialogRef.close(res);
            },
            error: (err) => {
                this.guardando = false;
                alert(err?.error?.mensaje || 'No se pudo registrar la audiencia');
            }
        });
    }
}
