import { Component, OnInit, ViewChild } from '@angular/core';
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

@Component({
  selector: 'app-quotes-list',
  templateUrl: './quotes-list.component.html',
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
    FormsModule
  ]
})
export class QuoteListComponent implements OnInit {
  displayedColumns: string[] = [
    'cotizacionId',
    'cliente',
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

  constructor(
    private quotesService: QuotesService,
    private router: Router,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.vistaActual = this.router.url;
    this.getQuotes();
    this.obtenerPermisos();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  getQuotes(): void {
    this.quotesService.getQuotes().subscribe((quotes) => {
      this.quotesCount = quotes.length;
      this.dataSource = new MatTableDataSource(quotes);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    });
  }

  /**
   * Aplica el filtro de búsqueda en la tabla.
   */
  applyFilter(e): void {
    this.dataSource.filter = e.target.value.trim().toLowerCase();
  }

  addQuote(): void {
    this.router.navigate(['/dashboards/quote/new']);
  }

  editQuote(projectId: number): void {
    this.router.navigate([`/dashboards/quote/${projectId}`]);
  }

  deleteQuote(projectId: number): void {
    this.quotesService.deleteQuote(projectId).subscribe(() => {
      this.getQuotes();
      this.snackBar.open('Cotizacion eliminada correctamente', 'Cerrar', { duration: 3000 });
    });
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
    console.log("vista actual ", this.vistaActual);
    console.log("permisos  ", userData.permisos);
    // Filtrar permisos que correspondan a la vista actual
    this.permisosUsuario = userData.permisos.filter(
      (permiso) => permiso.vista.ruta === `${this.vistaActual}`
    );

    // Guardar los códigos de los permisos en un array
    this.permisosDisponibles = this.permisosUsuario.map((permiso) => permiso.codigo);

    console.log('Permisos de esta vista:', this.permisosDisponibles);
  }

  tienePermiso(codigo: string): boolean {
    return this.permisosDisponibles.includes(codigo);
  }
}