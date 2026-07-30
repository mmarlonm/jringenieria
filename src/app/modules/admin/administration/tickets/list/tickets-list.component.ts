import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TicketsService } from '../tickets.service';

@Component({
  selector: 'app-tickets-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatTableModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './tickets-list.component.html',
  styleUrls: ['./tickets-list.component.css']
})
export class TicketsListComponent implements OnInit {
  tickets: any[] = [];
  filteredTickets: any[] = [];
  isLoading = false;
  showFilters = false;

  tipos: any[] = [];
  estatus: any[] = [];
  prioridades: any[] = [];
  responsables: any[] = [];

  selectedTipo: number | null = null;
  selectedEstatus: number | null = null;
  selectedPrioridad: number | null = null;
  selectedResponsable: number | null = null;
  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;

  countNuevos = 0;
  countEnAnalisis = 0;
  countPendientesAprobacion = 0;
  countResueltos = 0;

  constructor(
    private ticketsService: TicketsService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarCatalogos();
    this.consultar();
  }

  cargarCatalogos(): void {
    this.ticketsService.obtenerCatalogos().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.tipos = res.data.tipos;
          this.estatus = res.data.estatus;
          this.prioridades = res.data.prioridades;
        }
      }
    });

    this.ticketsService.obtenerUsuariosAsignacion().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.responsables = res.data;
        }
      }
    });
  }

  consultar(): void {
    this.isLoading = true;
    this.ticketsService.listar(
      this.selectedTipo || undefined,
      this.selectedEstatus || undefined,
      this.selectedPrioridad || undefined,
      this.selectedResponsable || undefined,
      this.fechaDesde || undefined,
      this.fechaHasta || undefined
    ).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.tickets = res.data;
          this.calcularKPIs();
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  calcularKPIs(): void {
    this.countNuevos = this.tickets.filter(t => t.nombreEstatus === 'Nuevo').length;
    this.countEnAnalisis = this.tickets.filter(t => t.nombreEstatus === 'En Análisis').length;
    this.countPendientesAprobacion = this.tickets.filter(t => t.nombreEstatus === 'Estimación Enviada').length;
    this.countResueltos = this.tickets.filter(t => t.nombreEstatus === 'Resuelto').length;
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  limpiarFiltros(): void {
    this.selectedTipo = null;
    this.selectedEstatus = null;
    this.selectedPrioridad = null;
    this.selectedResponsable = null;
    this.fechaDesde = null;
    this.fechaHasta = null;
    this.consultar();
  }

  abrirNuevo(): void {
    this.router.navigate(['/administration/tickets/nuevo']);
  }

  verDetalle(ticketId: number): void {
    this.router.navigate(['/administration/tickets', ticketId]);
  }

  getPrioridadColor(prioridad: string): string {
    const map: { [key: string]: string } = {
      'Baja': 'bg-sky-50 text-sky-700',
      'Media': 'bg-amber-50 text-amber-700',
      'Alta': 'bg-red-50 text-red-700',
      'Crítica': 'bg-rose-50 text-rose-700'
    };
    return map[prioridad] || 'bg-gray-50 text-gray-700';
  }

  getEstatusColor(estatus: string): string {
    const map: { [key: string]: string } = {
      'Aprobado': 'bg-emerald-500',
      'En Progreso': 'bg-blue-500',
      'Rechazado': 'bg-red-500',
      'Resuelto': 'bg-emerald-600'
    };
    return map[estatus] || 'bg-gray-500';
  }
}
