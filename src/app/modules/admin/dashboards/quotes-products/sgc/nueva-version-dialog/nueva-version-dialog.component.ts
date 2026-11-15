import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { QuotesService } from '../../quotes-products.service';
import { NuevaVersionDto } from '../../quotes-products.types';

export interface NuevaVersionDialogData {
  cotizacionId: number;
}

export const RESUMEN_MIN = 10;
export const RESUMEN_MAX = 1000;

// El API recorta el texto antes de validarlo: aquí también (diez espacios no son un resumen)
export function resumenCambioValido(control: AbstractControl): ValidationErrors | null {
  const largo = (control.value || '').trim().length;
  if (largo === 0) return { required: true };
  if (largo < RESUMEN_MIN) return { minlength: true };
  if (largo > RESUMEN_MAX) return { maxlength: true };
  return null;
}

@Component({
  selector: 'app-nueva-version-dialog',
  templateUrl: './nueva-version-dialog.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatButtonModule,
    MatIconModule,
  ],
})
export class NuevaVersionDialogComponent {
  form: FormGroup;
  guardando: boolean = false;
  errorMensaje: string | null = null;
  errores: string[] = [];

  // Según la regla 3 de Claude: solo Menor y Alcance (nunca Inicial)
  clasesDisponibles = [
    {
      valor: 'Menor',
      etiqueta: 'Menor',
      descripcion: 'Solo cambia precio, cantidad, descuento o vigencia.',
    },
    {
      valor: 'Alcance',
      etiqueta: 'Alcance',
      descripcion: 'Cambia partidas, descripciones, exclusiones o alcance técnico.',
    },
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<NuevaVersionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: NuevaVersionDialogData,
    private quotesService: QuotesService
  ) {
    this.form = this.fb.group({
      clase: ['Menor', Validators.required],
      resumen: ['', [resumenCambioValido]],
    });
  }

  get resumenLength(): number {
    return (this.form.get('resumen')?.value || '').trim().length;
  }

  get puedeCrear(): boolean {
    return this.form.valid && !this.guardando;
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }

  crearVersion(): void {
    if (this.form.invalid || this.guardando) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando = true;
    this.dialogRef.disableClose = true;
    this.errorMensaje = null;
    this.errores = [];

    const dto: NuevaVersionDto = {
      claseCambio: this.form.value.clase,
      cambioResumen: this.form.value.resumen.trim(),
    };

    this.quotesService.nuevaVersion(this.data.cotizacionId, dto).subscribe({
      next: (res) => {
        this.guardando = false;
        this.dialogRef.close({ guardado: true, data: res });
      },
      error: (err) => {
        this.guardando = false;
        this.dialogRef.disableClose = false;
        this.errorMensaje = err?.error?.mensaje || 'Error al generar nueva versión.';
        this.errores = err?.error?.errores || [];
      },
    });
  }
}
