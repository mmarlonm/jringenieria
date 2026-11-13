import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Observable, map } from 'rxjs';
import { formatearTamano } from 'app/core/documentos-requisicion/documentos-requisicion.utils';
import { RequerimientosService, Requerimiento, RequerimientoArchivo } from '../requerimientos.service';
import { CATEGORIA_GENERAL, etiquetaCategoria, iconoArchivo, temaArchivo, validarArchivos } from '../requerimiento-archivos.utils';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-requerimiento-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressBarModule
  ],
  templateUrl: './requerimiento-dialog.component.html'
})
export class RequerimientoDialogComponent implements OnInit {
  reqForm: FormGroup;
  isEditMode: boolean = false;
  usuarios: any[] = [];
  sucursales = ['Pachuca', 'Puebla', 'Querétaro', 'Corporativo'];

  /** Archivos guardados previamente en el requerimiento (en modo edición). */
  archivosExistentes: RequerimientoArchivo[] = [];
  cargandoArchivos = false;

  /** Nuevos archivos elegidos en el diálogo: se suben al guardar. */
  archivosSeleccionados: File[] = [];
  guardando = false;

  readonly iconoArchivo = iconoArchivo;
  readonly temaArchivo = temaArchivo;
  readonly tamano = formatearTamano;
  readonly etiquetaCategoria = etiquetaCategoria;

  constructor(
    private fb: FormBuilder,
    private reqService: RequerimientosService,
    private dialogRef: MatDialogRef<RequerimientoDialogComponent>,
    private cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: { requerimiento?: Requerimiento; users: any[] }
  ) {
    this.isEditMode = !!data.requerimiento;
    this.usuarios = data.users || [];

    this.reqForm = this.fb.group({
      nombreContacto: [data.requerimiento?.nombreContacto || '', [Validators.required]],
      empresa: [data.requerimiento?.empresa || '', [Validators.required]],
      telefono: [data.requerimiento?.telefono || ''],
      email: [data.requerimiento?.email || '', [Validators.email]],
      sucursal: [data.requerimiento?.sucursal || 'Pachuca', [Validators.required]],
      descripcion: [data.requerimiento?.descripcion || '', [Validators.required]],
      usuarioAsignadoId: [data.requerimiento?.usuarioAsignadoId || null],
      fechaRecepcion: [data.requerimiento?.fechaRecepcion ? new Date(data.requerimiento.fechaRecepcion) : new Date(), [Validators.required]]
    });
  }

  ngOnInit(): void {
    if (this.isEditMode && this.data.requerimiento?.id) {
      if (this.data.requerimiento.archivos && this.data.requerimiento.archivos.length > 0) {
        this.archivosExistentes = [...this.data.requerimiento.archivos];
      }
      this.cargarArchivosExistentes(this.data.requerimiento.id);
    }
  }

  cargarArchivosExistentes(reqId: number): void {
    this.cargandoArchivos = true;
    this.reqService.getArchivos(reqId).subscribe({
      next: (archivos) => {
        this.archivosExistentes = archivos || [];
        if (this.data.requerimiento) {
          this.data.requerimiento.archivos = this.archivosExistentes;
        }
        this.cargandoArchivos = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargandoArchivos = false;
        this.cdr.markForCheck();
      }
    });
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const elegidos = Array.from(input.files ?? []);
    input.value = ''; // permite volver a elegir el mismo archivo
    if (elegidos.length === 0) return;

    const { validos, rechazados } = validarArchivos(elegidos);
    if (rechazados.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Algunos archivos no se agregaron',
        html: rechazados.map(r => `<div><b>${this.escapar(r.nombre)}</b> ${this.escapar(r.motivo)}</div>`).join(''),
      });
    }
    // Sin repetir el mismo archivo (mismo nombre y tamaño) si se elige dos veces
    const nuevos = validos.filter(f => !this.archivosSeleccionados.some(a => a.name === f.name && a.size === f.size));
    this.archivosSeleccionados = [...this.archivosSeleccionados, ...nuevos];
    this.cdr.markForCheck();
  }

  quitarArchivo(indice: number): void {
    this.archivosSeleccionados = this.archivosSeleccionados.filter((_, i) => i !== indice);
    this.cdr.markForCheck();
  }

  verArchivo(archivo: RequerimientoArchivo): void {
    const reqId = this.data.requerimiento?.id;
    if (!reqId) return;
    const url = this.reqService.descargarArchivoUrl(reqId, archivo.id);
    window.open(url, '_blank');
  }

  descargarArchivo(archivo: RequerimientoArchivo): void {
    const reqId = this.data.requerimiento?.id;
    if (!reqId) return;
    const url = this.reqService.descargarArchivoUrl(reqId, archivo.id);
    const a = document.createElement('a');
    a.href = url;
    a.download = archivo.nombreArchivo;
    a.click();
  }

  eliminarArchivo(archivo: RequerimientoArchivo): void {
    const reqId = this.data.requerimiento?.id;
    if (!reqId) return;

    Swal.fire({
      title: '¿Eliminar archivo?',
      text: `Se eliminará permanentemente «${archivo.nombreArchivo}». Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed) return;

      this.reqService.eliminarArchivo(reqId, archivo.id).subscribe({
        next: () => {
          this.archivosExistentes = this.archivosExistentes.filter(a => a.id !== archivo.id);
          if (this.data.requerimiento) {
            this.data.requerimiento.archivos = this.archivosExistentes;
          }
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Archivo eliminado',
            showConfirmButton: false,
            timer: 2000
          });
          this.cdr.markForCheck();
        },
        error: (err) => Swal.fire('No se pudo eliminar', this.mensajeDe(err), 'error')
      });
    });
  }

  onSubmit(): void {
    if (this.reqForm.invalid || this.guardando) return;

    this.guardando = true;
    const rawVal = this.reqForm.value;
    const val = {
      ...rawVal,
      fechaRecepcion: rawVal.fechaRecepcion instanceof Date ? rawVal.fechaRecepcion.toISOString() : (rawVal.fechaRecepcion || new Date().toISOString())
    };
    const original = this.data.requerimiento;

    const guardado$: Observable<{ id: number; folio: string }> = this.isEditMode && original
      ? this.reqService.updateRequerimiento(original.id, val).pipe(map(() => ({ id: original.id, folio: original.folio })))
      : this.reqService.createRequerimiento(val).pipe(map(r => ({ id: r.id, folio: r.folio })));

    guardado$.subscribe({
      next: ({ id, folio }) => this.subirAdjuntos(id, folio),
      error: (err) => {
        this.guardando = false;
        Swal.fire('No se pudo guardar el requerimiento', this.mensajeDe(err), 'error');
      }
    });
  }

  /** Ya guardado el requerimiento: sube los archivos elegidos. Si fallan no se pierde el registro, se avisa dónde volver a subirlos. */
  private subirAdjuntos(id: number, folio: string): void {
    if (this.archivosSeleccionados.length === 0) {
      this.dialogRef.close(true);
      return;
    }

    this.reqService.subirArchivos(id, CATEGORIA_GENERAL, this.archivosSeleccionados).subscribe({
      next: () => this.dialogRef.close(true),
      error: (err) => {
        Swal.fire({
          icon: 'warning',
          title: this.isEditMode ? 'Cambios guardados' : 'Requerimiento registrado',
          text: `${folio} se guardó, pero los archivos nuevos no se pudieron subir (${this.mensajeDe(err)}). Puedes subirlos desde «Calificar → Archivos y planos».`,
        }).then(() => this.dialogRef.close(true));
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  /** El API responde con texto plano en los errores de archivos. */
  private mensajeDe(err: any): string {
    return typeof err?.error === 'string' && err.error ? err.error : (err?.error?.mensaje || 'Inténtalo de nuevo.');
  }

  private escapar(texto: string): string {
    return texto.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  }
}
