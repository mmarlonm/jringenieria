import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { QuotesService } from '../quotes-products.service';
import { CotizacionOrigen, RespuestaObtenerSgc } from '../quotes-products.types';
import { EtapaChipComponent } from '../sgc/etapa-chip/etapa-chip.component';
import { importeLinea } from '../sgc/cotizacion-sgc.utils';
import { FolioCotizacionComponent } from '../folio-cotizacion/folio-cotizacion.component';

export interface CotizacionDetalleDialogData {
  cotizacionProductosId: number;
  informativa?: boolean;
  unidadNombre?: string | null;
}

@Component({
  selector: 'app-cotizacion-detalle-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    EtapaChipComponent,
    FolioCotizacionComponent
  ],
  templateUrl: './cotizacion-detalle-dialog.component.html'
})
export class CotizacionDetalleDialogComponent implements OnInit {
  cargandoCabecera = true;
  errorCabecera = false;
  cabecera: any = null;

  cargandoSgc = true;
  errorSgc = false;
  sgcRes: RespuestaObtenerSgc | null = null;

  cargandoOrigen = true;
  errorOrigen = false;
  origen: CotizacionOrigen | null = null;

  esInformativa = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: CotizacionDetalleDialogData,
    private dialogRef: MatDialogRef<CotizacionDetalleDialogComponent>,
    private quotesService: QuotesService,
    private router: Router
  ) {
    this.esInformativa = !!data?.informativa;
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    const id = this.data.cotizacionProductosId;

    this.cargandoCabecera = true;
    this.errorCabecera = false;
    this.quotesService.getQuoteById(id).subscribe({
      next: (res) => {
        this.cabecera = res?.data || res;
        this.cargandoCabecera = false;
      },
      error: () => {
        this.cargandoCabecera = false;
        this.errorCabecera = true;
      }
    });

    if (this.esInformativa) {
      this.cargandoSgc = false;
    } else {
      this.cargandoSgc = true;
      this.errorSgc = false;
      this.quotesService.obtenerSgc(id).subscribe({
        next: (res) => {
          this.sgcRes = res;
          if (res?.informativa) {
            this.esInformativa = true;
          }
          this.cargandoSgc = false;
        },
        error: () => {
          this.cargandoSgc = false;
          this.errorSgc = true;
        }
      });
    }

    this.cargandoOrigen = true;
    this.errorOrigen = false;
    this.quotesService.origen(id).subscribe({
      next: (res) => {
        this.origen = res;
        this.cargandoOrigen = false;
      },
      error: () => {
        this.cargandoOrigen = false;
        this.errorOrigen = true;
      }
    });
  }

  get partidas(): any[] {
    if (this.sgcRes?.partidas && this.sgcRes.partidas.length > 0) {
      return this.sgcRes.partidas;
    }
    return this.cabecera?.detalles || [];
  }

  importePartida(p: any): number {
    return importeLinea(p?.cantidad || 0, p?.precioUnitario || 0, p?.descuento || 0);
  }

  descripcionPartida(p: any): string {
    return p?.materialServicio || p?.descripcion || p?.producto?.nombreProducto || 'Sin descripción';
  }

  unidadPartida(p: any): string {
    return p?.unidad || '—';
  }

  get total(): number {
    if (this.sgcRes?.totales?.total !== undefined && this.sgcRes?.totales?.total !== null) {
      return this.sgcRes.totales.total;
    }
    return this.cabecera?.total ?? 0;
  }

  get moneda(): string {
    return this.sgcRes?.sgc?.moneda || this.cabecera?.moneda || 'MXN';
  }

  abrirCotizacion(): void {
    this.router.navigate(['dashboards/quote-products', this.data.cotizacionProductosId]);
    this.dialogRef.close();
  }

  onFolioAgregado(nuevoFolio: string): void {
    if (this.cabecera) {
      this.cabecera.folioContpaq = nuevoFolio;
    }
    if (this.origen) {
      this.origen.folioCotizacion = nuevoFolio;
      this.origen.puedeAgregarFolio = false;
    }
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
