import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { EngineeringService, MaterialObservacion, SeguimientoMaterial } from '../../../../engineering.service';

export interface MaterialObservacionesDialogData {
  material: SeguimientoMaterial;
}

export function formatearFechaMexico(fechaIso: string): string {
  if (!fechaIso) return '';
  try {
    const d = new Date(fechaIso);
    if (isNaN(d.getTime())) return fechaIso;
    const pad = (n: number) => n.toString().padStart(2, '0');
    const partes = new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(d);

    const dia = partes.find(p => p.type === 'day')?.value || pad(d.getDate());
    const mes = partes.find(p => p.type === 'month')?.value || pad(d.getMonth() + 1);
    const anio = partes.find(p => p.type === 'year')?.value || d.getFullYear().toString();
    const hora = partes.find(p => p.type === 'hour')?.value || pad(d.getHours());
    const min = partes.find(p => p.type === 'minute')?.value || pad(d.getMinutes());

    return `${dia}/${mes}/${anio} ${hora}:${min}`;
  } catch {
    return fechaIso;
  }
}

@Component({
  selector: 'app-material-observaciones-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule
  ],
  templateUrl: './material-observaciones-dialog.component.html'
})
export class MaterialObservacionesDialogComponent implements OnInit {
  observaciones: MaterialObservacion[] = [];
  cargando = true;
  guardando = false;
  errorCarga: string | null = null;
  errorMensaje: string | null = null;

  readonly nuevoTextoControl = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(1000)]
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: MaterialObservacionesDialogData,
    private dialogRef: MatDialogRef<MaterialObservacionesDialogComponent>,
    private engineering: EngineeringService
  ) {}

  ngOnInit(): void {
    this.cargarObservaciones();
  }

  cargarObservaciones(): void {
    this.cargando = true;
    this.errorCarga = null;
    this.engineering.observacionesMaterial(this.data.material.idMaterial).subscribe({
      next: (lista) => {
        this.observaciones = lista || [];
        this.cargando = false;
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        this.errorCarga = err?.error?.mensaje || 'No se pudo cargar el historial de observaciones.';
      }
    });
  }

  formatearFecha(f: string): string {
    return formatearFechaMexico(f);
  }

  get cuenta(): number {
    return this.nuevoTextoControl.value.length;
  }

  get puedeGuardar(): boolean {
    const texto = this.nuevoTextoControl.value.trim();
    return !this.guardando && texto.length >= 1 && texto.length <= 1000;
  }

  agregar(): void {
    if (!this.puedeGuardar) return;
    const texto = this.nuevoTextoControl.value.trim();
    this.guardando = true;
    this.errorMensaje = null;

    this.engineering.agregarObservacionMaterial(this.data.material.idMaterial, texto).subscribe({
      next: (nuevaObs) => {
        this.guardando = false;
        this.observaciones.unshift(nuevaObs);
        this.nuevoTextoControl.setValue('');
        // Actualizar la referencia del material para que la tabla se actualice
        this.data.material.notas = nuevaObs.texto;
        this.data.material.observacionesCount = (this.data.material.observacionesCount || 0) + 1;
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        this.errorMensaje = err?.error?.mensaje || 'No se pudo registrar la observación.';
      }
    });
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
