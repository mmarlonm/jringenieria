import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { OffboardingService } from '../offboarding.service';
import { OffboardingDetalle } from '../offboarding.types';
import { etiquetaRecontratable } from '../offboarding.utils';

/** Cierra el caso: exige marcar si el colaborador es recontratable. */
@Component({
    selector: 'app-dialogo-cerrar-baja',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatSelectModule, MatIconModule],
    template: `
        <div class="flex flex-col w-full max-w-md">
            <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">Cerrar el caso {{ data.baja.folio }}</h2>
                <button mat-icon-button mat-dialog-close>
                    <mat-icon svgIcon="heroicons_outline:x-mark"></mat-icon>
                </button>
            </div>

            <form [formGroup]="form" (ngSubmit)="guardar()" class="flex flex-col gap-3 pt-4">
                <div class="text-sm text-gray-600 dark:text-gray-300">
                    Para cerrar, todas las tareas deben estar hechas o marcadas como «no aplica».
                    <span *ngIf="data.baja.fechaRetencionHasta">
                        El expediente se conserva hasta el <span class="font-bold">{{ data.baja.fechaRetencionHasta | date:'dd/MM/yyyy' }}</span>.
                    </span>
                </div>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>¿Es recontratable?</mat-label>
                    <mat-select formControlName="recontratable">
                        <mat-option *ngFor="let r of opciones" [value]="r">{{ etiquetaRecontratable(r) }}</mat-option>
                    </mat-select>
                    <mat-error>Indica si es recontratable</mat-error>
                </mat-form-field>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button mat-button type="button" mat-dialog-close [disabled]="guardando">Cancelar</button>
                    <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || guardando">
                        <mat-icon *ngIf="guardando" svgIcon="heroicons_outline:arrow-path" class="animate-spin mr-2"></mat-icon>
                        <span>Cerrar caso</span>
                    </button>
                </div>
            </form>
        </div>
    `
})
export class DialogoCerrarBajaComponent {
    private readonly _fb = inject(FormBuilder);
    private readonly _dialogRef = inject(MatDialogRef<DialogoCerrarBajaComponent>);
    private readonly _service = inject(OffboardingService);

    guardando = false;
    readonly opciones = ['SI', 'CON_RESERVAS', 'NO'];
    readonly etiquetaRecontratable = etiquetaRecontratable;
    form = this._fb.group({ recontratable: ['', [Validators.required]] });

    constructor(@Inject(MAT_DIALOG_DATA) public data: { baja: OffboardingDetalle }) {}

    guardar(): void {
        if (this.form.invalid) return;
        this.guardando = true;
        this._service.cerrar(this.data.baja.bajaId, this.form.value.recontratable!).subscribe({
            next: (res) => {
                this.guardando = false;
                this._dialogRef.close(res);
            },
            error: (err) => {
                this.guardando = false;
                alert(err?.error?.mensaje || 'No se pudo cerrar el caso');
            }
        });
    }
}
