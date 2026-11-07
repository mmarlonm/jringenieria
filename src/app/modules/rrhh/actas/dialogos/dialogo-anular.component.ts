import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActasService } from '../actas.service';
import { ActaDetalle } from '../actas.types';

@Component({
    selector: 'app-dialogo-anular-acta',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule],
    template: `
        <div class="flex flex-col w-full max-w-md">
            <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">Anular acta {{ data.acta.folio }}</h2>
                <button mat-icon-button mat-dialog-close>
                    <mat-icon svgIcon="heroicons_outline:x-mark"></mat-icon>
                </button>
            </div>

            <form [formGroup]="form" (ngSubmit)="guardar()" class="flex flex-col gap-3 pt-4">
                <div class="p-3 rounded-lg text-sm bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                    Anular deja el acta en el historial sin efecto. No se puede deshacer.
                </div>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Motivo de la anulación</mat-label>
                    <textarea matInput formControlName="motivo" rows="3" maxlength="500"></textarea>
                    <mat-error>El motivo es obligatorio</mat-error>
                </mat-form-field>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button mat-button type="button" mat-dialog-close [disabled]="guardando">Cancelar</button>
                    <button mat-flat-button color="warn" type="submit" [disabled]="form.invalid || guardando">
                        <mat-icon *ngIf="guardando" svgIcon="heroicons_outline:arrow-path" class="animate-spin mr-2"></mat-icon>
                        <span>Anular acta</span>
                    </button>
                </div>
            </form>
        </div>
    `
})
export class DialogoAnularActaComponent {
    private readonly _fb = inject(FormBuilder);
    private readonly _dialogRef = inject(MatDialogRef<DialogoAnularActaComponent>);
    private readonly _service = inject(ActasService);

    guardando = false;
    form = this._fb.group({ motivo: ['', [Validators.required, Validators.maxLength(500)]] });

    constructor(@Inject(MAT_DIALOG_DATA) public data: { acta: ActaDetalle }) {}

    guardar(): void {
        if (this.form.invalid) return;
        this.guardando = true;
        this._service.anular(this.data.acta.actaId, this.form.value.motivo!.trim()).subscribe({
            next: (res) => {
                this.guardando = false;
                this._dialogRef.close(res);
            },
            error: (err) => {
                this.guardando = false;
                alert(err?.error?.mensaje || 'No se pudo anular el acta');
            }
        });
    }
}
