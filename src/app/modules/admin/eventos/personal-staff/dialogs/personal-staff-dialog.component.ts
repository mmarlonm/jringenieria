import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PersonalStaffService } from '../personal-staff.service';

@Component({
    selector: 'app-personal-staff-dialog',
    templateUrl: './personal-staff-dialog.component.html',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule
    ]
})
export class PersonalStaffDialogComponent implements OnInit {
    form: FormGroup;
    isEdit: boolean = false;
    selectedFile: File | null = null;
    imagePreview: string | ArrayBuffer | null = null;
    isSaving: boolean = false;
    personalId: number = 0;

    tiposPersonal = ['Expositor', 'Staff', 'Organizador', 'Soporte', 'Otro'];

    constructor(
        private _fb: FormBuilder,
        private _dialogRef: MatDialogRef<PersonalStaffDialogComponent>,
        private _personalStaffService: PersonalStaffService,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) { }

    ngOnInit(): void {
        this.isEdit = !!this.data?.personal;
        this.personalId = this.data?.personal?.id || 0;

        this.form = this._fb.group({
            id: [this.personalId],
            nombreCompleto: [this.data?.personal?.nombreCompleto || '', [Validators.required]],
            empresa: [this.data?.personal?.empresa || '', [Validators.required]],
            cargo: [this.data?.personal?.cargo || '', [Validators.required]],
            correoElectronico: [this.data?.personal?.correoElectronico || '', [Validators.required, Validators.email]],
            telefonoOficina: [this.data?.personal?.telefonoOficina || ''],
            telefonoWhatsapp: [this.data?.personal?.telefonoWhatsapp || ''],
            linkWeb: [this.data?.personal?.linkWeb || ''],
            tipoPersonal: [this.data?.personal?.tipoPersonal || 'Expositor', [Validators.required]]
        });

        if (this.isEdit && this.data.personal.fotoPath) {
            this.imagePreview = this._personalStaffService.getPhotoUrl(this.personalId);
        }
    }

    onFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            this.selectedFile = file;
            const reader = new FileReader();
            reader.onload = () => {
                this.imagePreview = reader.result;
            };
            reader.readAsDataURL(file);
        }
    }

    save(): void {
        if (this.form.invalid) return;

        this.isSaving = true;
        const payload = this.form.value;

        this._personalStaffService.save(payload, this.selectedFile || undefined).subscribe({
            next: (res) => {
                this.isSaving = false;
                this._dialogRef.close(res);
            },
            error: (err) => {
                this.isSaving = false;
                console.error(err);
            }
        });
    }

    close(): void {
        this._dialogRef.close(null);
    }
}
