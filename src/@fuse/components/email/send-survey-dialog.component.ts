import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// Angular Material módulos que uses
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';

@Component({
  selector: 'app-send-survey-dialog',
  templateUrl: './send-survey-dialog.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ]
})
export class SendSurveyDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SendSurveyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { proyectoId: number }
  ) {
    this.form = this.fb.group({
      emails: this.fb.array([this.createEmailFormControl()])
    });
  }

  get emails(): FormArray {
    return this.form.get('emails') as FormArray;
  }

createEmailFormControl(): FormControl {
  return this.fb.control('', [Validators.required, Validators.email]);
}


  addEmail(): void {
    this.emails.push(this.createEmailFormControl());
  }

  removeEmail(index: number): void {
    if (this.emails.length > 1) {
      this.emails.removeAt(index);
    }
  }

  submit(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value.emails);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
