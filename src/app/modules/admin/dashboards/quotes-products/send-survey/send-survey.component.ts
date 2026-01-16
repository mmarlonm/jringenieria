import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

/* Angular Material */
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';

export interface SendSurveyDialogData {
  nombre: string;
  telefono: string;
  email: string;
  cargo: string;
  sucursal: number;
}

@Component({
  selector: 'app-send-survey',
  standalone: true,
  templateUrl: './send-survey.component.html',
  imports: [
    CommonModule,
    ReactiveFormsModule,

    /* Material */
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatRadioModule
  ]
})
export class SendSurveyComponent implements OnInit {

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SendSurveyComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SendSurveyDialogData
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre: [this.data?.nombre ?? '', Validators.required],
      telefono: [this.data?.telefono ?? '', Validators.required],
      email: [
        this.data?.email ?? '',
        [Validators.required, Validators.email]
      ],
      cargo: [this.data?.cargo ?? '', Validators.required],
      sucursal: [this.data?.sucursal ?? null, Validators.required]
    });
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Devuelve la info confirmada
    this.dialogRef.close(this.form.value);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
