import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { EMPRESA_COTIZACION } from '../sgc/empresa-cotizacion';
import { CotizacionSgcDatos } from '../quotes-products.types';

@Component({
  selector: 'app-quote-pdf-dialog',
  templateUrl: './quote-pdf-dialog.component.html',
  styleUrls: ['./quote-pdf-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
  ],
})
export class QuotePdfDialogComponent implements OnInit {
  empresa = EMPRESA_COTIZACION;
  cotizacion: any;
  sgc: CotizacionSgcDatos | null = null;
  partidas: any[] = [];
  totales: any;
  esHeredadaSinGuardar: boolean = false;
  esInstantanea: boolean = false;
  fechaEmisionInstantanea: Date | string | null = null;
  version: number = 1;
  etapa: string = 'Borrador';

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit(): void {
    if (this.data?.instantanea) {
      this.esInstantanea = true;
      const snap = this.data.instantanea.snapshot || this.data.instantanea;
      this.fechaEmisionInstantanea = this.data.instantanea.fechaEmision || snap.fechaEmision;
      this.version = this.data.instantanea.version || snap.version || 1;
      this.etapa = this.data.instantanea.etapa || this.data.instantanea.estado || snap.etapa || 'Emitida';
      this.cotizacion = {
        folio: snap.folio,
        nombreCliente: snap.clienteReceptor || snap.nombreCliente,
        createdDate: this.fechaEmisionInstantanea,
        ...snap,
      };
      this.sgc = snap;
      this.partidas = snap.partidas || [];
      this.totales = {
        subtotal: snap.subtotal || 0,
        iva: snap.iva || 0,
        total: snap.total || 0,
      };
    } else if (this.data?.cotizacion) {
      this.cotizacion = this.data.cotizacion;
      this.sgc = this.data.sgc || null;
      this.partidas = this.data.partidas || [];
      this.totales = this.data.totales || {
        subtotal: this.cotizacion?.subtotal || 0,
        iva: this.cotizacion?.iva || 0,
        total: this.cotizacion?.total || 0,
      };
      this.version = this.data.sgc?.version || this.cotizacion?.version || 1;
      this.etapa = this.data.sgc?.etapa || this.cotizacion?.etapa || 'Borrador';
    } else {
      this.cotizacion = this.data;
      this.sgc = null;
      this.partidas = this.data?.detalles || [];
      this.totales = {
        subtotal: this.cotizacion?.subtotal || 0,
        iva: this.cotizacion?.iva || 0,
        total: this.cotizacion?.total || 0,
      };
      this.version = this.cotizacion?.version || 1;
      this.etapa = this.cotizacion?.etapa || 'Borrador';
    }

    this.esHeredadaSinGuardar = !this.sgc || !this.sgc.tipo;
  }

  get folioOId(): string {
    if (this.sgc && (this.sgc as any).folio) {
      return (this.sgc as any).folio;
    }
    if (this.cotizacion?.folio) {
      return this.cotizacion.folio;
    }
    return `#${this.cotizacion?.cotizacionProductosId || ''}`;
  }

  get folioConVersion(): string {
    const fol = this.folioOId;
    return this.version > 1 ? `${fol} v${this.version}` : fol;
  }

  get esBorrador(): boolean {
    if (this.esInstantanea) return false;
    const etapasEmitidasOCerradas = ['Emitida', 'Aceptada', 'Rechazada', 'Cancelada', 'Vencida'];
    return !etapasEmitidasOCerradas.includes(this.etapa);
  }

  get fechaDocumento(): Date | string | null {
    if (this.esInstantanea && this.fechaEmisionInstantanea) {
      return this.fechaEmisionInstantanea;
    }
    return this.cotizacion?.createdDate;
  }

  get moneda(): string {
    return this.sgc?.moneda || 'MXN';
  }

  get esTipoConAlcance(): boolean {
    return this.sgc?.tipo === 'CT' || this.sgc?.tipo === 'CE';
  }

  exportarPDF(): void {
    const element = document.getElementById('pdf-content');
    if (!element) return;

    html2canvas(element).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'pt', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const filename = this.folioOId.startsWith('#')
        ? `cotizacion-${this.cotizacion?.cotizacionProductosId || 'preview'}.pdf`
        : `cotizacion-${this.folioOId}.pdf`;
      pdf.save(filename);
    });
  }
}
