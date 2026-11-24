import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { QuotesService } from '../quotes-products.service';
import { folioCotizacionValidator } from 'app/modules/admin/crm/requerimientos/requerimiento-convertir-cotizacion-dialog/requerimiento-convertir-cotizacion-dialog.component';

@Component({
  selector: 'app-folio-cotizacion',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './folio-cotizacion.component.html'
})
export class FolioCotizacionComponent {
  @Input() cotizacionProductosId!: number;
  @Input() folio?: string | null;
  @Input() puedeAgregar: boolean = false;
  @Output() folioAgregado = new EventEmitter<string>();

  editando = false;
  guardando = false;
  errorApi: string | null = null;

  readonly folioControl = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(50), folioCotizacionValidator()]
  });

  constructor(private quotesService: QuotesService) {}

  abrirEdicion(): void {
    this.editando = true;
    this.errorApi = null;
    this.folioControl.setValue('');
    this.folioControl.markAsUntouched();
  }

  cancelar(): void {
    this.editando = false;
    this.errorApi = null;
    this.folioControl.setValue('');
  }

  guardar(): void {
    if (this.guardando || this.folioControl.invalid) {
      return;
    }

    const valor = this.folioControl.value.trim();
    this.guardando = true;
    this.errorApi = null;

    this.quotesService.agregarFolio(this.cotizacionProductosId, valor).subscribe({
      next: (res) => {
        const nuevoFolio = res?.folioCotizacion || valor;
        this.folio = nuevoFolio;
        this.puedeAgregar = false;
        this.editando = false;
        this.guardando = false;
        this.folioAgregado.emit(nuevoFolio);
      },
      error: (err) => {
        this.guardando = false;
        this.errorApi = err?.error?.mensaje || 'Error al guardar el folio.';
      }
    });
  }
}
