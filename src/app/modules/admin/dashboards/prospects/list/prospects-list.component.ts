import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ProspectosService } from '../prospects.services';
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
  selector: 'app-prospects-list',
  templateUrl: './prospects-list.component.html',
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
export class ProspectListComponent implements OnInit {
  displayedColumns: string[] = [
    'prospectoId',
    'tipoEmpresa',
    'empresa',
    'fechaRegistro',
    'email',
    'actions'
  ];
  dataSource = new MatTableDataSource<any>();
  prospectsCount: number = 0;
  searchText: string = '';
  permisosUsuario: any[] = [];
  vistaActual: string = '';
  permisosDisponibles: string[] = [];

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private prospectosService: ProspectosService,
    private router: Router,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.vistaActual = this.router.url;
    this.getProspects();
    this.obtenerPermisos();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  getProspects(): void {
    this.prospectosService.getProspectos().subscribe((prospects) => {
      this.prospectsCount = prospects.length;
      this.dataSource = new MatTableDataSource(prospects);
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

  addProspects(): void {
    this.router.navigate(['/dashboards/prospects/new']);
  }

  editProspects(prospectId: number): void {
    this.router.navigate([`/dashboards/prospects/${prospectId}`]);
  }

  deleteQuote(prospectId: number): void {
    this.prospectosService.deleteProspecto(prospectId).subscribe(() => {
      this.getProspects();
      this.snackBar.open('Prospecto eliminado correctamente', 'Cerrar', { duration: 3000 });
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
}