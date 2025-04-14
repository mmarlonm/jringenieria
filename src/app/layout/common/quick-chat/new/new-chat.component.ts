import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatOptionModule } from '@angular/material/core';

@Component({
    selector: 'app-new-chat',
    standalone: true,
    templateUrl: './new-chat.component.html',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatSelectModule,
        MatInputModule,
        MatButtonModule,
        MatDialogModule,
        MatOptionModule
    ]
})
export class NewChatComponent {
    form: FormGroup;

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<NewChatComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { usrs: any[] }
    ) {
        this.form = this.fb.group({
            destinatarioId: [null, Validators.required],
            contenido: ['', Validators.required],
        });
    }

    enviar(): void {
        if (this.form.valid) {
            this.dialogRef.close(this.form.value);
        }
    }

    cerrar(): void {
        this.dialogRef.close();
    }
}