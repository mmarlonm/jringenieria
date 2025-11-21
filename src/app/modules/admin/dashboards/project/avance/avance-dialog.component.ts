import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-avance-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './avance-dialog.component.html'
})
export class AvanceDialogComponent {

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AvanceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form = this.fb.group({
      descripcion: [data?.descripcion || '', Validators.required],
      valor: [
        data?.valor || '',
        [
          Validators.required,
          Validators.min(0),
          Validators.max(100),
          Validators.pattern(/^[0-9]+$/) // solo números enteros
        ]
      ]
    });
  }

  guardar() {
    if (!this.form.valid) return;
    this.dialogRef.close({
      ...this.data,
      ...this.form.value
    });
  }
}
