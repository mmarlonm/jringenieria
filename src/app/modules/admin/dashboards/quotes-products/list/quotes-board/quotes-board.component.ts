import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { QuotesService } from '../../quotes-products.service';
import { TipoCotizacionSgc, CotizacionIngenieriaCasoDto } from '../../quotes-products.types';
import { EtapaChipComponent } from '../../sgc/etapa-chip/etapa-chip.component';
import { EstatusChipComponent } from '../../sgc/estatus-chip/estatus-chip.component';
import { CotizacionDetalleDialogComponent } from '../../cotizacion-detalle-dialog/cotizacion-detalle-dialog.component';
import { IngenieriaCasoDialogComponent } from '../../dialogs/ingenieria-caso-dialog/ingenieria-caso-dialog.component';
import { aplicarResumenSgc, puedeEliminarCotizacion, obtenerTituloCliente, tieneLead, obtenerEstatusCotizacion } from '../quotes-sgc-merge';

export interface ColumnaCotizaciones {
  tipo: TipoCotizacionSgc;
  titulo: string;
  ayuda: string;
  /** Todo lo cargado hasta ahora (varias páginas). */
  items: any[];
  /** Lo que se pinta: `items` ya filtrado por texto, etapa y marcas. Se recalcula al cambiar el dato, no en cada lectura. */
  visibles: any[];
  pagina: number;
  total: number;
  cargando: boolean;
  error: string | null;
  resumenFallo: boolean;
}

export const TAM_PAGINA_TABLERO = 15;

/**
 * Tablero de cotizaciones por tipo (Comercial / Técnico-comercial / Estratégica), igual de formato que el de
 * Requerimientos. El listado viene paginado del servidor, así que **cada columna pide su propia página** con el
 * filtro `tipo`; la columna Comercial incluye además las cotizaciones de CONTPAQ sin capa SGC (informativas).
 */
@Component({
  selector: 'app-quotes-board',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, EtapaChipComponent, EstatusChipComponent, MatTooltipModule],
  templateUrl: './quotes-board.component.html'
})
export class QuotesBoardComponent implements OnInit, OnChanges {
  @Input() desde: string | null = null;
  @Input() hasta: string | null = null;
  @Input() unidadId: number | null = null;
  @Input() texto = '';
  @Input() etapa = 'todas';
  @Input() marcas = 'todas';
  @Input() permisoEliminar = false;
  @Input() refresco = 0;

  /** Id de la cotización que se quiere abrir. */
  @Output() abrir = new EventEmitter<number>();
  /** Id de la cotización que se quiere eliminar. */
  @Output() eliminar = new EventEmitter<number>();
  /** Suma de los totales de las tres columnas (para el encabezado de la pantalla). */
  @Output() totalChange = new EventEmitter<number>();

  readonly columnas: ColumnaCotizaciones[] = [
    this.nuevaColumna('CS', 'Comercial', 'Incluye las cotizaciones de CONTPAQ sin flujo (informativas)'),
    this.nuevaColumna('CT', 'Técnico-comercial', 'Con alcance técnico'),
    this.nuevaColumna('CE', 'Estratégica', 'Proyectos estratégicos')
  ];

  casosIngenieria: CotizacionIngenieriaCasoDto[] = [];
  cargandoIngenieria = false;

  /** Una respuesta tardía de una carga vieja no debe pisar a la nueva. */
  private readonly solicitudes: Record<TipoCotizacionSgc, number> = { CS: 0, CT: 0, CE: 0 };

  constructor(private quotesService: QuotesService, private cdr: ChangeDetectorRef, private dialog: MatDialog) { }

  ngOnInit(): void {
    this.cargarCasosIngenieria();
  }

  cargarCasosIngenieria(): void {
    if (typeof this.quotesService?.getIngenieriaTecnicoComercial !== 'function') {
      return;
    }
    this.cargandoIngenieria = true;
    this.quotesService.getIngenieriaTecnicoComercial(this.desde || undefined, this.hasta || undefined, this.unidadId || undefined).subscribe({
      next: (casos) => {
        this.casosIngenieria = casos || [];
        this.cargandoIngenieria = false;
        this.asociarCasosIngenieriaACotizaciones();
        this.cdr.markForCheck();
      },
      error: () => {
        this.casosIngenieria = [];
        this.cargandoIngenieria = false;
        this.cdr.markForCheck();
      }
    });
  }

  asociarCasosIngenieriaACotizaciones(): void {
    const mapaCasosPorCotizacion = new Map<number, number>();
    this.casosIngenieria.forEach(c => {
      if (c.cotizacionProductosId) {
        mapaCasosPorCotizacion.set(c.cotizacionProductosId, c.idSeguimiento);
      }
    });
    this.columnas.forEach(col => {
      col.items.forEach((q: any) => {
        if (mapaCasosPorCotizacion.has(q.cotizacionProductosId)) {
          q.casoIngenieriaId = mapaCasosPorCotizacion.get(q.cotizacionProductosId);
        }
      });
    });
  }

  get casosIngenieriaVisibles(): CotizacionIngenieriaCasoDto[] {
    const idsCotizacionesEnTablero = new Set<number>();
    this.columnas.forEach(c => {
      c.items.forEach((q: any) => {
        if (q.cotizacionProductosId) idsCotizacionesEnTablero.add(q.cotizacionProductosId);
      });
    });

    return this.casosIngenieria.filter(caso => {
      if (caso.cotizacionProductosId && idsCotizacionesEnTablero.has(caso.cotizacionProductosId)) {
        return false;
      }
      if (this.texto) {
        const t = this.texto.trim().toLowerCase();
        return [
          caso.titulo,
          caso.empresa,
          caso.idSeguimiento.toString(),
          caso.sucursalNombre
        ].some(v => (v ?? '').toString().toLowerCase().includes(t));
      }
      return true;
    });
  }

  verCasoIngenieria(caso: CotizacionIngenieriaCasoDto, event: MouseEvent): void {
    event.stopPropagation();
    this.dialog.open(IngenieriaCasoDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { caso }
    });
  }

  nombreEstatusEtapa5(estatus: number): string {
    switch (estatus) {
      case 1: return 'Pendiente';
      case 2: return 'En proceso';
      case 3: return 'Aprobada';
      case 4: return 'Rechazada';
      case 6: return 'Autorizada';
      default: return `Estatus ${estatus}`;
    }
  }

  verDetalle(q: any, event: MouseEvent): void {
    event.stopPropagation();
    const dialogRef = this.dialog.open(CotizacionDetalleDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: {
        cotizacionProductosId: q.cotizacionProductosId,
        informativa: !!q.informativa,
        unidadNombre: q.unidadDeNegocio?.nombre || null
      }
    });
    dialogRef?.afterClosed?.().subscribe((res) => {
      if (res?.recargar) {
        this.recargarTodo();
      }
    });
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['desde'] || cambios['hasta'] || cambios['unidadId']) {
      this.recargarTodo();
      return;
    }
    if (cambios['refresco'] && !cambios['refresco'].firstChange) {
      this.recargarTodo();
      return;
    }
    if (cambios['texto'] || cambios['etapa'] || cambios['marcas']) {
      this.columnas.forEach(c => this.recalcular(c));
    }
  }

  recargarTodo(): void {
    this.cargarCasosIngenieria();
    this.columnas.forEach(c => this.cargar(c, true));
  }

  cargar(col: ColumnaCotizaciones, reiniciar: boolean): void {
    const pagina = reiniciar ? 1 : col.pagina + 1;
    const solicitud = ++this.solicitudes[col.tipo];
    col.cargando = true;
    col.error = null;
    if (reiniciar) {
      col.resumenFallo = false;
    }
    this.cdr.markForCheck();

    const req$ = this.unidadId != null
      ? this.quotesService.getQuotesPorRango(pagina, TAM_PAGINA_TABLERO, this.desde || null, this.hasta || null, col.tipo, this.unidadId)
      : this.quotesService.getQuotesPorRango(pagina, TAM_PAGINA_TABLERO, this.desde || null, this.hasta || null, col.tipo);

    req$.subscribe({
      next: (res: any) => {
        if (solicitud !== this.solicitudes[col.tipo]) {
          return;
        }
        if (!res || res.code != 200) {
          this.fallar(col, res?.message);
          return;
        }
        const nuevos: any[] = Array.isArray(res.data) ? res.data : [];
        col.total = res.totalCount ?? res.count ?? nuevos.length;
        col.pagina = pagina;
        col.items = reiniciar ? nuevos : this.unirSinDuplicar(col.items, nuevos);
        this.asociarCasosIngenieriaACotizaciones();
        col.cargando = false;
        this.recalcular(col);
        this.emitirTotal();
        this.cargarResumen(col, nuevos, solicitud);
      },
      error: () => {
        if (solicitud === this.solicitudes[col.tipo]) {
          this.fallar(col, null);
        }
      }
    });
  }

  masDisponible(col: ColumnaCotizaciones): boolean {
    return !col.cargando && col.items.length < col.total;
  }

  tituloCliente(q: any): string {
    return obtenerTituloCliente(q);
  }

  tieneLead(q: any): boolean {
    return tieneLead(q);
  }

  obtenerEstatus(q: any): string | null {
    return obtenerEstatusCotizacion(q);
  }

  textoFolio(q: any): string {
    if (q?.folio) {
      return q.version && q.version > 1 ? `${q.folio} v${q.version}` : q.folio;
    }
    return `#${q?.cotizacionProductosId ?? ''}`;
  }

  trackPorId(_: number, q: any): number {
    return q.cotizacionProductosId;
  }

  puedeEliminar(q: any): boolean {
    return this.permisoEliminar && puedeEliminarCotizacion(q);
  }

  solicitarEliminar(q: any, event: Event): void {
    event.stopPropagation();
    this.eliminar.emit(q.cotizacionProductosId);
  }

  buscarPorId(id: number): any | undefined {
    for (const col of this.columnas) {
      const encontrada = col.items.find((q: any) => q.cotizacionProductosId === id);
      if (encontrada) {
        return encontrada;
      }
    }
    return undefined;
  }

  private cargarResumen(col: ColumnaCotizaciones, nuevos: any[], solicitud: number): void {
    const ids = nuevos
      .map((q: any) => q.cotizacionProductosId)
      .filter((id: any) => id != null && id > 0);
    if (ids.length === 0) {
      return;
    }
    this.quotesService.resumenSgc(ids).subscribe({
      next: (resumenes) => {
        if (solicitud !== this.solicitudes[col.tipo]) {
          return;
        }
        const porId = new Map((resumenes || []).map((r) => [r.cotizacionProductosId, r]));
        col.items.forEach((q: any) => {
          const r = porId.get(q.cotizacionProductosId);
          if (r) {
            aplicarResumenSgc(q, r);
          }
        });
        this.recalcular(col);
      },
      error: () => {
        if (solicitud === this.solicitudes[col.tipo]) {
          col.resumenFallo = true;
          this.cdr.markForCheck();
        }
      }
    });
  }

  private fallar(col: ColumnaCotizaciones, mensaje?: string | null): void {
    col.cargando = false;
    col.error = mensaje || 'No se pudieron cargar las cotizaciones de esta columna.';
    this.cdr.markForCheck();
  }

  private unirSinDuplicar(actuales: any[], nuevos: any[]): any[] {
    const ids = new Set(actuales.map(q => q.cotizacionProductosId));
    return [...actuales, ...nuevos.filter(q => !ids.has(q.cotizacionProductosId))];
  }

  /**
   * Se emite en una microtarea y no en el momento: si la respuesta llega de inmediato (caché, datos ya listos) el
   * evento caería dentro del ciclo de detección del padre, cuyo encabezado ya se evaluó (NG0100).
   */
  private emitirTotal(): void {
    const total = this.columnas.reduce((suma, c) => suma + (c.total || 0), 0);
    Promise.resolve().then(() => this.totalChange.emit(total));
  }

  private recalcular(col: ColumnaCotizaciones): void {
    const texto = (this.texto || '').trim().toLowerCase();
    col.visibles = col.items.filter((q: any) => {
      if (this.etapa && this.etapa !== 'todas') {
        if (this.etapa === 'informativa') {
          if (!q.informativa) {
            return false;
          }
        } else {
          const est = this.obtenerEstatus(q);
          if (est !== this.etapa && q.etapa !== this.etapa) {
            return false;
          }
        }
      }
      if (this.marcas === 'vencidas' && !q.vencida) {
        return false;
      }
      if (this.marcas === 'atrasadas' && !q.seguimientoAtrasado) {
        return false;
      }
      if (!texto) {
        return true;
      }
      return [
        this.textoFolio(q),
        q.folioContpaq,
        q.nombreCliente,
        q.prospecto?.empresa,
        q.prospecto?.nombreContacto,
        q.unidadDeNegocio?.nombre,
        q.requerimientoFolio
      ].some(v => (v ?? '').toString().toLowerCase().includes(texto));
    });
    this.cdr.markForCheck();
  }

  private nuevaColumna(tipo: TipoCotizacionSgc, titulo: string, ayuda: string): ColumnaCotizaciones {
    return { tipo, titulo, ayuda, items: [], visibles: [], pagina: 0, total: 0, cargando: false, error: null, resumenFallo: false };
  }
}
