import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ClientsService } from '../clients.service';
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
import Swal from "sweetalert2";


@Component({
  selector: 'app-clients-list',
  templateUrl: './clients-list.component.html',
  styleUrls: ["./clients-list.component.scss"],
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
export class ClientsListComponent implements OnInit {
  displayedColumns: string[] = ['clienteId', 'nombre', 'telefono', 'email', 'empresa', 'acciones'];
  dataSource = new MatTableDataSource<any>();
  clientsCount: number = 0;
  searchText: string = '';
  permisosUsuario: any[] = [];
  vistaActual: string = '';
  permisosDisponibles: string[] = [];

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private clientsService: ClientsService,
    private router: Router,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.vistaActual = this.router.url;
    this.getClients();
    this.obtenerPermisos();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  getClients(): void {
    this.clientsService.getClient().subscribe((clients) => {
      this.clientsCount = clients.length;
      this.dataSource = new MatTableDataSource(clients);
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

  addClient(): void {
    this.router.navigate(['/catalogs/clients/new']); // Ajustado a la ruta correcta
  }

  editClient(clientId: number): void {
    this.router.navigate([`/catalogs/clients/${clientId}`]); // Ajustado a la ruta correcta
  }

  async deleteClient(clientId: number) {
    const confirmed = await this.showConfirmation();
    if (confirmed) {
      this.clientsService.deleteClient(clientId).subscribe(() => {
        this.getClients();
        this.snackBar.open("Proyecto eliminado correctamente", "Cerrar", {
          duration: 3000,
        });
      });
    }
  }

  obtenerPermisos(): void {
    const userInformation = localStorage.getItem('userInformation');
    if (!userInformation) {
      console.warn('No se encontró información de usuario en localStorage.');
      return;
    }

    const userData = JSON.parse(userInformation);

    this.permisosUsuario = userData.permisos.filter(
      (permiso) => permiso.vista.ruta === this.vistaActual
    );

    this.permisosDisponibles = this.permisosUsuario.map((permiso) => permiso.codigo);
  }


  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.uploadFile(file);
    }
  }

  // Método para subir el archivo a la API
  uploadFile(file: File): void {
    const formData = new FormData();
    formData.append('file', file, file.name);

    // Realiza la petición HTTP POST al endpoint de la API
    this.clientsService.uploadExcel(formData).subscribe(() => {
      this.getClients();
      this.snackBar.open('Clientes importados exitosamente', 'Cerrar', { duration: 3000 });
    });
  }

  tienePermiso(codigo: string): boolean {
    return this.permisosDisponibles.includes(codigo);
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
}