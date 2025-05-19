import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { QuotesService } from '../quotes.service';
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
import { MatMenuTrigger } from '@angular/material/menu';  // Importa MatMenuTrigger
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { HistorialComponent } from '../historial/historial.component';
import Swal from 'sweetalert2';
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
    MatSelectModule
  ]
})
export class QuoteListComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = [
    'cotizacionId',
    'nombreCliente',
    'empresa',
    'fechaEntrega',
    'estatus',
    'actions'
  ];
  dataSource = new MatTableDataSource<any>();
  quotesCount: number = 0;
  searchText: string = '';
  permisosUsuario: any[] = [];
  vistaActual: string = '';
  permisosDisponibles: string[] = [];

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatMenuTrigger) menuTrigger: MatMenuTrigger;  // Añadir la referencia a MatMenuTrigger

  currentFilterColumn: string = '';
  filterValue: string = '';
  filterOptions:any = {
    empresa: ["Technology"],  // Ejemplo de opciones
    fechaEntrega: ["2023-01-01"],
    estatus: ['Pendiente', 'Aprobada', 'Rechazada', 'En Proceso', 'Finalizada']
  };

  historialData: any[] = [];
  constructor(
    private quotesService: QuotesService,
    private router: Router,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.vistaActual = this.router.url;
    this.getQuotes();
    this.obtenerPermisos();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.dataSource.sort = this.sort;
      this.dataSource.paginator = this.paginator;
    },1200);
  }

  getQuotes(): void {
    this.quotesService.getQuotes().subscribe((res:any) => {
      if (res) {
        if(res.code==200){
          var quotes:any = res.data;
    
      this.quotesCount = quotes.length;
      this.dataSource = new MatTableDataSource(quotes);
      this.dataSource.paginator = this.paginator;

      this.filterOptions.fechaEntrega = [...new Set(
        quotes
          .map(quote => quote.fechaEntrega)
          .filter(fecha => fecha !== null && fecha !== undefined) // Filtra null y undefined
      )];
      this.dataSource.sort = this.sort;

      this.setCustomFilter();
        }
      }
    });
  
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
    this.router.navigate(['/dashboards/quote/new']);
  }

  editQuote(projectId: number): void {
    this.router.navigate([`/dashboards/quote/${projectId}`]);
  }

  async deleteQuote(projectId: number){
    const confirmed = await this.showConfirmation();
    if(confirmed){

    this.quotesService.deleteQuote(projectId).subscribe((res) => {
      if(res.code==200){
        this.getQuotes();
        this.snackBar.open('Cotizacion eliminada correctamente', 'Cerrar', { duration: 3000 });    
      }
    else{
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
        // Filtro por columna específica
        if (this.isTextFilter(this.currentFilterColumn)) {
          return data[this.currentFilterColumn]?.toLowerCase().includes(filter);
        } else {
          return data[this.currentFilterColumn] === this.filterValue;
        }
      } else {
        // Filtro global en todos los campos visibles
        return this.displayedColumns.some((col) => {
          return data[col]?.toString().toLowerCase().includes(filter);
        });
      }
    };
  }

  /**
   * Determina si el filtro es de tipo texto.
   */
  isTextFilter(column: string): boolean {
    return column === 'empresa';
  }

  /**
   * Determina si el filtro es de tipo selección.
   */
  isSelectFilter(column: string): boolean {
    return column === 'estatus' || column === 'fechaEntrega';
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

  getHistorial(cotizacionId: number): void {
      this.quotesService.getHistorial(cotizacionId).subscribe((res:any) => {
        if(res.code==200)
        {
        var historial:any=res.data;
        this.historialData = historial;
  
        this.dialog.open(HistorialComponent, {
          width: '700px',
          data: { historial }
        });
        }
        else{
          this.snackBar.open('Hubo un error en el sistema, contacte al administrador del sistema.', 'Cerrar', {
            duration: 3000,
            panelClass: ['snackbar-error']
          });
        }
      });
    }
    showConfirmation(): Promise<boolean>{
        return Swal.fire({
          title:'Seguro que desea eliminar',
          text:'Esta accion no se puede revertir',
          icon:'warning',
          showCancelButton:true,
          confirmButtonText:'Eliminar',
          cancelButtonText:'Cancelar',
          reverseButtons:true,
        }).then((result)=> {
          return result.isConfirmed;
        });
      }
}