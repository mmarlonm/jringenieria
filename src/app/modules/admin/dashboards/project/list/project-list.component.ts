import { Component, OnInit, ViewChild, AfterViewInit } from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";
import { ProjectService } from "../project.service";
import { MatTableDataSource } from "@angular/material/table";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { MatMenuTrigger } from "@angular/material/menu"; // Importa MatMenuTrigger
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatMenuModule } from "@angular/material/menu";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatTableModule } from "@angular/material/table";
import { MatSelectModule } from "@angular/material/select";
import { HistorialComponent } from "../historial/historial.component";
import { MatDialog } from "@angular/material/dialog";
import { reverse } from "lodash";
import Swal from "sweetalert2";
import { SendSurveyDialogComponent } from '@fuse/components/email/send-survey-dialog.component';

@Component({
  selector: "app-project-list",
  templateUrl: "./project-list.component.html",
  styleUrls: ["./project-list.component.scss"],
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
    MatSelectModule,
  ],
})
export class ProjectListComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = [
    "id",
    "nombre",
    "categoria",
    "estatus",
    "fechaInicio",
    "fechaFin",
    "actions",
  ];
  dataSource = new MatTableDataSource<any>();
  projectsCount: number = 0;
  searchText: string = "";
  permisosUsuario: any[] = [];
  vistaActual: string = "";
  permisosDisponibles: string[] = [];

  // Nuevas propiedades para manejo de filtros
  filterValue: string = "";
  currentFilterColumn: string = "";
  filterOptions: any = {
    categoria: ["Technology", "Healthcare", "Finance"], // Ejemplo de opciones
    fechaInicio: ["2023-01-01"],
    fechaFin: ["2023-06-01"],
    estatus: ["Pendiente", "Aprobada", "Rechazada", "En Proceso", "Finalizada"],
  };

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatMenuTrigger) menuTrigger: MatMenuTrigger; // Añadir la referencia a MatMenuTrigger

  historialData: any[] = [];

  constructor(
    private projectService: ProjectService,
    private router: Router,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.vistaActual = this.router.url;
    this.getProjects();
    this.obtenerPermisos();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.dataSource.sort = this.sort;
      this.dataSource.paginator = this.paginator;
    }, 1200);
  }

  getProjects(): void {
    this.projectService.getProjects().subscribe((projects: any) => {
      if (projects.code == 200) {
        this.projectsCount = projects.data.length;
        this.dataSource = new MatTableDataSource(projects.data);
        this.dataSource.paginator = this.paginator;

        // Llenar filterOptions con las fechas obtenidas de los proyectos
        this.filterOptions.fechaInicio = [
          ...new Set(projects.data.map((project) => project.fechaInicio)),
        ];
        this.filterOptions.fechaFin = [
          ...new Set(projects.data.map((project) => project.fechaFin)),
        ];
        this.dataSource.sort = this.sort;

        // Establecer el filtro personalizado
        this.setCustomFilter();
      } else {
        this.snackBar.open(
          projects.message || "Error al obtener los proyectos",
          "Cerrar",
          {
            duration: 3000,
            panelClass: ["snackbar-error"],
          }
        );
      }
    });
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
   * Abre el menú de filtro para la columna especificada.
   * Evita que se abran múltiples menús al mismo tiempo.
   */
  openFilterMenu(column: string): void {
    this.currentFilterColumn = column;
    this.filterValue = ""; // Resetea el valor del filtro cuando se abre un nuevo menú
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

  /**
   * Determina si el filtro es de tipo texto.
   */
  isTextFilter(column: string): boolean {
    return column === "nombre" || column === "categoria";
  }

  /**
   * Determina si el filtro es de tipo selección.
   */
  isSelectFilter(column: string): boolean {
    return (
      column === "estatus" || column === "fechaInicio" || column === "fechaFin"
    );
  }

  /**
   * Obtiene las opciones de filtro para la columna seleccionada.
   */
  getFilterOptions(column: string): string[] {
    return this.filterOptions[column] || [];
  }

  resetFilter(): void {
    // Restablecer el valor del filtro
    this.filterValue = null; // Esto puede ajustarse según la lógica de tu filtro (por ejemplo, "" para texto vacío)

    // Limpiar el filtro global (en dataSource)
    this.dataSource.filter = ""; // Esto elimina el filtro aplicado

    // Si necesitas que se apliquen cambios adicionales (por ejemplo, restablecer otras partes del estado del filtro),
    // puedes llamar a las funciones applyFilter() o applySelect() con valores vacíos.
    this.applyFilter(); // Aplica filtro vacío si es necesario (esto dependerá de cómo se maneje en tu aplicación)
  }

  addProject(): void {
    this.router.navigate(["/dashboards/project/new"]);
  }

  editProject(projectId: number): void {
    this.router.navigate([`/dashboards/project/${projectId}`]);
  }

  async deleteProject(projectId: number) {
    const confirmed = await this.showConfirmation();
    if (confirmed) {
      this.projectService.deleteProject(projectId).subscribe(() => {
        this.getProjects();
        this.snackBar.open("Proyecto eliminado correctamente", "Cerrar", {
          duration: 3000,
        });
      });
    }
  }

  obtenerPermisos(): void {
    const userInformation = localStorage.getItem("userInformation");
    if (!userInformation) {
      return;
    }

    const userData = JSON.parse(userInformation);
    this.permisosUsuario = userData.permisos.filter(
      (permiso) => permiso.vista.ruta === `${this.vistaActual}`
    );

    this.permisosDisponibles = this.permisosUsuario.map(
      (permiso) => permiso.codigo
    );
  }

  tienePermiso(codigo: string): boolean {
    return this.permisosDisponibles.includes(codigo);
  }

  getHistorial(projectId: number): void {
    this.projectService.getHistorial(projectId).subscribe((historial) => {
      this.historialData = historial;

      this.dialog.open(HistorialComponent, {
        width: "700px",
        data: { historial },
      });
    });
  }

  showConfirmation(): Promise<boolean> {
    return Swal.fire({
      title: "Seguro que desea eliminar",
      text: "Esta accion no se puede revertir",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
    }).then((result) => {
      return result.isConfirmed;
    });
  }

  enviarEncuesta(project: any): void {
  const dialogRef = this.dialog.open(SendSurveyDialogComponent, {
    width: '500px',
    data: { proyectoId: project.proyectoId }
  });

  dialogRef.afterClosed().subscribe((emails: string[]) => {
    if (emails && emails.length > 0) {
      const dto = {
        emails: emails,
        clienteNombre: project.clienteNombre || '',
        proyectoNombre: project.nombre || '',
        urlEncuesta: `https://mmarlonm.github.io/jringenieria/#/survey/${project.proyectoId}`
      };

      this.projectService.enviarEncuesta(dto).subscribe({
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
    }
  });
}

}
