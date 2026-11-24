import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Requerimiento, RequerimientosService } from '../requerimientos.service';
import { guardarBlob } from '../requerimiento-archivos.utils';
import { ProcesoComercialComponent } from 'app/shared/proceso-comercial/proceso-comercial.component';
import {
  ConvertirCotizacionDialogData,
  ConvertirCotizacionDialogResult,
  RequerimientoConvertirCotizacionDialogComponent
} from '../requerimiento-convertir-cotizacion-dialog/requerimiento-convertir-cotizacion-dialog.component';
import Swal from 'sweetalert2';

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
    MatTooltipModule,
    ProcesoComercialComponent
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
    private reqService: RequerimientosService,
    private dialog: MatDialog
  ) { }

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

  /** Solo un requerimiento «Aprobado para cotización» (con o sin caso en Ingeniería) que aún no tiene cotización. */
  get puedeConvertir(): boolean {
    return !!this.requerimiento
      && this.requerimiento.estatus === 'Aprobado para cotización'
      && !this.requerimiento.cotizacionVinculada;
  }

  get esNoViable(): boolean {
    return this.requerimiento?.estatus === 'No Viable';
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
    const nombre = this.requerimiento.archivos?.find(a => a.id === archivoId)?.nombreArchivo ?? `archivo-${archivoId}`;
    // Con la sesión (HttpClient lleva el token): abrir la URL directa daría 401.
    this.reqService.descargarArchivo(this.requerimiento.id, archivoId).subscribe({
      next: blob => guardarBlob(blob, nombre),
      error: () => { Swal.fire('No se pudo descargar', 'Intenta de nuevo o vuelve a iniciar sesión.', 'error'); }
    });
  }

  /** Abre el diálogo del folio de CONTPAQ; si se convirtió, cierra este con la acción para que el tablero se recargue. */
  convertir(): void {
    if (!this.requerimiento) {
      return;
    }
    const ref = this.dialog.open<RequerimientoConvertirCotizacionDialogComponent, ConvertirCotizacionDialogData, ConvertirCotizacionDialogResult>(
      RequerimientoConvertirCotizacionDialogComponent,
      { width: '680px', maxWidth: '95vw', autoFocus: false, data: { requerimiento: this.requerimiento } }
    );
    ref.afterClosed().subscribe(res => {
      if (res?.convertido) {
        this.dialogRef.close({ accion: 'convertido', resultado: res.resultado });
      }
    });
  }

  calificar(): void {
    this.dialogRef.close({ accion: 'calificar', requerimiento: this.requerimiento });
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}