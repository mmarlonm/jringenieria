import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, map } from 'rxjs';
import { formatearTamano } from 'app/core/documentos-requisicion/documentos-requisicion.utils';
import { RequerimientosService, Requerimiento } from '../requerimientos.service';
import { CATEGORIA_GENERAL, iconoArchivo, temaArchivo, validarArchivos } from '../requerimiento-archivos.utils';
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
    MatTooltipModule
  ],
  templateUrl: './requerimiento-dialog.component.html'
})
export class RequerimientoDialogComponent implements OnInit {
  reqForm: FormGroup;
  isEditMode: boolean = false;
  usuarios: any[] = [];
  sucursales = ['Pachuca', 'Puebla', 'Querétaro', 'Corporativo'];

  /** Archivos elegidos: se suben al guardar, cuando el requerimiento ya tiene folio. */
  archivosSeleccionados: File[] = [];
  guardando = false;

  readonly iconoArchivo = iconoArchivo;
  readonly temaArchivo = temaArchivo;
  readonly tamano = formatearTamano;

  constructor(
    private fb: FormBuilder,
    private reqService: RequerimientosService,
    private dialogRef: MatDialogRef<RequerimientoDialogComponent>,
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
      usuarioAsignadoId: [data.requerimiento?.usuarioAsignadoId || null]
    });
  }

  ngOnInit(): void {}

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
  }

  quitarArchivo(indice: number): void {
    this.archivosSeleccionados = this.archivosSeleccionados.filter((_, i) => i !== indice);
  }

  onSubmit(): void {
    if (this.reqForm.invalid || this.guardando) return;

    this.guardando = true;
    const val = this.reqForm.value;
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
          text: `${folio} se guardó, pero los archivos no se pudieron subir (${this.mensajeDe(err)}). Puedes subirlos desde «Calificar → Archivos y planos».`,
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
