import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MaterialEntregaDto } from '../../models/control-entregas.types';

@Component({
    selector: 'entrega-form-dialog',
    templateUrl: './entrega-form-dialog.component.html',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule
    ]
})
export class EntregaFormDialogComponent implements OnInit {
    form: UntypedFormGroup;

    constructor(
        public dialogRef: MatDialogRef<EntregaFormDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { material: MaterialEntregaDto },
        private _formBuilder: UntypedFormBuilder
    ) {
        this.form = this._formBuilder.group({
            cantidadAEntregar: [null, [Validators.required, Validators.min(0.0001), Validators.max(data.material.surtidoPendiente)]],
            guia: [''], // 👈 Nuevo
            observaciones: ['']
        });
    }

    ngOnInit(): void {
    }

    save(): void {
        if (this.form.invalid) {
            return;
        }

        this.dialogRef.close(this.form.value);
    }

    close(): void {
        this.dialogRef.close();
    }
}
