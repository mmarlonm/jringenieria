import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { OffboardingService } from '../offboarding.service';
import { OffboardingDetalle } from '../offboarding.types';
import { aFechaInput, hoyIso } from '../offboarding.utils';

/** Registra la baja: el colaborador pasa a INACTIVO con su fecha de baja IMSS. */
@Component({
    selector: 'app-dialogo-registrar-baja',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule],
    template: `
        <div class="flex flex-col w-full max-w-md">
            <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">Registrar la baja</h2>
                <button mat-icon-button mat-dialog-close>
                    <mat-icon svgIcon="heroicons_outline:x-mark"></mat-icon>
                </button>
            </div>

            <form [formGroup]="form" (ngSubmit)="guardar()" class="flex flex-col gap-3 pt-4">
                <div class="text-sm text-gray-600 dark:text-gray-300">
                    <span class="font-bold">{{ data.baja.colaboradorNombre }}</span> pasará a <span class="font-bold">INACTIVO</span>
                    con la fecha de baja IMSS que indiques. La baja no depende de firmas ni de las demás tareas del checklist.
                </div>

                <div *ngIf="data.baja.motivoBloqueoBaja"
                     class="p-3 rounded-lg text-sm bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300">
                    {{ data.baja.motivoBloqueoBaja }}
                </div>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Fecha de baja IMSS</mat-label>
                    <input matInput type="date" formControlName="fechaBajaImss" [min]="minimo" />
                    <mat-hint>Límite sugerido: {{ data.baja.limiteBajaImss | date:'dd/MM/yyyy' }} (5 días hábiles)</mat-hint>
                    <mat-error>La fecha no puede ser anterior al último día laborado</mat-error>
                </mat-form-field>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button mat-button type="button" mat-dialog-close [disabled]="guardando">Cancelar</button>
                    <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || guardando">
                        <mat-icon *ngIf="guardando" svgIcon="heroicons_outline:arrow-path" class="animate-spin mr-2"></mat-icon>
                        <span>Registrar baja</span>
                    </button>
                </div>
            </form>
        </div>
    `
})
export class DialogoRegistrarBajaComponent {
    private readonly _fb = inject(FormBuilder);
    private readonly _dialogRef = inject(MatDialogRef<DialogoRegistrarBajaComponent>);
    private readonly _service = inject(OffboardingService);

    guardando = false;
    minimo: string;
    form;

    constructor(@Inject(MAT_DIALOG_DATA) public data: { baja: OffboardingDetalle }) {
        this.minimo = aFechaInput(data.baja.ultimoDiaLaborado);
        const hoy = hoyIso();
        this.form = this._fb.group({
            fechaBajaImss: [hoy < this.minimo ? this.minimo : hoy, [Validators.required]]
        });
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.guardando = true;
        this._service.registrarBaja(this.data.baja.bajaId, this.form.value.fechaBajaImss!).subscribe({
            next: (res) => {
                this.guardando = false;
                this._dialogRef.close(res);
            },
            error: (err) => {
                this.guardando = false;
                alert(err?.error?.mensaje || 'No se pudo registrar la baja');
            }
        });
    }
}
