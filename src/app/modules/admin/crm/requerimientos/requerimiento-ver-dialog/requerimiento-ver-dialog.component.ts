import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Requerimiento, RequerimientosService } from '../requerimientos.service';

export interface RequerimientoVerDialogData {
  id: number;
  requerimiento?: Requerimiento;
  puedeCalificar?: boolean;
}

@Component({
  selector: 'app-requerimiento-ver-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './requerimiento-ver-dialog.component.html'
})
export class RequerimientoVerDialogComponent implements OnInit {
  requerimiento: Requerimiento | null = null;
  cargando = true;
  error: string | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: RequerimientoVerDialogData,
    public dialogRef: MatDialogRef<RequerimientoVerDialogComponent>,
    private reqService: RequerimientosService
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;

    const id = this.data.id || this.data.requerimiento?.id;
    if (!id) {
      this.cargando = false;
      this.error = 'No se proporcionó un identificador de requerimiento válido.';
      return;
    }

    this.reqService.getRequerimiento(id).subscribe({
      next: (req) => {
        this.requerimiento = req;
        this.cargando = false;
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.mensaje ?? (typeof err.error === 'string' ? err.error : (err.message || 'Error al cargar el requerimiento.'));
      }
    });
  }

  get puedeCalificar(): boolean {
    if (!this.requerimiento) return false;
    if (this.data.puedeCalificar !== undefined) {
      return this.data.puedeCalificar;
    }
    return this.reqService.puedeCalificar(this.requerimiento);
  }

  get estaAprobado(): boolean {
    if (!this.requerimiento) return false;
    return this.requerimiento.estatus === 'Aprobado para cotización' || !!this.requerimiento.seguimientoProyectoId;
  }

  get tieneFaltantes(): boolean {
    if (!this.requerimiento) return false;
    const r = this.requerimiento;
    return r.faltaPlano || r.faltaFotografia || r.faltaCantidad || r.faltaUbicacion ||
      r.faltaDatosElectricos || r.faltaCapacidad || r.faltaFechaEjecucion ||
      r.faltaCondicionesSitio || r.faltaNormativa || r.faltaEvidenciaFalla ||
      r.faltaMarcaModelo || r.faltaVisita || r.faltaOtros;
  }

  descargarArchivo(archivoId: number): void {
    if (!this.requerimiento) return;
    const url = this.reqService.descargarArchivoUrl(this.requerimiento.id, archivoId);
    window.open(url, '_blank');
  }

  calificar(): void {
    this.dialogRef.close({ accion: 'calificar', requerimiento: this.requerimiento });
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
