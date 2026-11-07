import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActasService } from '../actas.service';
import { ActaDetalle } from '../actas.types';
import { ETIQUETAS_SANCION } from '../actas.utils';

/** Sanción: no hay multas (Art. 107) y la suspensión es de 1 a 8 días (Art. 423 fr. X). */
@Component({
    selector: 'app-dialogo-sancion',
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
        <div class="flex flex-col w-full max-w-xl">
            <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">Aplicar sanción</h2>
                <button mat-icon-button mat-dialog-close>
                    <mat-icon svgIcon="heroicons_outline:x-mark"></mat-icon>
                </button>
            </div>

            <form [formGroup]="form" (ngSubmit)="guardar()" class="flex flex-col gap-3 pt-4">
                <div *ngIf="data.acta.alertaNivel === 'Cerrar' || data.acta.alertaNivel === 'PlazoVencido'"
                     class="p-3 rounded-lg text-sm bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300">
                    Han pasado {{ data.acta.diasTranscurridos }} días desde que se conocieron los hechos. El plazo máximo es de 30 (Art. 517 LFT).
                </div>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Sanción</mat-label>
                    <mat-select formControlName="sancion">
                        <mat-option *ngFor="let s of sanciones" [value]="s">{{ etiqueta(s) }}</mat-option>
                    </mat-select>
                    <mat-error>Selecciona la sanción</mat-error>
                </mat-form-field>

                <mat-form-field *ngIf="form.value.sancion === 'Suspension'" appearance="outline" class="w-full">
                    <mat-label>Días de suspensión (1 a 8)</mat-label>
                    <input matInput type="number" min="1" max="8" formControlName="diasSuspension" />
                    <mat-error>La suspensión es de 1 a 8 días</mat-error>
                </mat-form-field>

                <mat-form-field *ngIf="form.value.sancion && form.value.sancion !== 'SinSancion'" appearance="outline" class="w-full">
                    <mat-label>Fundamento (RIT / LFT)</mat-label>
                    <textarea matInput formControlName="fundamento" rows="3" maxlength="500"
                              placeholder="Ej. RIT art. 18; LFT art. 47 fr. X"></textarea>
                    <mat-error>El fundamento es obligatorio al sancionar</mat-error>
                </mat-form-field>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button mat-button type="button" mat-dialog-close [disabled]="guardando">Cancelar</button>
                    <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || guardando">
                        <mat-icon *ngIf="guardando" svgIcon="heroicons_outline:arrow-path" class="animate-spin mr-2"></mat-icon>
                        <span>Aplicar</span>
                    </button>
                </div>
            </form>
        </div>
    `
})
export class DialogoSancionComponent {
    private readonly _fb = inject(FormBuilder);
    private readonly _dialogRef = inject(MatDialogRef<DialogoSancionComponent>);
    private readonly _service = inject(ActasService);

    guardando = false;
    sanciones = ['SinSancion', 'AmonestacionVerbal', 'AmonestacionEscrita', 'Suspension', 'Rescision'];
    form = this._fb.group({
        sancion: ['', [Validators.required]],
        diasSuspension: [null as number | null],
        fundamento: ['']
    });

    constructor(@Inject(MAT_DIALOG_DATA) public data: { acta: ActaDetalle }) {
        this.form.controls.sancion.valueChanges.subscribe((s) => {
            const dias = this.form.controls.diasSuspension;
            const fundamento = this.form.controls.fundamento;
            dias.setValidators(s === 'Suspension' ? [Validators.required, Validators.min(1), Validators.max(8)] : []);
            if (s !== 'Suspension') dias.setValue(null);
            fundamento.setValidators(s && s !== 'SinSancion' ? [Validators.required, Validators.maxLength(500)] : []);
            dias.updateValueAndValidity();
            fundamento.updateValueAndValidity();
        });
    }

    etiqueta(s: string): string {
        return ETIQUETAS_SANCION[s] ?? s;
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.guardando = true;
        const v = this.form.value;
        this._service.aplicarSancion(this.data.acta.actaId, {
            sancion: v.sancion!,
            diasSuspension: v.sancion === 'Suspension' ? v.diasSuspension : null,
            fundamento: v.fundamento?.trim() || null
        }).subscribe({
            next: (res) => {
                this.guardando = false;
                this._dialogRef.close(res);
            },
            error: (err) => {
                this.guardando = false;
                alert(err?.error?.mensaje || 'No se pudo aplicar la sanción');
            }
        });
    }
}
