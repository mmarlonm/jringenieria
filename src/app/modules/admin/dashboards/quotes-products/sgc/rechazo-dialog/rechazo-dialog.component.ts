import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MOTIVOS_CIERRE_DEFECTO } from '../cierre-dialog/cierre-dialog.component';

export interface RechazoDialogData {
  cotizacionId: number;
  catalogos?: any;
}

export interface RechazoDialogResultado {
  motivo: string;
  comentario?: string | null;
}

@Component({
  selector: 'app-rechazo-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="p-6 max-w-md w-full">
      <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
        <mat-icon class="text-red-500">cancel</mat-icon>
        Rechazar cotización
      </h2>
      <form [formGroup]="form" (ngSubmit)="guardar()" class="flex flex-col gap-4">
        <mat-form-field appearance="fill" class="w-full">
          <mat-label>Motivo del rechazo</mat-label>
          <mat-select formControlName="motivo" data-testid="select-motivo-rechazo">
            <mat-option *ngFor="let m of motivos" [value]="m.codigo">
              {{ m.nombre }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('motivo')?.hasError('required')">
            Elige el motivo del rechazo.
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="fill" class="w-full">
          <mat-label>Comentario / Explicación {{ esOtro ? '(obligatorio)' : '(opcional)' }}</mat-label>
          <textarea matInput formControlName="comentario" rows="3" data-testid="input-comentario-rechazo"
                    placeholder="Describe las razones dadas por el cliente..."></textarea>
          <mat-error *ngIf="form.get('comentario')?.hasError('required')">
            El comentario es obligatorio cuando el motivo es «Otro».
          </mat-error>
          <mat-error *ngIf="form.get('comentario')?.hasError('minlength')">
            Debe tener al menos 10 caracteres.
          </mat-error>
        </mat-form-field>

        <div class="flex justify-end gap-2 mt-2">
          <button mat-stroked-button type="button" (click)="cancelar()" data-testid="btn-cancelar-rechazo">
            Cancelar
          </button>
          <button mat-flat-button color="warn" type="submit" [disabled]="form.invalid" data-testid="btn-confirmar-rechazo">
            Rechazar cotización
          </button>
        </div>
      </form>
    </div>
  `
})
export class RechazoDialogComponent implements OnInit {
  form: FormGroup;
  motivos = MOTIVOS_CIERRE_DEFECTO;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RechazoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RechazoDialogData
  ) {
    if (data?.catalogos?.motivosCierre?.length) {
      this.motivos = data.catalogos.motivosCierre;
    }
    this.form = this.fb.group({
      motivo: ['', Validators.required],
      comentario: ['', [Validators.maxLength(1000)]]
    });
  }

  ngOnInit(): void {
    this.form.get('motivo')?.valueChanges.subscribe(val => {
      const cControl = this.form.get('comentario');
      if (val === 'Otro') {
        cControl?.setValidators([Validators.required, Validators.minLength(10), Validators.maxLength(1000)]);
      } else {
        cControl?.setValidators([Validators.maxLength(1000)]);
      }
      cControl?.updateValueAndValidity();
    });
  }

  get esOtro(): boolean {
    return this.form.get('motivo')?.value === 'Otro';
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.dialogRef.close({
      motivo: this.form.value.motivo,
      comentario: this.form.value.comentario?.trim() || null
    });
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}
