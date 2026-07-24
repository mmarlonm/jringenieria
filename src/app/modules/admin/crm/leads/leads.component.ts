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
import { LeadsService, Lead } from './leads.service';
import { UsersService } from 'app/modules/admin/security/users/users.service';
import { LeadDialogComponent } from './lead-dialog/lead-dialog.component';
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-leads',
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
  templateUrl: './leads.component.html',
  styles: [`
    .kanban-col {
      min-height: 500px;
    }
    .sla-alert {
      border: 2px solid #ef4444 !important;
      background-color: #fef2f2 !important;
      animation: pulse-red 2s infinite;
    }
    .dark .sla-alert {
      background-color: rgba(239, 68, 68, 0.1) !important;
    }
    @keyframes pulse-red {
      0% {
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
      }
      70% {
        box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
      }
    }
  `]
})
export class LeadsComponent implements OnInit {
  leads: Lead[] = [];
  filteredLeads: Lead[] = [];
  users: any[] = [];
  viewMode: 'kanban' | 'list' = 'kanban';

  // Filters
  searchControl = new FormControl('');
  fuenteControl = new FormControl('Todos');
  sucursalControl = new FormControl('Todos');

  displayedColumns = [
    'id', 'nombreContacto', 'empresa', 'telefono', 'email', 
    'fuenteLead', 'sucursalQueRecibe', 'fechaRegistro', 'estatus', 'acciones'
  ];

  constructor(
    private leadsService: LeadsService,
    private usersService: UsersService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadLeads();
    this.loadUsers();

    // Listen to filters changes
    this.searchControl.valueChanges.pipe(debounceTime(200)).subscribe(() => this.applyFilters());
    this.fuenteControl.valueChanges.subscribe(() => this.applyFilters());
    this.sucursalControl.valueChanges.subscribe(() => this.applyFilters());
  }

  loadLeads(): void {
    this.leadsService.getLeads().subscribe({
      next: (data) => {
        this.leads = data;
        this.applyFilters();
        this.cdr.markForCheck();
      },
      error: () => this.showSnackBar('Error al cargar leads', 'Cerrar', 'bg-red-600 text-white')
    });
  }

  loadUsers(): void {
    this.usersService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.cdr.markForCheck();
      }
    });
  }

  applyFilters(): void {
    const search = (this.searchControl.value || '').toLowerCase().trim();
    const fuente = this.fuenteControl.value || 'Todos';
    const sucursal = this.sucursalControl.value || 'Todos';

    this.filteredLeads = this.leads.filter(lead => {
      // Search matches
      const matchesSearch = !search || 
        lead.nombreContacto.toLowerCase().includes(search) ||
        lead.empresa.toLowerCase().includes(search) ||
        lead.email.toLowerCase().includes(search) ||
        lead.telefono.toLowerCase().includes(search) ||
        (lead.necesidadInicial && lead.necesidadInicial.toLowerCase().includes(search));

      // Fuente matches
      const matchesFuente = fuente === 'Todos' || lead.fuenteLead === fuente;

      // Sucursal matches
      const matchesSucursal = sucursal === 'Todos' || lead.sucursalQueRecibe === sucursal;

      return matchesSearch && matchesFuente && matchesSucursal;
    });
    this.cdr.markForCheck();
  }

  getLeadsByStatus(status: string): Lead[] {
    return this.filteredLeads.filter(lead => lead.estatus === status);
  }

  isSLAOverdue(lead: Lead): boolean {
    if (lead.estatus !== 'Nuevo') return false;
    const hrs24 = 24 * 60 * 60 * 1000;
    const elapsed = new Date().getTime() - new Date(lead.fechaRegistro).getTime();
    return elapsed > hrs24;
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(LeadDialogComponent, {
      width: '650px',
      data: { action: 'create', users: this.users }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'create') {
        this.leadsService.createLead(result.data).subscribe({
          next: () => {
            this.showSnackBar('Lead registrado exitosamente en la Bandeja', 'OK', 'bg-green-600 text-white');
            this.loadLeads();
          },
          error: () => this.showSnackBar('Error al registrar lead', 'Cerrar', 'bg-red-600 text-white')
        });
      }
    });
  }

  openConvertDialog(lead: Lead): void {
    const dialogRef = this.dialog.open(LeadDialogComponent, {
      width: '650px',
      data: { action: 'convert', lead: lead }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'convert') {
        this.leadsService.convertLead(lead.id, result.data).subscribe({
          next: () => {
            this.showSnackBar('Lead calificado y canalizado exitosamente a Oportunidad', 'OK', 'bg-green-600 text-white');
            this.loadLeads();
          },
          error: (err) => {
            const msg = err.error?.message || 'Error al calificar y canalizar lead';
            this.showSnackBar(msg, 'Cerrar', 'bg-red-600 text-white');
          }
        });
      }
    });
  }

  openDiscardDialog(lead: Lead): void {
    const dialogRef = this.dialog.open(LeadDialogComponent, {
      width: '500px',
      data: { action: 'discard', lead: lead }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'discard') {
        this.leadsService.discardLead(lead.id, result.data).subscribe({
          next: () => {
            this.showSnackBar('Lead descartado', 'OK', 'bg-slate-600 text-white');
            this.loadLeads();
          },
          error: () => this.showSnackBar('Error al descartar lead', 'Cerrar', 'bg-red-600 text-white')
        });
      }
    });
  }

  deleteLead(id: number): void {
    Swal.fire({
      title: '¿Está seguro?',
      text: '¿Está seguro de que desea eliminar este Lead de forma permanente?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.leadsService.deleteLead(id).subscribe({
          next: () => {
            this.showSnackBar('Lead eliminado exitosamente', 'OK', 'bg-green-600 text-white');
            this.loadLeads();
          },
          error: () => this.showSnackBar('Error al eliminar el lead', 'Cerrar', 'bg-red-600 text-white')
        });
      }
    });
  }

  private showSnackBar(message: string, action: string, panelClass: string): void {
    this.snackBar.open(message, action, {
      duration: 5000,
      panelClass: panelClass.split(' '),
      horizontalPosition: 'end',
      verticalPosition: 'bottom'
    });
  }
}
