import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { QuotesService } from '../quotes-products.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { ChatNotificationService } from 'app/shared/components/chat-notification/chat-notification.service';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatMenuTrigger, MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import Swal from 'sweetalert2';
import { HistorialComponent } from '../historial/historial.component';
import { SendSurveyComponent } from '../send-survey/send-survey.component';
import { EtapaChipComponent } from '../sgc/etapa-chip/etapa-chip.component';
import { QuotesBoardComponent } from './quotes-board/quotes-board.component';
import { CotizacionDetalleDialogComponent } from '../cotizacion-detalle-dialog/cotizacion-detalle-dialog.component';
import { aplicarResumenSgc, tieneCapaSgc, puedeEliminarCotizacion } from './quotes-sgc-merge';
import moment from 'moment';

export type VistaCotizaciones = 'tablero' | 'lista';
const CLAVE_VISTA = 'cotizaciones.vista';

@Component({
  selector: 'app-quotes-list',
  templateUrl: './quotes-list.component.html',
  styleUrls: ["./quotes-list.component.scss"],
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatMenuModule,
    MatSelectModule,
    MatTooltipModule,
    MatButtonToggleModule,
    EtapaChipComponent,
    QuotesBoardComponent
  ]
})
export class QuoteListComponent implements OnInit, AfterViewInit, OnDestroy {
  displayedColumns: string[] = [
    'cotizacionProductosId',
    'tipo',
    'nombreCliente',
    'unidadDeNegocioNombre',
    'createdDate',
    'requisitosEspeciales',
    'total',
    'etapa',
    'probabilidad',
    'proximaAccion',
    'vigencia',
    'envio',
    'responsable',
    'estatus',
    'actions',
    'acciones'
  ];
  dataSource = new MatTableDataSource<any>();
  quotesCount: number = 0;
  searchText: string = '';
  permisosUsuario: any[] = [];
  vistaActual: string = '';
  permisosDisponibles: string[] = [];
  errorResumenSgc: boolean = false;

  todasLasQuotesDePagina: any[] = [];
  filtroEtapa: string = 'todas';
  filtroMarcas: string = 'todas';
  etapasFiltro: { codigo: string; nombre: string }[] = [
    { codigo: 'Borrador', nombre: 'Borrador' },
    { codigo: 'EnRevision', nombre: 'En revisión' },
    { codigo: 'Aprobada', nombre: 'Aprobada' },
    { codigo: 'Emitida', nombre: 'Emitida' },
    { codigo: 'EnSeguimiento', nombre: 'En seguimiento' },
    { codigo: 'Ganada', nombre: 'Ganada' },
    { codigo: 'Perdida', nombre: 'Perdida' },
    { codigo: 'Cancelada', nombre: 'Cancelada' },
    { codigo: 'Vencida', nombre: 'Vencida' },
    { codigo: 'CerradaSinRespuesta', nombre: 'Cerrada sin respuesta' }
  ];

  // Paginación y Filtro de Fecha
  pageSize: number = 10;
  pageIndex: number = 0;
  totalItems: number = 0;
  // Rango de fechas de creación (inclusivas): del primer día del mes en curso a hoy. Texto yyyy-MM-dd, como lo maneja
  // <input type="date">; guardado en propiedades (no en getters que creen fechas en cada lectura).
  fechaDesde: string = moment().startOf('month').format('YYYY-MM-DD');
  fechaHasta: string = moment().format('YYYY-MM-DD');
  errorFechas: string | null = null;

  // Vista: tablero por tipo (Comercial / Técnico-comercial / Estratégica) o la lista de siempre. Se recuerda por navegador.
  vista: VistaCotizaciones = this.leerVistaGuardada();
  // Fechas que ve el tablero: solo se actualizan cuando ya son válidas y la persona terminó de teclear.
  boardDesde: string = this.fechaDesde;
  boardHasta: string = this.fechaHasta;
  tableroRefresco: number = 0;
  private temporizadorFechas: any = null;
  private solicitudListado = 0;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatMenuTrigger) menuTrigger: MatMenuTrigger;  // Añadir la referencia a MatMenuTrigger
  @ViewChild(QuotesBoardComponent) boardComponent?: QuotesBoardComponent;

  currentFilterColumn: string = '';
  filterValue: string = '';
  filterOptions: any = {
    cotizacionProductosId: [],  // Ejemplo de opciones
    nombreCliente: [],
    unidadDeNegocioNombre: [],
    createdDate: [],
    requisitosEspeciales: [],
  };

  historialData: any[] = [];
  estatusList: any[] = [];
  constructor(
    private quotesService: QuotesService,
    private router: Router,
    private _chatNotificationService: ChatNotificationService,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private _changeDetectorRef: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.vistaActual = this.router.url;
    // El tablero pide sus propias páginas; la lista solo se carga cuando se está viendo.
    if (this.vista === 'lista') {
      this.getQuotes();
    }
    this.getEstatus();
    this.obtenerPermisos();
  }

  ngAfterViewInit() {
    // No asignamos paginator/sort aquí para evitar que Material sobrescriba la paginación del servidor
  }

  ngOnDestroy(): void {
    clearTimeout(this.temporizadorFechas);
  }

  getQuotes(): void {
    this.errorFechas = this.validarFechas();
    if (this.errorFechas) {
      return;
    }

    // Si llegan respuestas fuera de orden (se cambió la fecha mientras la anterior aún cargaba), solo vale la última
    const solicitud = ++this.solicitudListado;
    this.quotesService
      .getQuotesPorRango(this.pageIndex + 1, this.pageSize, this.fechaDesde || null, this.fechaHasta || null)
      .subscribe({
        next: (res: any) => {
          if (solicitud !== this.solicitudListado) {
            return;
          }
          if (res && res.code == 200) {
            const quotes = res.data;
            this.totalItems = res.totalCount || res.count || quotes.length;
            this.todasLasQuotesDePagina = [...quotes];
            this.aplicarFiltroEtapaInterno();
            this.quotesCount = this.totalItems;

            this.filterOptions.unidadDeNegocioNombre = [...new Set(
              quotes
                .map((quote: any) => quote.unidadDeNegocio?.nombre)
                .filter((nombre: any) => nombre !== null && nombre !== undefined)
            )];

            const ids = quotes
              .map((quote: any) => quote.cotizacionProductosId)
              .filter((id: any) => id != null && id > 0);

            if (ids.length > 0) {
              this.quotesService.resumenSgc(ids).subscribe({
                next: (resumenes) => {
                  if (solicitud !== this.solicitudListado) {
                    return;
                  }
                  if (resumenes && resumenes.length > 0) {
                    const mapResumen = new Map(resumenes.map((r) => [r.cotizacionProductosId, r]));
                    quotes.forEach((q: any) => {
                      const r = mapResumen.get(q.cotizacionProductosId);
                      if (r) {
                        aplicarResumenSgc(q, r);
                      }
                    });
                    this.todasLasQuotesDePagina = [...quotes];
                    this.aplicarFiltroEtapaInterno();
                    this._changeDetectorRef.markForCheck();
                  }
                },
                error: () => {
                  if (solicitud !== this.solicitudListado) {
                    return;
                  }
                  this.errorResumenSgc = true;
                  this._chatNotificationService.showWarning(
                    'Aviso',
                    'No se pudo cargar el resumen del SGC. Mostrando datos locales.'
                  );
                  this._changeDetectorRef.markForCheck();
                },
              });
            }

            this._changeDetectorRef.markForCheck();
          } else {
            this.mostrarErrorListado(res?.message);
          }
        },
        error: () => {
          if (solicitud === this.solicitudListado) {
            this.mostrarErrorListado(null);
          }
        },
      });
  }

  // Nunca en silencio: un listado que no cargó se avisa y deja la lista vacía (no la de otro rango)
  private mostrarErrorListado(mensaje?: string | null): void {
    this._chatNotificationService.showError('Error', mensaje || 'No se pudo cargar la lista de cotizaciones.', 5000);
    this.todasLasQuotesDePagina = [];
    this.dataSource.data = [];
    this.totalItems = 0;
    this.quotesCount = 0;
    this._changeDetectorRef.markForCheck();
  }

  private validarFechas(): string | null {
    for (const f of [this.fechaDesde, this.fechaHasta]) {
      if (!f) {
        continue;
      }
      const m = moment(f, 'YYYY-MM-DD', true);
      if (!m.isValid() || m.year() < 2000 || m.year() > 2100) {
        return 'Escribe fechas válidas (año entre 2000 y 2100).';
      }
    }
    if (this.fechaDesde && this.fechaHasta && this.fechaDesde > this.fechaHasta) {
      return 'La fecha inicial no puede ser posterior a la fecha final.';
    }
    return null;
  }

  onPageChange(event: any): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.getQuotes();
  }

  // Un <input type="date"> avisa en cada dígito que se teclea: se espera a que la persona termine antes de pedir
  onDateChange(): void {
    clearTimeout(this.temporizadorFechas);
    this.temporizadorFechas = setTimeout(() => {
      this.pageIndex = 0;
      this.errorFechas = this.validarFechas();
      if (!this.errorFechas) {
        // El tablero se recarga solo al cambiar estas fechas (ya validadas).
        this.boardDesde = this.fechaDesde;
        this.boardHasta = this.fechaHasta;
      }
      if (this.vista === 'lista') {
        this.getQuotes();
      }
      this._changeDetectorRef.markForCheck();
    }, 400);
  }

  cambiarVista(vista: VistaCotizaciones): void {
    if (vista === this.vista || (vista !== 'tablero' && vista !== 'lista')) {
      return;
    }
    this.vista = vista;
    try {
      localStorage.setItem(CLAVE_VISTA, vista);
    } catch {
      // Sin almacenamiento (ventana privada o bloqueado): la vista simplemente no se recuerda.
    }
    if (vista === 'lista') {
      this.getQuotes();
    }
    this._changeDetectorRef.markForCheck();
  }

  /** El tablero informa cuántas cotizaciones hay en total (suma de sus tres columnas) para el encabezado. */
  onTotalTablero(total: number): void {
    if (this.vista === 'tablero') {
      this.quotesCount = total;
      this._changeDetectorRef.markForCheck();
    }
  }

  private leerVistaGuardada(): VistaCotizaciones {
    try {
      return localStorage.getItem(CLAVE_VISTA) === 'lista' ? 'lista' : 'tablero';
    } catch {
      return 'tablero';
    }
  }

  abrirPicker(input: HTMLInputElement): void {
    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
      } else {
        input.focus();
      }
    } catch {
      input.focus();
    }
  }

  getEstatus(): void {
    this.quotesService.getEstatus().subscribe((res: any) => {
      if (res && res.code === 200) {
        this.estatusList = res.data;
      }
    });
  }

  onEstatusChange(quote: any, nuevoEstatusId: number): void {
    const estatusNuevo = this.estatusList.find(e => e.id === nuevoEstatusId);

    Swal.fire({
      title: '¿Cambiar estatus?',
      text: `¿Estás seguro de cambiar el estatus a "${estatusNuevo?.nombre || 'Nuevo'}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.quotesService.cambiarEstatus(quote.cotizacionProductosId, nuevoEstatusId).subscribe({
          next: (res: any) => {
            if (res.code === 200) {
              quote.estatus = nuevoEstatusId;
              this._chatNotificationService.showSuccess('Éxito', 'Estatus actualizado correctamente', 3000);
              this._changeDetectorRef.markForCheck();
            } else {
              this._chatNotificationService.showError('Error', 'Error al actualizar estatus', 3000);
              this.getQuotes();
            }
          },
          error: () => {
            this._chatNotificationService.showError('Error', 'Error de conexión', 3000);
            this.getQuotes();
          }
        });
      } else {
        this.getQuotes();
      }
    });
  }

  getStatusName(estatusId: number): string {
    const estatus = this.estatusList.find(e => e.id === estatusId);
    return estatus ? estatus.nombre : 'Sin Estatus';
  }

  getColorByEstatusId(estatusId: number): string {
    const nombre = this.getStatusName(estatusId).toLowerCase();
    if (nombre.includes('pendiente')) return '#FB275D';
    if (nombre.includes('proceso')) return '#FFCB00';
    if (nombre.includes('completad') || nombre.includes('finalizad') || nombre.includes('aprobada')) return '#00C875';
    if (nombre.includes('rechazad') || nombre.includes('cancelad')) return '#D9534F';
    return '#C4C4C4';
  }

  getFillColorByEstatusId(estatusId: number): string {
    const color = this.getColorByEstatusId(estatusId);
    return color + '15';
  }

  /**
   * Aplica el filtro correspondiente basado en el tipo de columna.
   */
  applyFilter(): void {
    this.setCustomFilter(); // Asegúrate de configurar el filtro antes
    this.dataSource.filter = this.filterValue.trim().toLowerCase(); // Se usa como input del predicate
  }

  applySelect(): void {
    this.setCustomFilter();
    this.dataSource.filter = this.filterValue.trim().toLowerCase();
  }

  addQuote(): void {
    this.router.navigate(['/dashboards/quote-products/new']);
  }

  editQuote(projectId: number): void {
    this.router.navigate([`/dashboards/quote-products/${projectId}`]);
  }

  tieneRegistroSgc(quote: any): boolean {
    return tieneCapaSgc(quote);
  }

  obtenerTextoFolio(quote: any): string {
    if (quote?.folio) {
      return quote.version && quote.version > 1 ? `${quote.folio} v${quote.version}` : quote.folio;
    }
    return `#${quote?.cotizacionProductosId ?? ''}`;
  }

  puedeEliminar(quote: any): boolean {
    return puedeEliminarCotizacion(quote);
  }

  filtrarPorEtapa(etapa: string): void {
    this.filtroEtapa = etapa;
    if (!this.todasLasQuotesDePagina || this.todasLasQuotesDePagina.length === 0) {
      this.todasLasQuotesDePagina = [...this.dataSource.data];
    }
    this.aplicarFiltroEtapaInterno();
    this._changeDetectorRef.markForCheck();
  }

  filtrarPorMarcas(marcas: string): void {
    this.filtroMarcas = marcas;
    if (!this.todasLasQuotesDePagina || this.todasLasQuotesDePagina.length === 0) {
      this.todasLasQuotesDePagina = [...this.dataSource.data];
    }
    this.aplicarFiltroEtapaInterno();
    this._changeDetectorRef.markForCheck();
  }

  irAIndicadores(): void {
    this.router.navigate(['/dashboards/quote-products/indicadores']);
  }

  formatearFechaSoloDia(fechaStr?: string | Date | null): string {
    if (!fechaStr) {
      return '—';
    }
    const parte = String(fechaStr).substring(0, 10);
    const pedazos = parte.split('-');
    if (pedazos.length === 3) {
      return `${pedazos[2]}/${pedazos[1]}/${pedazos[0]}`;
    }
    return parte;
  }

  private aplicarFiltroEtapaInterno(): void {
    let filtradas = [...this.todasLasQuotesDePagina];

    if (this.filtroEtapa && this.filtroEtapa !== 'todas') {
      filtradas = filtradas.filter((q) => q.etapa === this.filtroEtapa);
    }

    if (this.filtroMarcas === 'vencidas') {
      filtradas = filtradas.filter((q) => !!q.vencida);
    } else if (this.filtroMarcas === 'atrasadas') {
      filtradas = filtradas.filter((q) => !!q.seguimientoAtrasado);
    }

    this.dataSource.data = filtradas;
  }

  async deleteQuote(projectId: number, quote?: any) {
    const cotizacion = quote
      || this.todasLasQuotesDePagina.find(q => q.cotizacionProductosId === projectId)
      || this.boardComponent?.buscarPorId(projectId);
    const confirmed = await this.showConfirmation(cotizacion);
    if (confirmed) {
      this.quotesService.deleteQuote(projectId).subscribe({
        next: (res: any) => {
          if (!res || res.code == 200) {
            this.getQuotes();
            this.tableroRefresco++;
            this._chatNotificationService.showSuccess('Éxito', 'Cotización eliminada correctamente.', 3000);
          } else {
            const msg = res?.mensaje || res?.message || 'Hubo un error en el sistema, contacte al administrador del sistema.';
            this._chatNotificationService.showError('Error', msg, 5000);
          }
        },
        error: (err: any) => {
          const msgApi = err?.status === 409 ? (err?.error?.mensaje || err?.error?.message) : null;
          const msg = msgApi || 'Hubo un error al eliminar la cotización.';
          this._chatNotificationService.showError('Error', msg, 5000);
        }
      });
    }
  }

  obtenerPermisos(): void {
    // Obtener userInformation desde localStorage
    const userInformation = localStorage.getItem('userInformation');
    if (!userInformation) {
      console.warn('No se encontró información de usuario en localStorage.');
      return;
    }

    const userData = JSON.parse(userInformation);

    // Obtener la ruta actual
    // Filtrar permisos que correspondan a la vista actual
    this.permisosUsuario = userData.permisos.filter(
      (permiso) => permiso.vista.ruta === `${this.vistaActual}`
    );

    // Guardar los códigos de los permisos en un array
    this.permisosDisponibles = this.permisosUsuario.map((permiso) => permiso.codigo);
  }

  tienePermiso(codigo: string): boolean {
    return this.permisosDisponibles.includes(codigo);
  }

  /**
   * Abre el menú de filtro para la columna especificada.
   * Evita que se abran múltiples menús al mismo tiempo.
   */
  openFilterMenu(column: string): void {
    this.currentFilterColumn = column;
    this.filterValue = '';  // Resetea el valor del filtro cuando se abre un nuevo menú
  }

  /**
   * Establece un filtro personalizado para la tabla
   */
  setCustomFilter(): void {
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      if (this.currentFilterColumn) {
        const column = this.currentFilterColumn;

        if (column === 'unidadDeNegocioNombre') {
          return data.unidadDeNegocio?.nombre?.toLowerCase() === filter.toLowerCase();
        }

        if (column === 'createdDate') {
          return data.createdDate === filter;
        }

        if (column === 'cotizacionProductosId') {
          const matchId = data.cotizacionProductosId?.toString().toLowerCase().includes(filter);
          const matchFolio = data.folio?.toString().toLowerCase().includes(filter);
          return !!(matchId || matchFolio);
        }

        if (this.isTextFilter(column)) {
          return data[column]?.toString().toLowerCase().includes(filter);
        }

        return false;
      } else {
        // Filtro global en todos los campos visibles incluyendo folio
        if (data.folio?.toString().toLowerCase().includes(filter)) {
          return true;
        }
        return this.displayedColumns.some((col) => {
          const value = col === 'unidadDeNegocioNombre'
            ? data.unidadDeNegocio?.nombre
            : data[col];
          return value?.toString().toLowerCase().includes(filter);
        });
      }
    };
  }


  /**
   * Determina si el filtro es de tipo texto.
   */
  isTextFilter(column: string): boolean {
    return column === 'nombreCliente' || column === 'requisitosEspeciales' || column === 'cotizacionProductosId';
  }

  /**
   * Determina si el filtro es de tipo selección.
   */
  isSelectFilter(column: string): boolean {
    return column === 'unidadDeNegocioNombre' || column === 'createdDate';
  }

  /**
   * Obtiene las opciones de filtro para la columna seleccionada.
   */
  getFilterOptions(column: string): string[] {
    return this.filterOptions[column] || [];
  }

  resetFilter(): void {
    // Restablecer el valor del filtro
    this.filterValue = null;  // Esto puede ajustarse según la lógica de tu filtro (por ejemplo, "" para texto vacío)

    // Limpiar el filtro global (en dataSource)
    this.dataSource.filter = '';  // Esto elimina el filtro aplicado


    // Si necesitas que se apliquen cambios adicionales (por ejemplo, restablecer otras partes del estado del filtro),
    // puedes llamar a las funciones applyFilter() o applySelect() con valores vacíos.
    this.applyFilter();  // Aplica filtro vacío si es necesario (esto dependerá de cómo se maneje en tu aplicación)
  }

  showConfirmation(quote?: any): Promise<boolean> {
    let text = 'Esta acción no se puede revertir.';
    if (quote && !this.tieneRegistroSgc(quote)) {
      text += ' Si esta cotización sigue en CONTPAQ dentro de los últimos 15 días, la próxima sincronización la volverá a traer.';
    }
    if (quote?.requerimientoFolio) {
      text += ` El requerimiento ${quote.requerimientoFolio} conservará el aviso de la eliminación en su historial.`;
    }
    return Swal.fire({
      title: 'Seguro que desea eliminar',
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
    }).then((result) => {
      return result.isConfirmed;
    });
  }

  getHistorial(cotizacionId: number): void {
    this.quotesService.getHistorial(cotizacionId).subscribe((res: any) => {
      if (res.code == 200) {
        var historial: any = res.data;
        this.historialData = historial;

        this.dialog.open(HistorialComponent, {
          width: '700px',
          data: { historial }
        });
      }
      else {
        this._chatNotificationService.showError('Error', 'Hubo un error en el sistema, contacte al administrador del sistema.', 5000);
      }
    });
  }

  verDetalle(quote: any): void {
    this.dialog.open(CotizacionDetalleDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: {
        cotizacionProductosId: quote.cotizacionProductosId,
        informativa: quote.informativa ?? !this.tieneRegistroSgc(quote),
        unidadNombre: quote.unidadDeNegocio?.nombre || quote.unidadDeNegocioNombre || null
      }
    });
  }

  enviarEncuesta(quote: any): void {
    const dialogRef = this.dialog.open(SendSurveyComponent, {
      width: '500px',
      data: {
        nombre: quote.nombreCliente || null,
        telefono: quote.telefono || null,
        email: quote.correo,
        cargo: null,
        sucursal: null
      }
    });

    dialogRef.afterClosed().subscribe((data: any) => {
      const dto = {
        email: data.email,
        clienteNombre: data.nombre || '',
        empresaNombre: quote.nombreEmpresa || '',
        urlEncuesta: `https://mmarlonm.github.io/jringenieria/#/survey-productos/${quote.cotizacionProductosId}`,
        telefono: data.telefono || '',
        unidadDeNegocioId: data.sucursal || 0,
        cotizacionProductosId: quote.cotizacionProductosId || 0
      };

      this.quotesService.enviarEncuesta(dto).subscribe({
        next: () => {
          this._chatNotificationService.showSuccess('Encuesta enviada', 'Se envió correctamente al cliente.', 5000);
        },
        error: () => {
          this._chatNotificationService.showError('Error', 'No se pudo enviar la encuesta. Intenta más tarde.', 5000);
        }
      });
    });
  }
}