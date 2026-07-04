import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { Solicitante } from '../../engineering.service';

@Component({
    selector: 'app-solicitante-dialog',
    templateUrl: './solicitante-dialog.component.html',
    styleUrls: ['./solicitante-dialog.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule
    ]
})
export class SolicitanteDialogComponent implements OnInit {
    form: FormGroup;
    isEdit: boolean = false;

    constructor(
        private _fb: FormBuilder,
        private _dialogRef: MatDialogRef<SolicitanteDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { solicitante?: Solicitante }
    ) { }

    ngOnInit(): void {
        this.isEdit = !!this.data?.solicitante;

        this.form = this._fb.group({
            idSolicitante: [this.data?.solicitante?.idSolicitante || 0],
            nombreCompleto: [this.data?.solicitante?.nombreCompleto || '', [Validators.required, Validators.maxLength(150)]],
            celular: [this.data?.solicitante?.celular || '', [Validators.maxLength(20)]],
            empresa: [this.data?.solicitante?.empresa || '', [Validators.required, Validators.maxLength(150)]],
            area: [this.data?.solicitante?.area || '', [Validators.maxLength(100)]],
            activo: [this.data?.solicitante?.activo !== false]
        });
    }

    onSave(): void {
        if (this.form.invalid) {
            return;
        }
        this._dialogRef.close(this.form.value);
    }

    onCancel(): void {
        this._dialogRef.close();
    }
}
