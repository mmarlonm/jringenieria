import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
      resumen: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  get resumenLength(): number {
    return this.form.get('resumen')?.value?.length || 0;
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
    this.errorMensaje = null;
    this.errores = [];

    const dto: NuevaVersionDto = {
      clase: this.form.value.clase,
      resumen: this.form.value.resumen.trim(),
    };

    this.quotesService.nuevaVersion(this.data.cotizacionId, dto).subscribe({
      next: (res) => {
        this.guardando = false;
        this.dialogRef.close({ guardado: true, data: res });
      },
      error: (err) => {
        this.guardando = false;
        this.errorMensaje = err?.error?.mensaje || 'Error al generar nueva versión.';
        this.errores = err?.error?.errores || [];
      },
    });
  }
}
