import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { QuotesService } from '../../quotes-products.service';
import { AccionesSgc, VersionSgcItem } from '../../quotes-products.types';
import { NuevaVersionDialogComponent } from '../nueva-version-dialog/nueva-version-dialog.component';
import { QuotePdfDialogComponent } from '../../quote-pdf-dialog/quote-pdf-dialog.component';
import { EtapaChipComponent } from '../etapa-chip/etapa-chip.component';

@Component({
  selector: 'app-versiones-sgc',
  templateUrl: './versiones-sgc.component.html',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, EtapaChipComponent],
})
export class VersionesSgcComponent implements OnInit, OnChanges {
  @Input() cotizacionId: number = 0;
  @Input() versionActual: number = 1;
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
    if (changes['cotizacionId'] && !changes['cotizacionId'].isFirstChange()) {
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

    dialogRef.afterClosed().subscribe((res) => {
      if (res && res.guardado) {
        this.recargar.emit();
        this.cargarVersiones();
      }
    });
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
      error: () => {
        this.cargandoPdf = false;
      },
    });
  }
}

