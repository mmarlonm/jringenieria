import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewEncapsulation, AfterViewInit, ElementRef, ViewChildren, QueryList } from '@angular/core';
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
import { UsersService } from 'app/modules/admin/security/users/users.service';
import { RequerimientoDialogComponent } from './requerimiento-dialog/requerimiento-dialog.component';
import { RequerimientoCalificarDialogComponent } from './requerimiento-calificar-dialog/requerimiento-calificar-dialog.component';
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';
import Sortable from 'sortablejs';

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
    MatSnackBarModule,
  ],
  templateUrl: './requerimientos.component.html',
  encapsulation: ViewEncapsulation.None,
  styles: [`
    .kanban-col {
      min-height: 480px;
    }
    /* SortableJS drag styles */
    .sortable-ghost {
      opacity: 0.35;
      background: rgba(59, 130, 246, 0.08) !important;
      border: 2px dashed #3b82f6 !important;
      border-radius: 12px;
    }
    .sortable-drag {
      opacity: 0.95;
      box-shadow: 0 12px 32px rgba(0,0,0,0.18);
      border-radius: 12px;
    }
    .sortable-chosen {
      cursor: grabbing !important;
    }
  `]
})
export class RequerimientosComponent implements OnInit, AfterViewInit, OnDestroy {
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

  // Listas para kanban
  pendientes: Requerimiento[] = [];
  calificadosComercial: Requerimiento[] = [];
  calificadosTecnico: Requerimiento[] = [];
  noViables: Requerimiento[] = [];

  // Filtros
  searchControl = new FormControl('');
  sucursalControl = new FormControl('Todos');
  estatusControl = new FormControl('Todos');
  agenteControl = new FormControl('Todos');

  displayedColumns = [
    'folio', 'nombreContacto', 'empresa', 'sucursal',
    'fechaRecepcion', 'estatus', 'viabilidad', 'rutaAtencion', 'acciones'
  ];

  private sortableInstances: Sortable[] = [];

  constructor(
    private reqService: RequerimientosService,
    private usersService: UsersService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private el: ElementRef
  ) {}

  ngOnInit(): void {
    this.loadRequerimientos();
    this.loadUsers();
    this.loadKpis();

    this.searchControl.valueChanges.pipe(debounceTime(300)).subscribe(() => this.applyFilters());
    this.sucursalControl.valueChanges.subscribe(() => this.applyFilters());
    this.estatusControl.valueChanges.subscribe(() => this.applyFilters());
    this.agenteControl.valueChanges.subscribe(() => this.applyFilters());
  }

  ngAfterViewInit(): void {
    // Inicializar Sortable después de que el DOM esté listo
    setTimeout(() => this.initSortable(), 300);
  }

  ngOnDestroy(): void {
    this.destroySortable();
  }

  private destroySortable(): void {
    this.sortableInstances.forEach(s => s.destroy());
    this.sortableInstances = [];
  }

  private initSortable(): void {
    this.destroySortable();

    const columns = [
      { selector: '#kanban-pendiente',   estatus: 'Pendiente' },
      { selector: '#kanban-comercial',   estatus: 'Calificado Comercial' },
      { selector: '#kanban-tecnico',     estatus: 'Calificado Técnico' },
      { selector: '#kanban-no-viable',   estatus: 'No Viable' },
    ];

    columns.forEach(col => {
      const el = this.el.nativeElement.querySelector(col.selector);
      if (!el) return;

      const instance = Sortable.create(el, {
        group: 'kanban-requerimientos',
        animation: 180,
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        chosenClass: 'sortable-chosen',
        onAdd: (evt: any) => {
          const itemId = parseInt(evt.item.getAttribute('data-id'), 10);
          const targetEstatus = col.estatus;
          this.onCardMoved(itemId, targetEstatus, evt);
        }
      });
      this.sortableInstances.push(instance);
    });
  }

  private onCardMoved(itemId: number, targetEstatus: string, evt: any): void {
    const item = this.requerimientos.find(r => r.id === itemId);
    if (!item || item.estatus === targetEstatus) return;

    if (targetEstatus === 'No Viable') {
      Swal.fire({
        title: 'Motivo de descarte / No Viable',
        input: 'textarea',
        inputPlaceholder: 'Escriba la justificación...',
        inputAttributes: { 'aria-label': 'Escriba la justificación' },
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        allowOutsideClick: false
      }).then((result) => {
        if (result.isConfirmed && result.value) {
          this.ejecutarCambioEstatus(item, targetEstatus, result.value);
        } else {
          this.loadRequerimientos();
        }
      });
    } else {
      this.ejecutarCambioEstatus(item, targetEstatus);
    }
  }

  loadRequerimientos(): void {
    this.reqService.getRequerimientos().subscribe({
      next: (data) => {
        this.requerimientos = data;
        this.applyFilters();
        this.cdr.detectChanges();
        // Re-init sortable after data reload
        setTimeout(() => this.initSortable(), 100);
      },
      error: (err) => console.error(err)
    });
  }

  loadUsers(): void {
    this.usersService.getUsers().subscribe({
      next: (res) => {
        this.usuarios = res;
        this.cdr.detectChanges();
      },
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
      const matchesSearch = !search ||
        r.folio.toLowerCase().includes(search) ||
        r.nombreContacto.toLowerCase().includes(search) ||
        r.empresa.toLowerCase().includes(search) ||
        r.descripcion.toLowerCase().includes(search);
      const matchesSucursal = sucursal === 'Todos' || r.sucursal === sucursal;
      const matchesEstatus = estatus === 'Todos' || r.estatus === estatus;
      const matchesAgente = agente === 'Todos' || r.usuarioAsignadoId === +agente;
      return matchesSearch && matchesSucursal && matchesEstatus && matchesAgente;
    });

    this.pendientes = this.filteredRequerimientos.filter(r => r.estatus === 'Pendiente');
    this.calificadosComercial = this.filteredRequerimientos.filter(r => r.estatus === 'Calificado Comercial');
    this.calificadosTecnico = this.filteredRequerimientos.filter(r => r.estatus === 'Calificado Técnico');
    this.noViables = this.filteredRequerimientos.filter(r => r.estatus === 'No Viable');

    this.cdr.detectChanges();
    setTimeout(() => this.initSortable(), 100);
  }

  private ejecutarCambioEstatus(item: Requerimiento, targetEstatus: string, motivoDescarte?: string): void {
    const dto = {
      estatus: targetEstatus,
      naturaleza: item.naturaleza || '',
      rutaAtencion: item.rutaAtencion || '',
      viabilidad: item.viabilidad || '',
      observacionesRiesgo: item.observacionesRiesgo || '',
      motivoDescarte: motivoDescarte || item.motivoDescarte || '',
      faltaPlano: item.faltaPlano,
      faltaFotografia: item.faltaFotografia,
      faltaCantidad: item.faltaCantidad,
      faltaUbicacion: item.faltaUbicacion,
      faltaDatosElectricos: item.faltaDatosElectricos,
      faltaCapacidad: item.faltaCapacidad,
      faltaFechaEjecucion: item.faltaFechaEjecucion,
      faltaCondicionesSitio: item.faltaCondicionesSitio,
      faltaNormativa: item.faltaNormativa,
      faltaEvidenciaFalla: item.faltaEvidenciaFalla,
      faltaMarcaModelo: item.faltaMarcaModelo,
      faltaVisita: item.faltaVisita,
      faltaOtros: item.faltaOtros,
      faltaOtrosDescripcion: item.faltaOtrosDescripcion || ''
    };

    this.reqService.calificarRequerimiento(item.id, dto).subscribe({
      next: () => {
        item.estatus = targetEstatus;
        if (motivoDescarte) item.motivoDescarte = motivoDescarte;
        this.snackBar.open(`Requerimiento movido a ${targetEstatus} con éxito`, 'OK', { duration: 2500 });
        this.loadKpis();
      },
      error: (err) => {
        this.loadRequerimientos();
        Swal.fire('Error', 'No se pudo actualizar el estatus: ' + err.message, 'error');
      }
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
    this.reqService.getRequerimiento(req.id).subscribe({
      next: (reqFull) => {
        const dialogRef = this.dialog.open(RequerimientoCalificarDialogComponent, {
          width: '750px',
          data: { requerimiento: reqFull, currentUser: { id: req.usuarioAsignadoId || 1 } }
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
        Swal.fire('Atención', 'Para registros de SGC use la calificación a "No Viable" o descarte justificado.', 'info');
      }
    });
  }
}
