import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { QuotesService } from '../../quotes-products.service';
import { AccionesSgc, VersionSgcItem } from '../../quotes-products.types';
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
  imports: [CommonModule, MatButtonModule, MatIconModule],
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

  constructor(
    private quotesService: QuotesService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.cargarVersiones();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const cambio = ['cotizacionId', 'etapa', 'versionActual'].some(
      (k) => changes[k] && !changes[k].isFirstChange()
    );
    if (cambio) {
      this.cargarVersiones();
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

  abrirNuevaVersion(): void {
    const dialogRef = this.dialog.open(NuevaVersionDialogComponent, {
      width: '36rem',
      maxWidth: '95vw',
      data: { cotizacionId: this.cotizacionId },
    });

    // El padre recarga la cotización y, al cambiar etapa/versión, esta lista se vuelve a pedir una sola vez
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
