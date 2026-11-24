import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
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
import { RequerimientosService, Requerimiento, RequerimientoArchivo, RequerimientoSeguimiento, AprobarRequerimientoResultadoDto, GuardarBorradorDto, TIPOS_PROYECTO } from '../requerimientos.service';
import {
  CATEGORIA_GENERAL, CHECKLIST, ItemChecklist, archivosDeCategoria, etiquetaCategoria, guardarBlob, iconoArchivo, temaArchivo, validarArchivos
} from '../requerimiento-archivos.utils';
import Swal from 'sweetalert2';

type Pestana = 'clasificacion' | 'checklist' | 'seguimiento' | 'archivos' | 'aprobacion';

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
  /** Datos que Ingenieria necesita para abrir el caso: se piden al aprobar, ya no en el requerimiento. */
  aprobacionForm: FormGroup;
  readonly tiposProyecto = TIPOS_PROYECTO;
  currentUser: any;
  /** Solo el responsable asignado califica; los demás ven la calificación sin poder cambiarla. */
  puedeCalificar: boolean;

  pestana: Pestana = 'clasificacion';
  guardando = false;
  guardandoBorrador = false;
  huboGuardado = false;
  aprobando = false;
  aprobadoResultado: AprobarRequerimientoResultadoDto | null = null;

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
    @Inject(MAT_DIALOG_DATA) public data: { requerimiento: Requerimiento; currentUser: any; puedeCalificar: boolean }
  ) {
    this.requerimiento = data.requerimiento;
    this.currentUser = data.currentUser;
    this.puedeCalificar = data.puedeCalificar;

    this.aprobacionForm = this.fb.group({
      tipoProyecto: [this.requerimiento.tipoProyecto ?? ''],
      titulo: [this.requerimiento.titulo ?? '', [Validators.maxLength(500)]]
    });
    if (!this.puedeCalificar || this.estaAprobado) {
      this.aprobacionForm.disable();
    }

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
      faltaOtrosDescripcion: [this.requerimiento.faltaOtrosDescripcion || ''],

      // Tres campos de texto de calificación
      cantidades: [{ value: this.requerimiento.cantidades || '', disabled: !this.puedeCalificar || !!this.requerimiento.faltaCantidad }, [Validators.maxLength(500)]],
      ubicacionExacta: [{ value: this.requerimiento.ubicacionExacta || '', disabled: !this.puedeCalificar || !!this.requerimiento.faltaUbicacion }, [Validators.maxLength(500)]],
      marcaModelo: [{ value: this.requerimiento.marcaModelo || '', disabled: !this.puedeCalificar || !!this.requerimiento.faltaMarcaModelo }, [Validators.maxLength(200)]]
    });

    if (!this.puedeCalificar) this.calificarForm.disable();

    this.calificarForm.get('faltaCantidad')?.valueChanges.subscribe(falta => {
      const c = this.calificarForm.get('cantidades');
      if (falta) c?.disable({ emitEvent: false });
      else if (this.puedeCalificar) c?.enable({ emitEvent: false });
      this.calificarForm.updateValueAndValidity();
    });
    this.calificarForm.get('faltaUbicacion')?.valueChanges.subscribe(falta => {
      const c = this.calificarForm.get('ubicacionExacta');
      if (falta) c?.disable({ emitEvent: false });
      else if (this.puedeCalificar) c?.enable({ emitEvent: false });
      this.calificarForm.updateValueAndValidity();
    });
    this.calificarForm.get('faltaMarcaModelo')?.valueChanges.subscribe(falta => {
      const c = this.calificarForm.get('marcaModelo');
      if (falta) c?.disable({ emitEvent: false });
      else if (this.puedeCalificar) c?.enable({ emitEvent: false });
      this.calificarForm.updateValueAndValidity();
    });

    this.dialogRef.backdropClick().subscribe(() => this.intentarCerrar());
    this.dialogRef.keydownEvents().subscribe(event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.intentarCerrar();
      }
    });
  }

  ngOnInit(): void {
    this.loadArchivos();
    this.loadSeguimientos();
  }

  // ------------------------------------------------------------------ pestañas

  /**
   * Lista fija: si fuera un getter que arma objetos nuevos en cada revisión, el `*ngFor` destruiría y recrearía los
   * botones en cada ciclo de detección de cambios (SignalR, temporizadores…) y un clic cuyo «mouse abajo» y «mouse
   * arriba» caen en uno de esos ciclos se perdería: la pestaña «no abre».
   */
  readonly pestanas: { id: Pestana; titulo: string; icono: string }[] = [
    { id: 'clasificacion', titulo: 'Clasificación SGC', icono: 'heroicons_outline:tag' },
    { id: 'checklist', titulo: 'Información faltante', icono: 'heroicons_outline:clipboard-document-check' },
    { id: 'seguimiento', titulo: 'Seguimiento', icono: 'heroicons_outline:chat-bubble-left-right' },
    { id: 'archivos', titulo: 'Archivos y planos', icono: 'heroicons_outline:paper-clip' },
    { id: 'aprobacion', titulo: 'Aprobación', icono: 'heroicons_outline:check-circle' },
  ];

  /** Número que acompaña a la pestaña (0 o null = no se muestra). */
  contadorDe(id: Pestana): number {
    switch (id) {
      case 'checklist': return this.totalFaltantes;
      case 'seguimiento': return this.seguimientos.length;
      case 'archivos': return this.archivos.length;
      default: return 0;
    }
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
    // Con la sesión (HttpClient lleva el token): una navegación directa a la URL daría 401.
    this.reqService.descargarArchivo(this.requerimiento.id, file.id).subscribe({
      next: blob => guardarBlob(blob, file.nombreArchivo),
      error: () => { Swal.fire('No se pudo descargar', 'Intenta de nuevo o vuelve a iniciar sesión.', 'error'); }
    });
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
      this.currentUser?.id
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

  // ------------------------------------------------------------------ validación de textos

  actualizarValidacionTextos(): void {
    this.calificarForm.updateValueAndValidity();
  }

  // ------------------------------------------------------------------ guardar / borrador

  guardarBorrador(cerrarAlTerminar = false): void {
    if (!this.puedeCalificar || this.guardando || this.guardandoBorrador || this.estaAprobado || this.esNoViable) return;

    this.guardandoBorrador = true;
    const rawCal = this.calificarForm.getRawValue();
    const rawAprob = this.aprobacionForm.getRawValue();
    const dto: GuardarBorradorDto = {
      naturaleza: rawCal.naturaleza || null,
      rutaAtencion: rawCal.rutaAtencion || null,
      viabilidad: rawCal.viabilidad || null,
      observacionesRiesgo: (rawCal.observacionesRiesgo ?? '').trim() || null,
      motivoDescarte: (rawCal.motivoDescarte ?? '').trim() || null,
      faltaPlano: !!rawCal.faltaPlano,
      faltaFotografia: !!rawCal.faltaFotografia,
      faltaCantidad: !!rawCal.faltaCantidad,
      faltaUbicacion: !!rawCal.faltaUbicacion,
      faltaDatosElectricos: !!rawCal.faltaDatosElectricos,
      faltaCapacidad: !!rawCal.faltaCapacidad,
      faltaFechaEjecucion: !!rawCal.faltaFechaEjecucion,
      faltaCondicionesSitio: !!rawCal.faltaCondicionesSitio,
      faltaNormativa: !!rawCal.faltaNormativa,
      faltaEvidenciaFalla: !!rawCal.faltaEvidenciaFalla,
      faltaMarcaModelo: !!rawCal.faltaMarcaModelo,
      faltaVisita: !!rawCal.faltaVisita,
      faltaOtros: !!rawCal.faltaOtros,
      faltaOtrosDescripcion: (rawCal.faltaOtrosDescripcion ?? '').trim() || null,
      cantidades: (rawCal.cantidades ?? '').trim() || null,
      ubicacionExacta: (rawCal.ubicacionExacta ?? '').trim() || null,
      marcaModelo: (rawCal.marcaModelo ?? '').trim() || null,
      tipoProyecto: (rawAprob.tipoProyecto ?? '').trim() || null,
      titulo: (rawAprob.titulo ?? '').trim() || null
    };

    this.reqService.guardarBorrador(this.requerimiento.id, dto).subscribe({
      next: () => {
        this.guardandoBorrador = false;
        this.huboGuardado = true;
        this.calificarForm.markAsPristine();
        this.aprobacionForm.markAsPristine();
        Object.assign(this.requerimiento, dto);
        this.avisar('Borrador guardado.');
        if (cerrarAlTerminar) {
          this.dialogRef.close(true);
        }
      },
      error: (err) => {
        this.guardandoBorrador = false;
        Swal.fire('No se pudo guardar el borrador', this.mensajeDe(err), 'error');
      }
    });
  }

  onSubmit(): void {
    if (!this.puedeCalificar || this.calificarForm.invalid || this.guardando || this.estaAprobado) return;

    this.guardando = true;
    const raw = this.calificarForm.getRawValue();
    const dto = {
      ...raw,
      cantidades: (raw.cantidades ?? '').trim() || null,
      ubicacionExacta: (raw.ubicacionExacta ?? '').trim() || null,
      marcaModelo: (raw.marcaModelo ?? '').trim() || null
    };
    this.reqService.calificarRequerimiento(this.requerimiento.id, dto).subscribe({
      next: () => {
        this.guardando = false;
        this.huboGuardado = true;
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.guardando = false;
        Swal.fire('No se pudo guardar la calificación', this.mensajeDe(err), 'error');
      }
    });
  }

  // ------------------------------------------------------------------ cierre y guardia

  get hayCambiosSinGuardar(): boolean {
    return this.calificarForm.dirty || this.aprobacionForm.dirty;
  }

  intentarCerrar(): void {
    if (!this.hayCambiosSinGuardar) {
      this.dialogRef.close(this.huboGuardado ? true : undefined);
      return;
    }

    Swal.fire({
      icon: 'warning',
      title: 'Hay cambios sin guardar',
      text: '¿Deseas guardar los cambios como borrador antes de salir?',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Guardar borrador',
      denyButtonText: 'Descartar cambios',
      cancelButtonText: 'Seguir editando'
    }).then(res => {
      if (res.isConfirmed) {
        this.guardarBorrador(true);
      } else if (res.isDenied) {
        this.dialogRef.close(this.huboGuardado ? true : undefined);
      }
    });
  }

  onCancel(): void {
    this.intentarCerrar();
  }

  // ------------------------------------------------------------------ aprobación

  get esNoViable(): boolean {
    return this.requerimiento.estatus === 'No Viable';
  }

  get estaAprobado(): boolean {
    return (this.requerimiento.estatus || '').toLowerCase().includes('aprobado') ||
      !!this.requerimiento.seguimientoProyectoId ||
      !!this.aprobadoResultado;
  }

  get esTecnico(): boolean {
    return this.requerimiento.estatus === 'Calificado Técnico';
  }

  get esComercial(): boolean {
    return this.requerimiento.estatus === 'Calificado Comercial';
  }

  get esCalificadoGuardado(): boolean {
    return this.esTecnico || this.esComercial;
  }

  get solicitanteResumen(): string {
    return `${this.requerimiento.nombreContacto || ''} (${this.requerimiento.empresa || ''})`.trim();
  }

  get faltantesGuardados(): string[] {
    return this.checklist
      .filter(item => !!(this.requerimiento as any)[item.control])
      .map(item => item.etiqueta);
  }

  get camposFaltantesAprobacion(): string[] {
    const faltantes: string[] = [];
    if (this.esTecnico && this.aprobacionForm.get('titulo')?.hasError('maxlength')) {
      faltantes.push('Título (máximo 500 caracteres)');
    }
    return faltantes;
  }

  get puedeAprobar(): boolean {
    return this.puedeCalificar &&
      !this.estaAprobado &&
      !this.esNoViable &&
      this.esCalificadoGuardado &&
      this.faltantesGuardados.length === 0 &&
      !this.hayCambiosSinGuardar &&
      (!this.esTecnico || this.aprobacionForm.valid);
  }

  aprobar(): void {
    if (!this.puedeAprobar || this.aprobando) return;
    this.aprobando = true;

    const tituloConfirmacion = this.esComercial
      ? '¿Aprobar requerimiento para cotización?'
      : '¿Aprobar requerimiento para Ingeniería?';

    const textoConfirmacion = this.esComercial
      ? 'El requerimiento pasará directo a cotización sin crear caso en Ingeniería.'
      : 'Se creará el caso en Solicitud de cliente en el módulo de Ingeniería.';

    Swal.fire({
      title: tituloConfirmacion,
      text: textoConfirmacion,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed) {
        this.aprobando = false;
        return;
      }
      this.ejecutarAprobacion();
    });
  }

  private ejecutarAprobacion(): void {
    if (this.aprobando && this.aprobadoResultado) return;
    this.aprobando = true;

    const datos = this.aprobacionForm.getRawValue();
    const payload = this.esComercial
      ? {}
      : {
          tipoProyecto: (datos.tipoProyecto ?? '').trim() || null,
          titulo: (datos.titulo ?? '').trim() || null
        };

    this.reqService.aprobarRequerimiento(this.requerimiento.id, payload).subscribe({
      next: (res) => {
        this.aprobando = false;
        this.huboGuardado = true;
        this.aprobadoResultado = res;
        if (this.esTecnico) {
          this.requerimiento.tipoProyecto = (datos.tipoProyecto ?? '').trim() || undefined;
          this.requerimiento.titulo = (datos.titulo ?? '').trim() || undefined;
        }
        this.aprobacionForm.disable();
        this.calificarForm.disable();
        this.requerimiento.estatus = res.estatus;
        this.requerimiento.seguimientoProyectoId = res.idSeguimiento ?? undefined;
        this.calificarForm.get('estatus')?.setValue(res.estatus);

        if (res.destino === 'cotizacion' || !res.idSeguimiento) {
          Swal.fire({
            icon: 'success',
            title: '¡Requerimiento aprobado!',
            html: 'El requerimiento fue aprobado para cotización y no requiere caso en Ingeniería.'
          });
        } else {
          Swal.fire({
            icon: 'success',
            title: '¡Requerimiento aprobado!',
            html: `Se generó el folio <b>${this.escapar(res.folio)}</b> en Solicitud de cliente.`
          });
        }
      },
      error: (err) => {
        this.aprobando = false;
        Swal.fire('No se pudo aprobar', this.mensajeDe(err), 'error');
      }
    });
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
