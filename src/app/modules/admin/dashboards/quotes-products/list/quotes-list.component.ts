import { Component, OnInit, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { QuotesService } from '../quotes-products.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatMenuTrigger, MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import Swal from 'sweetalert2';
import { HistorialComponent } from '../historial/historial.component';
import { SendSurveyComponent } from '../send-survey/send-survey.component';
import moment from 'moment';

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
    MatDatepickerModule,
    MatNativeDateModule
  ]
})
export class QuoteListComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = [
    'cotizacionProductosId',
    'nombreCliente',
    'unidadDeNegocioNombre',
    'createdDate',
    'requisitosEspeciales',
    'total',
    'estatus',
    'actions'
  ];
  dataSource = new MatTableDataSource<any>();
  quotesCount: number = 0;
  searchText: string = '';
  permisosUsuario: any[] = [];
  vistaActual: string = '';
  permisosDisponibles: string[] = [];

  // Paginación y Filtro de Fecha
  pageSize: number = 10;
  pageIndex: number = 0;
  totalItems: number = 0;
  filtroFecha: Date = new Date();
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatMenuTrigger) menuTrigger: MatMenuTrigger;  // Añadir la referencia a MatMenuTrigger

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
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private _changeDetectorRef: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.vistaActual = this.router.url;
    this.getQuotes();
    this.getEstatus();
    this.obtenerPermisos();
  }

  ngAfterViewInit() {
    // No asignamos paginator/sort aquí para evitar que Material sobrescriba la paginación del servidor
  }

  getQuotes(): void {
    const fechaString = moment(this.filtroFecha).format('YYYY-MM-DD');
    this.quotesService.getQuotes(this.pageIndex + 1, this.pageSize, fechaString).subscribe((res: any) => {
      if (res && res.code == 200) {
        const quotes = res.data;
        this.totalItems = res.totalCount || res.count || quotes.length;
        this.dataSource.data = quotes;
        this.quotesCount = this.totalItems;

        this.filterOptions.unidadDeNegocioNombre = [...new Set(
          quotes
            .map(quote => quote.unidadDeNegocio?.nombre)
            .filter(nombre => nombre !== null && nombre !== undefined)
        )];
        this._changeDetectorRef.markForCheck();
      }
    });
  }

  onPageChange(event: any): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.getQuotes();
  }

  onDateChange(): void {
    this.pageIndex = 0;
    this.getQuotes();
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
              this.snackBar.open('Estatus actualizado correctamente', 'Cerrar', { duration: 3000 });
              this._changeDetectorRef.markForCheck();
            } else {
              this.snackBar.open('Error al actualizar estatus', 'Cerrar', { duration: 3000 });
              this.getQuotes();
            }
          },
          error: () => {
            this.snackBar.open('Error de conexión', 'Cerrar', { duration: 3000 });
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

  async deleteQuote(projectId: number) {
    const confirmed = await this.showConfirmation();
    if (confirmed) {

      this.quotesService.deleteQuote(projectId).subscribe((res) => {
        if (res.code == 200) {
          this.getQuotes();
          this.snackBar.open('Cotizacion eliminada correctamente', 'Cerrar', { duration: 3000 });
        }
        else {
          this.snackBar.open('Hubo un error en el sistema, contacte al administrador del sistema.', 'Cerrar', {
            duration: 3000,
            panelClass: ['snackbar-error']
          });
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

        if (this.isTextFilter(column)) {
          return data[column]?.toString().toLowerCase().includes(filter);
        }

        return false;
      } else {
        // Filtro global en todos los campos visibles
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

  showConfirmation(): Promise<boolean> {
    return Swal.fire({
      title: 'Seguro que desea eliminar',
      text: 'Esta accion no se puede revertir',
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
        this.snackBar.open('Hubo un error en el sistema, contacte al administrador del sistema.', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-error']
        });
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
          Swal.fire({
            icon: 'success',
            title: 'Encuesta enviada',
            text: 'Se envió correctamente al cliente.',
          });
        },
        error: () => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo enviar la encuesta. Intenta más tarde.',
          });
        }
      });
    });
  }
}