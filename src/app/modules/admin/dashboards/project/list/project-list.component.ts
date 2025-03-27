import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ProjectService } from '../project.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatMenuTrigger } from '@angular/material/menu';  // Importa MatMenuTrigger
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { HistorialComponent } from '../historial/historial.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-project-list',
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatPaginator,
    MatSort,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatMenuModule,
    MatSelectModule
  ]
})
export class ProjectListComponent implements OnInit {
  displayedColumns: string[] = ['id', 'nombre', 'categoria','estatus', 'fechaInicio', 'fechaFin', 'actions'];
  dataSource = new MatTableDataSource<any>();
  projectsCount: number = 0;
  searchText: string = '';
  permisosUsuario: any[] = [];
  vistaActual: string = '';
  permisosDisponibles: string[] = [];

  // Nuevas propiedades para manejo de filtros
  filterValue: string = '';
  currentFilterColumn: string = '';
  filterOptions = {
    categoria: ['Technology', 'Healthcare', 'Finance'],  // Ejemplo de opciones
    fechaInicio: ['2023-01-01'],
    fechaFin: ['2023-06-01'],
    estatus: ['Pendiente', 'Aprobada', 'Rechazada', 'En Proceso', 'Finalizada']
  };

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatMenuTrigger) menuTrigger: MatMenuTrigger;  // Añadir la referencia a MatMenuTrigger

  historialData: any[] = [];

  constructor(
    private projectService: ProjectService,
    private router: Router,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.vistaActual = this.router.url;
    this.getProjects();
    this.obtenerPermisos();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  getProjects(): void {
    this.projectService.getProjects().subscribe((projects) => {
      this.projectsCount = projects.length;
      this.dataSource = new MatTableDataSource(projects);
      this.dataSource.paginator = this.paginator;

      // Llenar filterOptions con las fechas obtenidas de los proyectos
      this.filterOptions.fechaInicio = [...new Set(projects.map(project => project.fechaInicio))];
      this.filterOptions.fechaFin = [...new Set(projects.map(project => project.fechaFin))];
      this.dataSource.sort = this.sort;

      // Establecer el filtro personalizado
      this.setCustomFilter();
    });
  }

  /**
   * Establece un filtro personalizado para la tabla
   */
  setCustomFilter(): void {
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      if (this.currentFilterColumn === 'nombre' || this.currentFilterColumn === 'categoria') {
        return data[this.currentFilterColumn]?.toLowerCase().includes(filter);
      } else if (this.currentFilterColumn === 'fechaInicio' || this.currentFilterColumn === 'fechaFin' || this.currentFilterColumn === 'estatus') {
        return data[this.currentFilterColumn] === this.filterValue;
      }
      return true;
    };
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
   * Aplica el filtro correspondiente basado en el tipo de columna.
   */
  applyFilter(): void {
    const filterValue = this.filterValue.trim().toLowerCase();
    this.dataSource.filter = filterValue;  // Aplica el filtro global
  }

  applySelect(): void {
    const filterValue = this.filterValue.trim().toLowerCase();
    this.dataSource.filter = filterValue;  // Aplica el filtro global
  }

  /**
   * Determina si el filtro es de tipo texto.
   */
  isTextFilter(column: string): boolean {
    return column === 'nombre' || column === 'categoria';
  }

  /**
   * Determina si el filtro es de tipo selección.
   */
  isSelectFilter(column: string): boolean {
    return column === 'estatus' || column === 'fechaInicio' || column === 'fechaFin';
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

  addProject(): void {
    this.router.navigate(['/dashboards/project/new']);
  }

  editProject(projectId: number): void {
    this.router.navigate([`/dashboards/project/${projectId}`]);
  }

  deleteProject(projectId: number): void {
    this.projectService.deleteProject(projectId).subscribe(() => {
      this.getProjects();
      this.snackBar.open('Proyecto eliminado correctamente', 'Cerrar', { duration: 3000 });
    });
  }

  obtenerPermisos(): void {
    const userInformation = localStorage.getItem('userInformation');
    if (!userInformation) {
      return;
    }

    const userData = JSON.parse(userInformation);
    this.permisosUsuario = userData.permisos.filter(
      (permiso) => permiso.vista.ruta === `${this.vistaActual}`
    );

    this.permisosDisponibles = this.permisosUsuario.map((permiso) => permiso.codigo);
  }

  tienePermiso(codigo: string): boolean {
    return this.permisosDisponibles.includes(codigo);
  }

  getHistorial(projectId: number): void {
    this.projectService.getHistorial(projectId).subscribe((historial) => {
      this.historialData = historial;

      this.dialog.open(HistorialComponent, {
        width: '700px',
        data: { historial }
      });
    });
  }
}