import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { ActasService } from '../actas.service';
import { ActaDetalle } from '../actas.types';
import { ETIQUETAS_FIRMA } from '../actas.utils';

@Component({
    selector: 'app-dialogo-firma',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatSelectModule, MatIconModule],
    template: `
        <div class="flex flex-col w-full max-w-md">
            <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">Firma del colaborador</h2>
                <button mat-icon-button mat-dialog-close>
                    <mat-icon svgIcon="heroicons_outline:x-mark"></mat-icon>
                </button>
            </div>

            <form [formGroup]="form" (ngSubmit)="guardar()" class="flex flex-col gap-3 pt-4">
                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Resultado</mat-label>
                    <mat-select formControlName="resultado">
                        <mat-option *ngFor="let r of resultados" [value]="r">{{ etiqueta(r) }}</mat-option>
                    </mat-select>
                    <mat-error>Selecciona el resultado</mat-error>
                </mat-form-field>

                <div *ngIf="form.value.resultado === 'SeNego'"
                     class="p-3 rounded-lg text-sm bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300">
                    Si se niega a firmar, el acta debe llevar la constancia con los dos testigos
                    ({{ data.acta.testigo1 || 'testigo 1 sin capturar' }} y {{ data.acta.testigo2 || 'testigo 2 sin capturar' }}).
                    La sanción no se condiciona a su firma.
                </div>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button mat-button type="button" mat-dialog-close [disabled]="guardando">Cancelar</button>
                    <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || guardando">
                        <mat-icon *ngIf="guardando" svgIcon="heroicons_outline:arrow-path" class="animate-spin mr-2"></mat-icon>
                        <span>Registrar firma</span>
                    </button>
                </div>
            </form>
        </div>
    `
})
export class DialogoFirmaComponent {
    private readonly _fb = inject(FormBuilder);
    private readonly _dialogRef = inject(MatDialogRef<DialogoFirmaComponent>);
    private readonly _service = inject(ActasService);

    guardando = false;
    resultados = ['Firmo', 'SeNego', 'NoComparecio'];
    form = this._fb.group({ resultado: ['', [Validators.required]] });

    constructor(@Inject(MAT_DIALOG_DATA) public data: { acta: ActaDetalle }) {}

    etiqueta(r: string): string {
        return ETIQUETAS_FIRMA[r] ?? r;
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.guardando = true;
        this._service.registrarFirma(this.data.acta.actaId, this.form.value.resultado!).subscribe({
            next: (res) => {
                this.guardando = false;
                this._dialogRef.close(res);
            },
            error: (err) => {
                this.guardando = false;
                alert(err?.error?.mensaje || 'No se pudo registrar la firma');
            }
        });
    }
}
