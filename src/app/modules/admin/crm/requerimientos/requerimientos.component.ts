import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RequerimientosService, Requerimiento, RequerimientoKpi } from './requerimientos.service';
import { LeadsService } from '../leads/leads.service';
import { RequerimientoDialogComponent } from './requerimiento-dialog/requerimiento-dialog.component';
import { RequerimientoCalificarDialogComponent } from './requerimiento-calificar-dialog/requerimiento-calificar-dialog.component';
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-requerimientos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    MatButtonToggleModule,
    MatSnackBarModule
  ],
  templateUrl: './requerimientos.component.html',
  styles: [`
    .kanban-col {
      min-height: 480px;
    }
  `]
})
export class RequerimientosComponent implements OnInit {
  requerimientos: Requerimiento[] = [];
  filteredRequerimientos: Requerimiento[] = [];
  usuarios: any[] = [];
  viewMode: 'kanban' | 'list' = 'kanban';
  kpis: RequerimientoKpi = {
    tasaCalificacionCorrecta: 0,
    tiempoPromedioCalificacionHoras: 0,
    porcentajeDevueltos: 0,
    porcentajeCompletos: 0,
    totalRequerimientos: 0
  };

  // Filtros
  searchControl = new FormControl('');
  sucursalControl = new FormControl('Todos');
  estatusControl = new FormControl('Todos');
  agenteControl = new FormControl('Todos');

  displayedColumns = [
    'folio', 'nombreContacto', 'empresa', 'sucursal', 
    'fechaRecepcion', 'estatus', 'viabilidad', 'rutaAtencion', 'acciones'
  ];

  constructor(
    private reqService: RequerimientosService,
    private leadsService: LeadsService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadRequerimientos();
    this.loadUsers();
    this.loadKpis();

    // Reaccionar a cambios en filtros
    this.searchControl.valueChanges.pipe(debounceTime(300)).subscribe(() => this.applyFilters());
    this.sucursalControl.valueChanges.subscribe(() => this.applyFilters());
    this.estatusControl.valueChanges.subscribe(() => this.applyFilters());
    this.agenteControl.valueChanges.subscribe(() => this.applyFilters());
  }

  loadRequerimientos(): void {
    this.reqService.getRequerimientos().subscribe({
      next: (data) => {
        this.requerimientos = data;
        this.applyFilters();
        this.cdr.markForCheck();
      },
      error: (err) => console.error(err)
    });
  }

  loadUsers(): void {
    this.leadsService.getUsuarios().subscribe({
      next: (res) => this.usuarios = res,
      error: (err) => console.error(err)
    });
  }

  loadKpis(): void {
    this.reqService.getIndicadores().subscribe({
      next: (data) => this.kpis = data,
      error: (err) => console.error(err)
    });
  }

  applyFilters(): void {
    const search = (this.searchControl.value || '').toLowerCase().trim();
    const sucursal = this.sucursalControl.value || 'Todos';
    const estatus = this.estatusControl.value || 'Todos';
    const agente = this.agenteControl.value || 'Todos';

    this.filteredRequerimientos = this.requerimientos.filter(r => {
      // Búsqueda por texto
      const matchesSearch = !search || 
        r.folio.toLowerCase().includes(search) ||
        r.nombreContacto.toLowerCase().includes(search) ||
        r.empresa.toLowerCase().includes(search) ||
        r.descripcion.toLowerCase().includes(search);

      // Filtro Sucursal
      const matchesSucursal = sucursal === 'Todos' || r.sucursal === sucursal;

      // Filtro Estatus
      const matchesEstatus = estatus === 'Todos' || r.estatus === estatus;

      // Filtro Agente
      const matchesAgente = agente === 'Todos' || r.usuarioAsignadoId === +agente;

      return matchesSearch && matchesSucursal && matchesEstatus && matchesAgente;
    });
  }

  getRequerimientosByEstatus(est: string): Requerimiento[] {
    return this.filteredRequerimientos.filter(r => r.estatus === est);
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(RequerimientoDialogComponent, {
      width: '600px',
      data: { users: this.usuarios }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Requerimiento registrado con éxito.', 'OK', { duration: 3000 });
        this.loadRequerimientos();
        this.loadKpis();
      }
    });
  }

  openEditDialog(req: Requerimiento): void {
    const dialogRef = this.dialog.open(RequerimientoDialogComponent, {
      width: '600px',
      data: { requerimiento: req, users: this.usuarios }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Requerimiento actualizado con éxito.', 'OK', { duration: 3000 });
        this.loadRequerimientos();
        this.loadKpis();
      }
    });
  }

  openCalificarDialog(req: Requerimiento): void {
    // Obtener información extendida
    this.reqService.getRequerimiento(req.id).subscribe({
      next: (reqFull) => {
        const dialogRef = this.dialog.open(RequerimientoCalificarDialogComponent, {
          width: '750px',
          data: { 
            requerimiento: reqFull, 
            currentUser: { id: req.usuarioAsignadoId || 1 } 
          }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.snackBar.open('Calificación guardada y registrada.', 'OK', { duration: 3000 });
            this.loadRequerimientos();
            this.loadKpis();
          }
        });
      }
    });
  }

  eliminarRequerimiento(id: number): void {
    Swal.fire({
      title: '¿Eliminar requerimiento?',
      text: 'Se borrará permanentemente de los registros del SGC.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        // En una API real podemos tener delete, pero como es SGC se aconseja descarte
        // Para pruebas rápidas implementaremos descarte o no viable
        // Si quieres borrarlo directo de base de datos a nivel técnico:
        // Agregaremos soporte en el servicio si se requiere o mostramos mensaje de advertencia
        Swal.fire('Atención', 'Para registros de SGC use la calificación a "No Viable" o descarte justificado.', 'info');
      }
    });
  }
}
