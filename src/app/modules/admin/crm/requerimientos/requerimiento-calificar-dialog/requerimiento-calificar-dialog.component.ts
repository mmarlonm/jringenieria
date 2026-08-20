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
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { RequerimientosService, Requerimiento, RequerimientoArchivo, RequerimientoSeguimiento } from '../requerimientos.service';
import Swal from 'sweetalert2';

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
    MatTabsModule,
    MatDividerModule
  ],
  templateUrl: './requerimiento-calificar-dialog.component.html',
  styles: [`
    .checklist-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
    }
  `]
})
export class RequerimientoCalificarDialogComponent implements OnInit {
  requerimiento: Requerimiento;
  calificarForm: FormGroup;
  currentUser: any;

  // Colecciones asociadas
  archivos: RequerimientoArchivo[] = [];
  seguimientos: RequerimientoSeguimiento[] = [];

  // Datos para listas
  estatusList = ['Pendiente', 'Calificado Comercial', 'Calificado Técnico', 'No Viable'];
  naturalezas = ['Producto', 'Servicio', 'Proyecto', 'Tablero', 'Prueba / estudio', 'Mantenimiento', 'Diagnóstico / asesoría', 'Mixto'];
  rutas = ['Comercial directa', 'Sucursal', 'Ingeniería', 'Ingeniería + Comercial', 'Dirección / escalamiento'];
  viabilidades = ['Viable', 'Viable con información adicional', 'Viable con visita / levantamiento', 'No viable'];

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

  loadArchivos(): void {
    this.reqService.getArchivos(this.requerimiento.id).subscribe(res => this.archivos = res);
  }

  loadSeguimientos(): void {
    this.reqService.getSeguimientos(this.requerimiento.id).subscribe(res => this.seguimientos = res);
  }

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files.length === 0) return;

    const fileList: File[] = [];
    for (let i = 0; i < files.length; i++) {
      fileList.push(files[i]);
    }

    this.reqService.subirArchivos(this.requerimiento.id, 'Evidencia Requerimiento', fileList).subscribe({
      next: () => {
        Swal.fire('Subido', 'Evidencias de requerimiento subidas correctamente.', 'success');
        this.loadArchivos();
      },
      error: (err) => Swal.fire('Error', 'No se pudo subir los archivos: ' + err.message, 'error')
    });
  }

  descargarArchivo(file: RequerimientoArchivo): void {
    const url = this.reqService.descargarArchivoUrl(this.requerimiento.id, file.id);
    window.open(url, '_blank');
  }

  eliminarArchivo(file: RequerimientoArchivo): void {
    Swal.fire({
      title: '¿Eliminar archivo?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.reqService.eliminarArchivo(this.requerimiento.id, file.id).subscribe(() => {
          Swal.fire('Eliminado', 'El archivo ha sido borrado.', 'success');
          this.loadArchivos();
        });
      }
    });
  }

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
        Swal.fire('Contacto Registrado', 'Trazabilidad guardada correctamente en el CRM.', 'success');
      },
      error: (err) => Swal.fire('Error', 'No se pudo guardar la nota de seguimiento.', 'error')
    });
  }

  eliminarSeguimiento(segId: number): void {
    this.reqService.deleteSeguimiento(this.requerimiento.id, segId).subscribe(() => {
      this.loadSeguimientos();
    });
  }

  onSubmit(): void {
    if (this.calificarForm.invalid) return;

    const val = this.calificarForm.value;
    this.reqService.calificarRequerimiento(this.requerimiento.id, val).subscribe({
      next: () => this.dialogRef.close(true),
      error: (err) => console.error(err)
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
