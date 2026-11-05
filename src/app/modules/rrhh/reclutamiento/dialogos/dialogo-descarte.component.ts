import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ReclutamientoService } from '../reclutamiento.service';

@Component({
    selector: 'app-dialogo-descarte',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule
    ],
    template: `
        <div class="flex flex-col max-w-md w-full">
            <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-xl font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                    <mat-icon svgIcon="heroicons_outline:user-minus"></mat-icon>
                    Descartar Candidato
                </h2>
                <button mat-icon-button mat-dialog-close>
                    <mat-icon svgIcon="heroicons_outline:x-mark"></mat-icon>
                </button>
            </div>

            <div class="pt-4 flex flex-col gap-4">
                <p class="text-sm text-gray-600 dark:text-gray-300">
                    Estás a punto de descartar a <strong>{{ data.nombre }}</strong>. Indica obligatoriamente el motivo de descarte:
                </p>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Motivo de Descarte</mat-label>
                    <textarea matInput [(ngModel)]="motivo" rows="3" placeholder="Ej. No cumple con la experiencia requerida en Angular..."></textarea>
                </mat-form-field>
            </div>

            <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button mat-button type="button" mat-dialog-close>Cancelar</button>
                <button mat-flat-button color="warn" (click)="confirmar()" [disabled]="!motivo.trim() || guardando">
                    {{ guardando ? 'Descartando...' : 'Confirmar Descarte' }}
                </button>
            </div>
        </div>
    `
})
export class DialogoDescarteComponent {
    private readonly _dialogRef = inject(MatDialogRef<DialogoDescarteComponent>);
    private readonly _service = inject(ReclutamientoService);

    motivo = '';
    guardando = false;

    constructor(@Inject(MAT_DIALOG_DATA) public data: { candidatoId: number; nombre: string }) {}

    confirmar(): void {
        if (!this.motivo.trim()) return;
        this.guardando = true;

        this._service.cambiarEstatusCandidato(this.data.candidatoId, 'Descartado', this.motivo.trim()).subscribe({
            next: (res) => {
                this.guardando = false;
                this._dialogRef.close(res);
            },
            error: (err) => {
                this.guardando = false;
                alert(err?.error?.mensaje || 'Error al descartar al candidato');
            }
        });
    }
}

