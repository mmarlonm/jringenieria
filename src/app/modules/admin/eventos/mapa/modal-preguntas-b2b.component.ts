import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'dialog-preguntas-b2b',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatProgressSpinnerModule
  ],
  styles: [`
    .dialog-wrapper {
      padding: 0;
      font-family: 'Inter', sans-serif;
    }
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
    }
    .header-content h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      color: #1e293b;
    }
    .subtitle {
      margin: 4px 0 0 0;
      font-size: 13px;
      color: #64748b;
      font-weight: 500;
    }
    .close-btn {
      color: #64748b;
    }
    .content-area {
      padding: 24px;
    }
    .form-wrapper {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-info-card {
      background: #eef2ff;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 13px;
      color: #3730a3;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .form-info-icon {
      color: #4f46e5;
    }
    .field-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 640px) {
      .field-row {
        grid-template-columns: 1fr;
        gap: 0;
      }
    }
    .full-width {
      width: 100%;
    }
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      border-bottom-left-radius: 12px;
      border-bottom-right-radius: 12px;
    }
  `],
  template: `
    <div class="dialog-wrapper">
      <div class="dialog-header">
        <div class="header-content">
          <h2>Enviar Pregunta B2B</h2>
          <p class="subtitle">Preguntar a {{ data.stand.empresa }} — Stand {{ data.stand.label }}</p>
        </div>
        <button mat-icon-button mat-dialog-close class="close-btn">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="content-area">
        <div class="form-wrapper">
          <div class="form-info-card">
            <mat-icon class="form-info-icon">chat</mat-icon>
            <span>Escribe tus dudas comerciales o técnicas. El representante de la empresa te responderá por correo electrónico.</span>
          </div>

          <form [formGroup]="formPregunta" class="flex flex-col gap-4">
            <div class="field-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Tu Nombre Completo</mat-label>
                <input matInput formControlName="nombre" required>
                <mat-icon matPrefix>person</mat-icon>
                <mat-error *ngIf="formPregunta.get('nombre')?.hasError('required')">Requerido</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Tu Correo Electrónico</mat-label>
                <input matInput type="email" formControlName="email" required>
                <mat-icon matPrefix>email</mat-icon>
                <mat-error *ngIf="formPregunta.get('email')?.hasError('required')">Requerido</mat-error>
                <mat-error *ngIf="formPregunta.get('email')?.hasError('email')">Formato inválido</mat-error>
              </mat-form-field>
            </div>

            <div class="field-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Tu Empresa</mat-label>
                <input matInput formControlName="empresa">
                <mat-icon matPrefix>business</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Tu Teléfono / WhatsApp (Opcional)</mat-label>
                <input matInput formControlName="telefono">
                <mat-icon matPrefix>phone</mat-icon>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Escribe tu duda o pregunta comercial</mat-label>
              <textarea matInput formControlName="pregunta" rows="4" required></textarea>
              <mat-icon matPrefix>question_answer</mat-icon>
              <mat-error *ngIf="formPregunta.get('pregunta')?.hasError('required')">Requerido</mat-error>
            </mat-form-field>
          </form>
        </div>
      </div>

      <div class="dialog-actions">
        <button mat-button mat-dialog-close class="cancel-btn">Cancelar</button>
        <button mat-raised-button color="primary"
                [disabled]="!formPregunta.valid || sending"
                (click)="enviarPregunta()"
                class="save-btn">
          @if (sending) {
            <mat-spinner diameter="20" class="mr-2"></mat-spinner>
            <span>Enviando...</span>
          }
          @if (!sending) {
            <mat-icon>send</mat-icon>
          }
          @if (!sending) {
            <span>Enviar Pregunta</span>
          }
        </button>
      </div>
    </div>
  `
})
export class ModalPreguntasB2B implements OnInit {
  sending = false;
  formPregunta!: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<ModalPreguntasB2B>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.formPregunta = this._fb.group({
      nombre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      empresa: [''],
      telefono: [''],
      pregunta: ['', Validators.required]
    });
  }

  enviarPregunta(): void {
    if (!this.formPregunta.valid) return;

    this.sending = true;
    
    // Simular envío exitoso
    setTimeout(() => {
      this.sending = false;
      this.dialogRef.close({ success: true });
    }, 1500);
  }
}
