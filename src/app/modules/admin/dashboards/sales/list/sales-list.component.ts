import { Component, OnInit, ViewChild, AfterViewInit} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { SalesService } from '../sales.services';
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
import Swal from 'sweetalert2';

@Component({
  selector: 'app-sales-list',
  templateUrl: './sales-list.component.html',
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
export class SalesListComponent implements OnInit,AfterViewInit {
  // Actualiza las columnas para reflejar los datos que necesitas mostrar
  displayedColumns: string[] = [
    'ventaId', 
    'fecha', 
    'serie', 
    'folio', 
    'total', 
    'pendiente', 
    'clienteNombre', 
    'usuarioNombre', 
    'formaDePagoDescripcion', 
    'unidadDeNegocioNombre',
    'actions'
  ];

  dataSource = new MatTableDataSource<any>();
  ventasCount: number = 0;
  searchText: string = '';
  permisosUsuario: any[] = [];
  vistaActual: string = '';
  permisosDisponibles: string[] = [];

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private salesService: SalesService,
    private router: Router,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.vistaActual = this.router.url;
    this.getVentas();
    this.obtenerPermisos();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.dataSource.sort = this.sort;
      this.dataSource.paginator = this.paginator;
    },1200);
  }

getVentas(): void {
  this.salesService.getVentas().subscribe((res:any) => {
    if(res.code==200){
    var ventas = res.data;
    this.ventasCount = ventas.length;
    this.dataSource.data = ventas; // ✅ solo actualizar los datos

    // 🔁 Reasignar el sort/paginator para asegurarte de que siguen vivos
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;

    // 👇 Importante: si estás ordenando por campos numéricos o fechas
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'fecha': return new Date(item.fecha);
        case 'total': return +item.total;
        case 'pendiente': return +item.pendiente;
        default: return item[property];
      }
    };
  }else{
            Swal.fire({
              icon: "error",
              title:"Opps",
              text:"Hubo un error en el sistema, contacte al administrador del sistema.",
              draggable: true
            });
  }
  });
}

  applyFilter(e): void {
    this.dataSource.filter = e.target.value.trim().toLowerCase();
  }

  addVenta(): void {
    this.router.navigate(['/dashboards/sales/new']);
  }

  editVenta(ventaId: number): void {
    this.router.navigate([`/dashboards/sales/${ventaId}`]);
  }

  async deleteVenta(ventaId: number){
    const confirmed = await this.showConfirmation();
    if(confirmed){
    this.salesService.deleteVenta(ventaId).subscribe((res:any) => {
      if(res.code == 200){
      this.getVentas();
      this.snackBar.open('Venta eliminada correctamente', 'Cerrar', { duration: 3000 });
      }
      else{
        Swal.fire({
                  icon: "error",
                  title:"Opps",
                  text:"Hubo un error en el sistema, contacte al administrador del sistema.",
                  draggable: true
                });
      }
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
      (permiso) => permiso.vista.ruta === `${this.vistaActual}`
    );

    this.permisosDisponibles = this.permisosUsuario.map((permiso) => permiso.codigo);
  }

  tienePermiso(codigo: string): boolean {
    return this.permisosDisponibles.includes(codigo);
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