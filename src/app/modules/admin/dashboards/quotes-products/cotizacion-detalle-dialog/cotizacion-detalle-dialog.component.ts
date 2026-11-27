import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import Swal from 'sweetalert2';
import { QuotesService } from '../quotes-products.service';
import { CotizacionOrigen, RespuestaObtenerSgc, ProspectoCotizacion, EstatusCotizacionSimple } from '../quotes-products.types';
import { EstatusChipComponent } from '../sgc/estatus-chip/estatus-chip.component';
import { ProcesoComercialComponent } from 'app/shared/proceso-comercial/proceso-comercial.component';
import { importeLinea } from '../sgc/cotizacion-sgc.utils';
import { mapearEtapaAEstatus } from '../list/quotes-sgc-merge';

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
    EstatusChipComponent,
    ProcesoComercialComponent
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
  procesoRefresco = 0;
  procesoIniciado = false;
  iniciandoProceso = false;

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

  get prospecto(): ProspectoCotizacion | { empresa?: string | null; nombreContacto?: string | null; telefono?: string | null; email?: string | null } | null {
    if (this.sgcRes?.prospecto) {
      return this.sgcRes.prospecto;
    }
    if (this.origen?.lead) {
      return {
        empresa: this.origen.lead.empresa,
        nombreContacto: this.origen.lead.nombreContacto,
        telefono: this.origen.lead.telefono,
        email: this.origen.lead.email
      };
    }
    return null;
  }

  get estatusSimple(): EstatusCotizacionSimple | null {
    if (this.esInformativa) {
      return null;
    }
    const est = this.sgcRes?.estatusCotizacion || mapearEtapaAEstatus(this.sgcRes?.sgc?.etapa || this.cabecera?.etapa);
    return (est as EstatusCotizacionSimple) || null;
  }

  get motivoRechazo(): string | null {
    return this.sgcRes?.motivoRechazo || this.sgcRes?.sgc?.motivoCierre || null;
  }

  get comentarioRechazo(): string | null {
    return this.sgcRes?.comentarioRechazo || this.sgcRes?.sgc?.comentarioCierre || null;
  }

  async iniciarProceso(): Promise<void> {
    const confirm = await Swal.fire({
      title: '¿Iniciar proceso desde lead?',
      text: 'Se creará un lead y un requerimiento aprobado con los datos de esta cotización',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, iniciar proceso',
      cancelButtonText: 'Cancelar'
    });

    if (!confirm.isConfirmed) {
      return;
    }

    this.iniciandoProceso = true;
    this.quotesService.iniciarProceso(this.data.cotizacionProductosId).subscribe({
      next: (res) => {
        this.iniciandoProceso = false;
        this.esInformativa = false;
        this.procesoIniciado = true;
        this.procesoRefresco++;
        this.cargarDatos();
        Swal.fire({
          icon: 'success',
          title: 'Proceso iniciado',
          text: `Se creó el requerimiento ${res?.requerimientoFolio || ''} y el lead asociado.`,
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (err) => {
        this.iniciandoProceso = false;
        const mensaje = err?.error?.mensaje || 'No se pudo iniciar el proceso.';
        Swal.fire({
          icon: 'error',
          title: 'Error al iniciar proceso',
          text: mensaje
        });
      }
    });
  }

  abrirCotizacion(): void {
    this.router.navigate(['dashboards/quote-products', this.data.cotizacionProductosId]);
    this.dialogRef.close({ recargar: this.procesoIniciado });
  }

  cerrar(): void {
    this.dialogRef.close({ recargar: this.procesoIniciado });
  }
}
