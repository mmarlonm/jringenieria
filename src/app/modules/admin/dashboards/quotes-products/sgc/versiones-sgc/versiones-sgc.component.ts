import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormControl, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { QuotesService } from '../../quotes-products.service';
import { AccionesSgc, VersionSgcItem, CotizacionArchivoDto } from '../../quotes-products.types';
import { NuevaVersionDialogComponent } from '../nueva-version-dialog/nueva-version-dialog.component';
import { QuotePdfDialogComponent } from '../../quote-pdf-dialog/quote-pdf-dialog.component';

const NOMBRES_MEDIOS: Record<string, string> = {
  Correo: 'Correo',
  ERP: 'ERP',
  DocumentoControlado: 'Documento controlado',
  Otro: 'Otro',
};

@Component({
  selector: 'app-versiones-sgc',
  templateUrl: './versiones-sgc.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
  ],
})
export class VersionesSgcComponent implements OnInit, OnChanges {
  @Input() cotizacionId: number = 0;
  @Input() versionActual: number = 1;
  // La etapa cambia al emitir o al crear una versión: es la señal para volver a pedir la lista
  @Input() etapa: string = 'Borrador';
  @Input() acciones: AccionesSgc = {
    editar: true,
    enviarRevision: false,
    volverBorrador: false,
    revisar: [],
    emitir: false,
    nuevaVersion: false,
  };
  @Output() recargar = new EventEmitter<void>();

  versiones: VersionSgcItem[] = [];
  cargando: boolean = false;
  cargandoPdf: boolean = false;

  // Archivos corregidos
  archivos: CotizacionArchivoDto[] = [];
  cargandoArchivos: boolean = false;
  subiendoArchivo: boolean = false;
  archivoSeleccionado: File | null = null;
  comentarioArchivoControl = new FormControl('', [
    Validators.required,
    Validators.minLength(10),
    Validators.maxLength(1000),
  ]);

  constructor(
    private quotesService: QuotesService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.cargarVersiones();
    this.cargarArchivos();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const cambio = ['cotizacionId', 'etapa', 'versionActual'].some(
      (k) => changes[k] && !changes[k].isFirstChange()
    );
    if (cambio) {
      this.cargarVersiones();
      this.cargarArchivos();
    }
  }

  cargarVersiones(): void {
    if (!this.cotizacionId || typeof this.quotesService?.versiones !== 'function') {
      this.versiones = [];
      return;
    }

    this.cargando = true;
    this.quotesService.versiones(this.cotizacionId).subscribe({
      next: (res) => {
        this.cargando = false;
        this.versiones = res || [];
      },
      error: () => {
        this.cargando = false;
      },
    });
  }

  cargarArchivos(): void {
    if (!this.cotizacionId || typeof this.quotesService?.getArchivos !== 'function') {
      this.archivos = [];
      return;
    }

    this.cargandoArchivos = true;
    this.quotesService.getArchivos(this.cotizacionId).subscribe({
      next: (res) => {
        this.cargandoArchivos = false;
        this.archivos = res || [];
      },
      error: () => {
        this.cargandoArchivos = false;
      },
    });
  }

  onArchivoSeleccionado(event: any): void {
    const file = event?.target?.files?.[0];
    if (file) {
      this.archivoSeleccionado = file;
    }
  }

  subirArchivoCorregido(): void {
    if (!this.archivoSeleccionado || this.comentarioArchivoControl.invalid || !this.cotizacionId) {
      this.comentarioArchivoControl.markAsTouched();
      return;
    }

    const comentario = this.comentarioArchivoControl.value?.trim() || '';
    this.subiendoArchivo = true;

    this.quotesService.subirArchivo(this.cotizacionId, this.archivoSeleccionado, comentario).subscribe({
      next: () => {
        this.subiendoArchivo = false;
        this.archivoSeleccionado = null;
        this.comentarioArchivoControl.reset();
        this.cargarArchivos();
        this.recargar.emit();
        Swal.fire({
          icon: 'success',
          title: 'Archivo subido',
          text: 'El archivo corregido se guardó correctamente.',
          timer: 2000,
          showConfirmButton: false,
        });
      },
      error: (err) => {
        this.subiendoArchivo = false;
        Swal.fire({
          icon: 'error',
          title: 'Error al subir archivo',
          text: err?.error?.mensaje || 'No se pudo subir el archivo corregido.',
        });
      },
    });
  }

  descargar(archivo: CotizacionArchivoDto): void {
    if (!this.cotizacionId || !archivo?.id) return;

    this.quotesService.descargarArchivo(this.cotizacionId, archivo.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = archivo.nombreOriginal;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error al descargar',
          text: err?.error?.mensaje || 'No se pudo descargar el archivo.',
        });
      },
    });
  }

  formatearTamano(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  abrirNuevaVersion(): void {
    const dialogRef = this.dialog.open(NuevaVersionDialogComponent, {
      width: '36rem',
      maxWidth: '95vw',
      data: { cotizacionId: this.cotizacionId },
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res && res.guardado) {
        this.recargar.emit();
      }
    });
  }

  esVigente(v: VersionSgcItem): boolean {
    return v.estado === 'Vigente';
  }

  nombreMedio(medio: string | null | undefined): string {
    return (medio && NOMBRES_MEDIOS[medio]) || medio || '—';
  }

  verPdf(versionNumero: number): void {
    if (this.cargandoPdf) return;
    this.cargandoPdf = true;

    this.quotesService.version(this.cotizacionId, versionNumero).subscribe({
      next: (detalle) => {
        this.cargandoPdf = false;
        this.dialog.open(QuotePdfDialogComponent, {
          width: '75rem',
          maxWidth: '95vw',
          data: {
            instantanea: detalle,
            version: versionNumero,
          },
        });
      },
      error: (err) => {
        this.cargandoPdf = false;
        Swal.fire({
          icon: 'error',
          title: 'No se pudo abrir el PDF',
          text: err?.error?.mensaje || 'No se pudo leer la versión. Intenta de nuevo.',
        });
      },
    });
  }
}
