import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { QuotesService } from '../../quotes-products.service';
import { AccionesSgc, CatalogosSgc, RevisionSgc } from '../../quotes-products.types';
import { RevisionDialogComponent } from '../revision-dialog/revision-dialog.component';

const NOMBRES_ROLES: Record<string, string> = {
  Comercial: 'Comercial',
  Ingenieria: 'Ingeniería',
  Direccion: 'Dirección',
};

@Component({
  selector: 'app-revision-sgc',
  templateUrl: './revision-sgc.component.html',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
})
export class RevisionSgcComponent implements OnInit, OnChanges {
  @Input() cotizacionId: number = 0;
  @Input() etapa: string = 'Borrador';
  @Input() revisionesRequeridas: string[] = [];
  @Input() revisionesVigentes: RevisionSgc[] = [];
  @Input() acciones: AccionesSgc = {
    editar: true,
    enviarRevision: false,
    volverBorrador: false,
    revisar: [],
    emitir: false,
    nuevaVersion: false,
  };
  @Input() catalogos: CatalogosSgc | null = null;
  @Output() recargar = new EventEmitter<void>();

  historialRevisiones: RevisionSgc[] = [];
  cargandoHistorial: boolean = false;
  volviendoBorrador: boolean = false;

  constructor(
    private quotesService: QuotesService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.cargarHistorial();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cotizacionId'] && !changes['cotizacionId'].isFirstChange()) {
      this.cargarHistorial();
    }
    if (changes['revisionesVigentes'] && !changes['revisionesVigentes'].isFirstChange()) {
      this.cargarHistorial();
    }
  }

  cargarHistorial(): void {
    if (!this.cotizacionId || typeof this.quotesService?.revisiones !== 'function') {
      this.historialRevisiones = [];
      return;
    }
    this.cargandoHistorial = true;
    this.quotesService.revisiones(this.cotizacionId).subscribe({
      next: (res) => {
        this.cargandoHistorial = false;
        this.historialRevisiones = res || [];
      },
      error: () => {
        this.cargandoHistorial = false;
      },
    });
  }

  nombreRol(rol: string): string {
    return NOMBRES_ROLES[rol] || rol;
  }

  get ultimaRevisionRechazada(): RevisionSgc | undefined {
    return (this.revisionesVigentes || []).find((r) => r.resultado === 'Rechazada');
  }

  revisionDelRol(rol: string): RevisionSgc | undefined {
    return (this.revisionesVigentes || []).find((r) => r.rol.toLowerCase() === rol.toLowerCase());
  }

  puedeRevisar(rol: string): boolean {
    return (this.acciones?.revisar || []).some((r) => r.toLowerCase() === rol.toLowerCase());
  }

  abrirDialogoRevision(rol: string): void {
    const dialogRef = this.dialog.open(RevisionDialogComponent, {
      width: '40rem',
      maxWidth: '95vw',
      data: {
        rol,
        cotizacionId: this.cotizacionId,
        catalogos: this.catalogos,
      },
    });

    // El padre recarga la cotización y le pasa las revisiones nuevas: ngOnChanges pide el historial una sola vez
    dialogRef.afterClosed().subscribe((res) => {
      if (res && res.guardado) {
        this.recargar.emit();
      }
    });
  }

  async onVolverBorrador(): Promise<void> {
    if (this.volviendoBorrador) return;

    const confirmacion = await Swal.fire({
      title: '¿Volver a borrador?',
      text: 'Se descartarán las revisiones de esta versión y la cotización podrá ser editada nuevamente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, volver a borrador',
      cancelButtonText: 'Cancelar',
    });

    if (!confirmacion?.isConfirmed) return;

    this.volviendoBorrador = true;
    this.quotesService.volverBorrador(this.cotizacionId).subscribe({
      next: () => {
        this.volviendoBorrador = false;
        this.recargar.emit();
      },
      error: (err) => {
        this.volviendoBorrador = false;
        Swal.fire({
          icon: 'error',
          title: 'No se pudo volver a borrador',
          text: err?.error?.mensaje || 'Intenta de nuevo.',
        });
      },
    });
  }
}
