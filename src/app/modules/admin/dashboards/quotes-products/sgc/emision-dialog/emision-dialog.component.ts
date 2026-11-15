import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { QuotesService } from '../../quotes-products.service';
import { CatalogosSgc, EmitirCotizacionDto } from '../../quotes-products.types';

export interface EmisionDialogData {
  cotizacionId: number;
  clienteReceptorPorDefecto?: string;
  correoPorDefecto?: string;
  catalogos: CatalogosSgc | null;
}

@Component({
  selector: 'app-emision-dialog',
  templateUrl: './emision-dialog.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
})
export class EmisionDialogComponent implements OnInit {
  form: FormGroup;
  guardando: boolean = false;
  errorMensaje: string | null = null;
  errores: string[] = [];

  mediosEnvio: string[] = ['Correo', 'WhatsApp', 'En mano', 'Portal'];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EmisionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EmisionDialogData,
    private quotesService: QuotesService
  ) {
    if (this.data?.catalogos?.mediosEnvio && this.data.catalogos.mediosEnvio.length > 0) {
      this.mediosEnvio = this.data.catalogos.mediosEnvio.map((m: any) =>
        typeof m === 'string' ? m : m.nombre || m.codigo
      );
    }

    const medioInicial = this.mediosEnvio.includes('Correo') ? 'Correo' : this.mediosEnvio[0] || 'Correo';

    this.form = this.fb.group({
      medioEnvio: [medioInicial, Validators.required],
      clienteReceptor: [this.data?.clienteReceptorPorDefecto || '', Validators.required],
      correoReceptor: [this.data?.correoPorDefecto || ''],
    });
  }

  ngOnInit(): void {
    this.actualizarValidacionCorreo(this.form.get('medioEnvio')?.value);
    this.form.get('medioEnvio')?.valueChanges.subscribe((medio) => {
      this.actualizarValidacionCorreo(medio);
    });
  }

  actualizarValidacionCorreo(medio: string): void {
    const correoControl = this.form.get('correoReceptor');
    if (medio === 'Correo') {
      correoControl?.setValidators([Validators.required, Validators.email]);
    } else {
      correoControl?.clearValidators();
    }
    correoControl?.updateValueAndValidity();
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }

  emitir(): void {
    if (this.form.invalid || this.guardando) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando = true;
    this.errorMensaje = null;
    this.errores = [];

    const dto: EmitirCotizacionDto = {
      medioEnvio: this.form.value.medioEnvio,
      clienteReceptor: this.form.value.clienteReceptor,
      correoReceptor: this.form.value.medioEnvio === 'Correo' ? this.form.value.correoReceptor : null,
    };

    this.quotesService.emitir(this.data.cotizacionId, dto).subscribe({
      next: (res) => {
        this.guardando = false;
        this.dialogRef.close({ guardado: true, data: res });
      },
      error: (err) => {
        this.guardando = false;
        this.errorMensaje = err?.error?.mensaje || 'Error al registrar la emisión de la cotización.';
        this.errores = err?.error?.errores || [];
      },
    });
  }
}
