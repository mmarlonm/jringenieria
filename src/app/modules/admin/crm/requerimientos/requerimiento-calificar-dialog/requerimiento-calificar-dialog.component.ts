import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { formatearTamano } from 'app/core/documentos-requisicion/documentos-requisicion.utils';
import { RequerimientosService, Requerimiento, RequerimientoArchivo, RequerimientoSeguimiento } from '../requerimientos.service';
import {
  CATEGORIA_GENERAL, CHECKLIST, ItemChecklist, archivosDeCategoria, etiquetaCategoria, iconoArchivo, temaArchivo, validarArchivos
} from '../requerimiento-archivos.utils';
import Swal from 'sweetalert2';

type Pestana = 'clasificacion' | 'checklist' | 'seguimiento' | 'archivos';

@Component({
  selector: 'app-requerimiento-calificar-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressBarModule
  ],
  templateUrl: './requerimiento-calificar-dialog.component.html'
})
export class RequerimientoCalificarDialogComponent implements OnInit {
  requerimiento: Requerimiento;
  calificarForm: FormGroup;
  currentUser: any;

  pestana: Pestana = 'clasificacion';
  guardando = false;

  // Colecciones asociadas
  archivos: RequerimientoArchivo[] = [];
  seguimientos: RequerimientoSeguimiento[] = [];
  cargandoArchivos = false;
  /** Archivos en subida: por categoría (opción del checklist) o `CATEGORIA_GENERAL`. */
  subiendo: Record<string, boolean> = {};

  // Datos para listas
  estatusList = ['Pendiente', 'Calificado Comercial', 'Calificado Técnico', 'No Viable'];
  naturalezas = ['Producto', 'Servicio', 'Proyecto', 'Tablero', 'Prueba / estudio', 'Mantenimiento', 'Diagnóstico / asesoría', 'Mixto'];
  rutas = ['Comercial directa', 'Sucursal', 'Ingeniería', 'Ingeniería + Comercial', 'Dirección / escalamiento'];
  viabilidades = ['Viable', 'Viable con información adicional', 'Viable con visita / levantamiento', 'No viable'];

  readonly checklist = CHECKLIST;
  readonly categoriaGeneral = CATEGORIA_GENERAL;
  readonly etiquetaCategoria = etiquetaCategoria;
  readonly iconoArchivo = iconoArchivo;
  readonly temaArchivo = temaArchivo;
  readonly tamano = formatearTamano;

  // Formulario de nuevo seguimiento
  medioSeguimiento: string = 'WhatsApp';
  detalleSeguimiento: string = '';

  constructor(
    private fb: FormBuilder,
    private reqService: RequerimientosService,
    private dialogRef: MatDialogRef<RequerimientoCalificarDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { requerimiento: Requerimiento; currentUser: any }
  ) {
    this.requerimiento = data.requerimiento;
    this.currentUser = data.currentUser;

    this.calificarForm = this.fb.group({
      estatus: [this.requerimiento.estatus || 'Pendiente', [Validators.required]],
      naturaleza: [this.requerimiento.naturaleza || ''],
      rutaAtencion: [this.requerimiento.rutaAtencion || ''],
      viabilidad: [this.requerimiento.viabilidad || ''],
      observacionesRiesgo: [this.requerimiento.observacionesRiesgo || ''],
      motivoDescarte: [this.requerimiento.motivoDescarte || ''],

      // Flags de info faltante
      faltaPlano: [this.requerimiento.faltaPlano || false],
      faltaFotografia: [this.requerimiento.faltaFotografia || false],
      faltaCantidad: [this.requerimiento.faltaCantidad || false],
      faltaUbicacion: [this.requerimiento.faltaUbicacion || false],
      faltaDatosElectricos: [this.requerimiento.faltaDatosElectricos || false],
      faltaCapacidad: [this.requerimiento.faltaCapacidad || false],
      faltaFechaEjecucion: [this.requerimiento.faltaFechaEjecucion || false],
      faltaCondicionesSitio: [this.requerimiento.faltaCondicionesSitio || false],
      faltaNormativa: [this.requerimiento.faltaNormativa || false],
      faltaEvidenciaFalla: [this.requerimiento.faltaEvidenciaFalla || false],
      faltaMarcaModelo: [this.requerimiento.faltaMarcaModelo || false],
      faltaVisita: [this.requerimiento.faltaVisita || false],
      faltaOtros: [this.requerimiento.faltaOtros || false],
      faltaOtrosDescripcion: [this.requerimiento.faltaOtrosDescripcion || '']
    });
  }

  ngOnInit(): void {
    this.loadArchivos();
    this.loadSeguimientos();
  }

  // ------------------------------------------------------------------ pestañas

  get pestanas(): { id: Pestana; titulo: string; icono: string; contador: number | null }[] {
    return [
      { id: 'clasificacion', titulo: 'Clasificación SGC', icono: 'heroicons_outline:tag', contador: null },
      { id: 'checklist', titulo: 'Información faltante', icono: 'heroicons_outline:clipboard-document-check', contador: this.totalFaltantes },
      { id: 'seguimiento', titulo: 'Seguimiento', icono: 'heroicons_outline:chat-bubble-left-right', contador: this.seguimientos.length },
      { id: 'archivos', titulo: 'Archivos y planos', icono: 'heroicons_outline:paper-clip', contador: this.archivos.length },
    ];
  }

  get esDescarte(): boolean {
    return this.calificarForm.get('estatus')?.value === 'No Viable' || this.calificarForm.get('viabilidad')?.value === 'No viable';
  }

  // ------------------------------------------------------------------ checklist

  /** La opción está marcada como información que falta. */
  falta(item: ItemChecklist): boolean {
    return this.calificarForm.get(item.control)?.value === true;
  }

  get totalFaltantes(): number {
    return this.checklist.filter(i => this.falta(i)).length;
  }

  archivosDe(item: ItemChecklist): RequerimientoArchivo[] {
    return archivosDeCategoria(this.archivos, item.categoria);
  }

  /** Adjunta documentos a una opción del checklist (se guardan al instante con la categoría de esa opción). */
  onChecklistFiles(item: ItemChecklist, event: Event): void {
    this.subirArchivos(item.categoria, event, `«${item.etiqueta}»`);
  }

  /** Adjunta archivos generales del requerimiento (pestaña «Archivos y planos»). */
  onFileSelected(event: Event): void {
    this.subirArchivos(CATEGORIA_GENERAL, event, 'el requerimiento');
  }

  private subirArchivos(categoria: string, event: Event, destino: string): void {
    const input = event.target as HTMLInputElement;
    const elegidos = Array.from(input.files ?? []);
    input.value = ''; // permite volver a elegir el mismo archivo
    if (elegidos.length === 0) return;

    const { validos, rechazados } = validarArchivos(elegidos);
    if (rechazados.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Algunos archivos no se subieron',
        html: rechazados.map(r => `<div><b>${this.escapar(r.nombre)}</b> ${this.escapar(r.motivo)}</div>`).join(''),
      });
    }
    if (validos.length === 0) return;

    this.subiendo[categoria] = true;
    this.reqService.subirArchivos(this.requerimiento.id, categoria, validos).subscribe({
      next: () => {
        this.subiendo[categoria] = false;
        this.avisar(`${validos.length === 1 ? 'Archivo subido' : validos.length + ' archivos subidos'} a ${destino}.`);
        this.loadArchivos();
      },
      error: (err) => {
        this.subiendo[categoria] = false;
        Swal.fire('No se pudo subir', this.mensajeDe(err), 'error');
      }
    });
  }

  // ------------------------------------------------------------------ archivos

  loadArchivos(): void {
    this.cargandoArchivos = true;
    this.reqService.getArchivos(this.requerimiento.id).subscribe({
      next: res => { this.archivos = res; this.cargandoArchivos = false; },
      error: () => { this.cargandoArchivos = false; }
    });
  }

  loadSeguimientos(): void {
    this.reqService.getSeguimientos(this.requerimiento.id).subscribe(res => this.seguimientos = res);
  }

  descargarArchivo(file: RequerimientoArchivo): void {
    const a = document.createElement('a');
    a.href = this.reqService.descargarArchivoUrl(this.requerimiento.id, file.id);
    a.download = file.nombreArchivo;
    a.click();
  }

  eliminarArchivo(file: RequerimientoArchivo): void {
    Swal.fire({
      title: '¿Eliminar archivo?',
      text: `Se eliminará «${file.nombreArchivo}». Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.reqService.eliminarArchivo(this.requerimiento.id, file.id).subscribe({
        next: () => {
          this.avisar('Archivo eliminado.');
          this.loadArchivos();
        },
        error: (err) => Swal.fire('No se pudo eliminar', this.mensajeDe(err), 'error')
      });
    });
  }

  // ------------------------------------------------------------------ seguimiento

  addSeguimiento(): void {
    if (!this.detalleSeguimiento.trim()) return;

    this.reqService.createSeguimiento(
      this.requerimiento.id,
      this.medioSeguimiento,
      this.detalleSeguimiento,
      this.currentUser?.id || 1
    ).subscribe({
      next: () => {
        this.detalleSeguimiento = '';
        this.loadSeguimientos();
        this.avisar('Seguimiento registrado en el CRM.');
      },
      error: () => Swal.fire('Error', 'No se pudo guardar la nota de seguimiento.', 'error')
    });
  }

  eliminarSeguimiento(segId: number): void {
    this.reqService.deleteSeguimiento(this.requerimiento.id, segId).subscribe(() => {
      this.loadSeguimientos();
    });
  }

  // ------------------------------------------------------------------ guardar

  onSubmit(): void {
    if (this.calificarForm.invalid || this.guardando) return;

    this.guardando = true;
    this.reqService.calificarRequerimiento(this.requerimiento.id, this.calificarForm.value).subscribe({
      next: () => this.dialogRef.close(true),
      error: (err) => {
        this.guardando = false;
        Swal.fire('No se pudo guardar la calificación', this.mensajeDe(err), 'error');
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  // ------------------------------------------------------------------ utilidades

  private avisar(titulo: string): void {
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: titulo, showConfirmButton: false, timer: 2500 });
  }

  /** El API responde con texto plano en los errores de archivos. */
  private mensajeDe(err: any): string {
    return typeof err?.error === 'string' && err.error ? err.error : (err?.error?.mensaje || 'Inténtalo de nuevo.');
  }

  private escapar(texto: string): string {
    return texto.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  }
}
