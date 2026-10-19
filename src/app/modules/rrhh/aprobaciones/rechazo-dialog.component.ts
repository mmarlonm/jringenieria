import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/** Pide el motivo del rechazo de una solicitud y lo devuelve al cerrar. No hace peticiones. */
@Component({
    selector: 'rrhh-rechazo-dialog',
    standalone: true,
    imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
    template: `
        <h2 mat-dialog-title>Rechazar solicitud de {{ data.colaborador }}</h2>
        <mat-dialog-content>
            <p class="text-secondary mb-3">Indica el motivo del rechazo. El colaborador podrá consultarlo en el sistema.</p>
            <mat-form-field appearance="outline" class="w-full">
                <mat-label>Motivo</mat-label>
                <textarea matInput rows="3" maxlength="300" [formControl]="motivo" placeholder="Por ejemplo: coincide con entregas prioritarias"></textarea>
            </mat-form-field>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-stroked-button type="button" mat-dialog-close>Cancelar</button>
            <button mat-flat-button color="warn" type="button" [disabled]="motivo.invalid" (click)="rechazar()">Rechazar</button>
        </mat-dialog-actions>
    `
})
export class RechazoDialogComponent {
    readonly data = inject<{ colaborador: string }>(MAT_DIALOG_DATA);
    private readonly _ref = inject<MatDialogRef<RechazoDialogComponent, string>>(MatDialogRef);
    readonly motivo = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] });

    rechazar(): void {
        if (this.motivo.valid) this._ref.close(this.motivo.value.trim());
    }
}
