import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/** Pide el motivo del rechazo de un documento y lo devuelve al cerrar (sin motivo no se rechaza). No hace peticiones. */
@Component({
    selector: 'rrhh-motivo-rechazo-dialog',
    standalone: true,
    imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
    template: `
        <h2 mat-dialog-title>Rechazar «{{ data.documento }}»</h2>
        <mat-dialog-content>
            <p class="text-secondary mb-3">El colaborador verá este motivo y podrá subir el documento de nuevo.</p>
            <mat-form-field appearance="outline" class="w-full">
                <mat-label>Motivo</mat-label>
                <textarea matInput rows="3" maxlength="300" [formControl]="motivo" placeholder="Por ejemplo: la foto sale borrosa"></textarea>
            </mat-form-field>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-stroked-button type="button" mat-dialog-close>Cancelar</button>
            <button mat-flat-button color="warn" type="button" [disabled]="motivo.invalid" (click)="rechazar()">Rechazar</button>
        </mat-dialog-actions>
    `
})
export class MotivoRechazoDialogComponent {
    readonly data = inject<{ documento: string }>(MAT_DIALOG_DATA);
    private readonly _ref = inject<MatDialogRef<MotivoRechazoDialogComponent, string>>(MatDialogRef);
    readonly motivo = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] });

    rechazar(): void {
        if (this.motivo.valid) this._ref.close(this.motivo.value.trim());
    }
}
