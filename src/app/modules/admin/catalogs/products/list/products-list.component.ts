import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ProductsService } from '../products.service';
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
  selector: 'app-products-list',
  templateUrl: './products-list.component.html',
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
export class ProductsListComponent implements OnInit {
  displayedColumns: string[] = [
    'productoId',
    'codigoProducto',
    'nombreProducto',
    'acciones'
  ];
  dataSource = new MatTableDataSource<any>();
  productsCount: number = 0;
  searchText: string = '';
  permisosUsuario: any[] = [];
  vistaActual: string = '';
  permisosDisponibles: string[] = [];

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private productsService: ProductsService,
    private router: Router,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.vistaActual = this.router.url;
    this.getProducts();
    this.obtenerPermisos();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  getProducts(): void {
    this.productsService.getProduct().subscribe((Products) => {
      this.productsCount = Products.length;
      this.dataSource = new MatTableDataSource(Products);
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

  addProduct(): void {
    this.router.navigate(['/catalogs/products/new']); // Ajustado a la ruta correcta
  }

  editProduct(ProductId: number): void {
    this.router.navigate([`/catalogs/products/${ProductId}`]); // Ajustado a la ruta correcta
  }

  deleteProduct(ProductId: number): void {
    this.productsService.deleteProduct(ProductId).subscribe(() => {
      this.getProducts();
      this.snackBar.open('Producto eliminado correctamente', 'Cerrar', { duration: 3000 });
    });
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
    this.productsService.uploadExcel(formData).subscribe(() => {
      this.getProducts();
      this.snackBar.open('Productos importados exitosamente', 'Cerrar', { duration: 3000 });
    });
  }

  tienePermiso(codigo: string): boolean {
    return this.permisosDisponibles.includes(codigo);
  }
}