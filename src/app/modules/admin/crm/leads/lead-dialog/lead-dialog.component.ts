import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { LeadsService, LeadArchivo } from '../leads.service';

@Component({
  selector: 'app-lead-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatStepperModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatChipsModule
  ],
  templateUrl: './lead-dialog.component.html'
})
export class LeadDialogComponent implements OnInit {
  action: 'create' | 'convert' | 'discard' | 'edit';
  leadForm: FormGroup;
  convertForm: FormGroup;
  discardForm: FormGroup;
  users: any[] = [];

  // --- Archivos ---
  archivos: LeadArchivo[] = [];
  archivosSeleccionados: File[] = [];
  categoriaArchivo: string = 'General';
  subiendoArchivos: boolean = false;
  cargandoArchivos: boolean = false;

  fuentes = ['WhatsApp', 'Web', 'Correo', 'Llamada', 'Feria', 'Recomendación'];
  sucursales = ['Pachuca', 'Puebla', 'Querétaro', 'Corporativo'];

  // Catálogos ISO 9001 (Sección 7.4)
  tiposCliente = [
    'Industrial', 'Comercial', 'Gobierno/Institucional', 
    'Distribuidor', 'Socio Comercial', 'OEM', 'Integrador'
  ];
  tiposNecesidad = [
    'Producto', 'Estudios y Análisis', 
    'Instalación y Puesta en Servicio', 'Proyectos'
  ];
  zonasAtencion = [
    'Pachuca', 'Puebla', 'Querétaro', 
    'Otra zona atendible', 'Canalización externa / No atendible'
  ];
  prioridades = ['Alta', 'Media', 'Baja'];
  potenciales = ['Estratégico', 'Recurrente', 'Ocasional', 'No Viable'];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<LeadDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private leadsService: LeadsService,
    private cdr: ChangeDetectorRef
  ) {
    this.action = data.action;
    this.users = data.users || [];
  }

  ngOnInit(): void {
    // Formulario para Crear / Editar Lead
    const lead = this.data.lead;
    this.leadForm = this.fb.group({
      nombreContacto: [lead?.nombreContacto || '', Validators.required],
      empresa: [lead?.empresa || '', Validators.required],
      telefono: [lead?.telefono || '', [Validators.required, Validators.pattern('^[0-9\\-\\+ ]{10,15}$')]],
      email: [lead?.email || '', [Validators.required, Validators.email]],
      fuenteLead: [lead?.fuenteLead || 'WhatsApp', Validators.required],
      necesidadInicial: [lead?.necesidadInicial || '', Validators.required],
      sucursalQueRecibe: [lead?.sucursalQueRecibe || 'Pachuca', Validators.required],
      idUsuarioAsignado: [lead?.idUsuarioAsignado || null, Validators.required]
    });

    // Formulario para Calificar y Convertir a Oportunidad (ISO 9001)
    this.convertForm = this.fb.group({
      tipoCliente: ['', Validators.required],
      tipoNecesidad: ['', Validators.required],
      zonaAtencion: ['', Validators.required],
      nivelPrioridad: ['', Validators.required],
      potencialPreliminar: ['', Validators.required]
    });

    // Formulario para Descartar
    this.discardForm = this.fb.group({
      motivoDescarte: ['', Validators.required]
    });

    // Cargar archivos si es acción de edición
    if (this.action === 'edit' && lead?.id) {
      this.cargarArchivos(lead.id);
    }
  }

  // --- Archivos ---
  cargarArchivos(leadId: number): void {
    this.cargandoArchivos = true;
    this.leadsService.getArchivosLead(leadId).subscribe({
      next: (archivos) => {
        this.archivos = archivos;
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
    if (input.files && input.files.length > 0) {
      this.archivosSeleccionados = Array.from(input.files);
    }
  }

  subirArchivos(): void {
    if (this.archivosSeleccionados.length === 0) return;
    const lead = this.data.lead;
    if (!lead?.id) return;

    this.subiendoArchivos = true;
    this.leadsService.subirArchivosLead(lead.id, this.categoriaArchivo, this.archivosSeleccionados).subscribe({
      next: (nuevos) => {
        this.archivos = [...nuevos, ...this.archivos];
        this.archivosSeleccionados = [];
        this.subiendoArchivos = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.subiendoArchivos = false;
        this.cdr.markForCheck();
      }
    });
  }

  verArchivo(archivo: LeadArchivo): void {
    const lead = this.data.lead;
    if (!lead?.id) return;
    const url = this.leadsService.descargarArchivoLead(lead.id, archivo.id);
    window.open(url, '_blank');
  }

  descargarArchivo(archivo: LeadArchivo): void {
    const lead = this.data.lead;
    if (!lead?.id) return;
    const url = this.leadsService.descargarArchivoLead(lead.id, archivo.id);
    const a = document.createElement('a');
    a.href = url;
    a.download = archivo.nombreArchivo;
    a.click();
  }

  eliminarArchivo(archivo: LeadArchivo): void {
    const lead = this.data.lead;
    if (!lead?.id) return;
    this.leadsService.eliminarArchivoLead(lead.id, archivo.id).subscribe({
      next: () => {
        this.archivos = this.archivos.filter(a => a.id !== archivo.id);
        this.cdr.markForCheck();
      }
    });
  }

  getFileIcon(nombre: string): string {
    const ext = nombre.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'heroicons_outline:document-text';
      case 'doc':
      case 'docx': return 'heroicons_outline:document';
      case 'xls':
      case 'xlsx': return 'heroicons_outline:table-cells';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif': return 'heroicons_outline:photo';
      case 'zip':
      case 'rar': return 'heroicons_outline:archive-box';
      default: return 'heroicons_outline:paper-clip';
    }
  }

  /** Clases de color (fondo + icono) según la extensión del archivo. */
  getFileTheme(nombre: string): string {
    const ext = nombre.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') return 'bg-red-100 dark:bg-red-950/30 text-red-600';
    if (['doc', 'docx'].includes(ext)) return 'bg-blue-100 dark:bg-blue-950/30 text-blue-600';
    if (['xls', 'xlsx'].includes(ext)) return 'bg-green-100 dark:bg-green-950/30 text-green-600';
    if (this.isImageFile(nombre)) return 'bg-purple-100 dark:bg-purple-950/30 text-purple-600';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-500';
  }

  isImageFile(nombre: string): boolean {
    const ext = nombre.split('.').pop()?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '');
  }

  isViewable(nombre: string): boolean {
    const ext = nombre.split('.').pop()?.toLowerCase();
    return ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'txt'].includes(ext || '');
  }

  onSubmit(): void {
    if (this.action === 'create' && this.leadForm.valid) {
      this.dialogRef.close({ action: 'create', data: this.leadForm.value });
    } else if (this.action === 'edit' && this.leadForm.valid) {
      this.dialogRef.close({ action: 'edit', data: this.leadForm.value });
    } else if (this.action === 'convert' && this.convertForm.valid) {
      this.dialogRef.close({ action: 'convert', data: this.convertForm.value });
    } else if (this.action === 'discard' && this.discardForm.valid) {
      this.dialogRef.close({ action: 'discard', data: this.discardForm.value });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
