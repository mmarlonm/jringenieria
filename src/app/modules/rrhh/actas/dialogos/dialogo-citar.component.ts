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

/** Fecha de hoy en formato yyyy-MM-dd según el reloj local del navegador. */
export function hoyIso(): string {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
}

@Component({
    selector: 'app-dialogo-citar',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule],
    template: `
        <div class="flex flex-col w-full max-w-md">
            <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">Citar al colaborador</h2>
                <button mat-icon-button mat-dialog-close>
                    <mat-icon svgIcon="heroicons_outline:x-mark"></mat-icon>
                </button>
            </div>

            <form [formGroup]="form" (ngSubmit)="guardar()" class="flex flex-col gap-3 pt-4">
                <div class="text-sm text-gray-600 dark:text-gray-300">
                    Se emite el citatorio a <span class="font-bold">{{ data.acta.colaboradorNombre }}</span> para que
                    exponga sus descargos antes de cualquier sanción.
                </div>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Fecha del citatorio</mat-label>
                    <input matInput type="date" formControlName="fechaCitatorio" [max]="hoy" />
                    <mat-error>La fecha del citatorio es obligatoria</mat-error>
                </mat-form-field>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button mat-button type="button" mat-dialog-close [disabled]="guardando">Cancelar</button>
                    <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || guardando">
                        <mat-icon *ngIf="guardando" svgIcon="heroicons_outline:arrow-path" class="animate-spin mr-2"></mat-icon>
                        <span>Registrar citatorio</span>
                    </button>
                </div>
            </form>
        </div>
    `
})
export class DialogoCitarComponent {
    private readonly _fb = inject(FormBuilder);
    private readonly _dialogRef = inject(MatDialogRef<DialogoCitarComponent>);
    private readonly _service = inject(ActasService);

    guardando = false;
    hoy = hoyIso();
    form = this._fb.group({ fechaCitatorio: [hoyIso(), [Validators.required]] });

    constructor(@Inject(MAT_DIALOG_DATA) public data: { acta: ActaDetalle }) {}

    guardar(): void {
        if (this.form.invalid) return;
        this.guardando = true;
        this._service.citar(this.data.acta.actaId, this.form.value.fechaCitatorio!).subscribe({
            next: (res) => {
                this.guardando = false;
                this._dialogRef.close(res);
            },
            error: (err) => {
                this.guardando = false;
                alert(err?.error?.mensaje || 'No se pudo registrar el citatorio');
            }
        });
    }
}
