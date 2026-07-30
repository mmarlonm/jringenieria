import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatExpansionModule } from '@angular/material/expansion';
import { TicketsService } from '../tickets.service';

@Component({
  selector: 'app-tickets-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatExpansionModule
  ],
  templateUrl: './tickets-detail.component.html',
  styleUrls: ['./tickets-detail.component.css']
})
export class TicketsDetailComponent implements OnInit {
  ticket: any = null;
  isLoading = true;
  ticketId: number = 0;

  estimacionForm: FormGroup;
  aprobacionForm: FormGroup;
  comentarioForm: FormGroup;

  mostrarFormEstimacion = false;
  mostrarFormAprobacion = false;
  mostrarFormComentario = false;
  isSubmittingEstimacion = false;
  isSubmittingAprobacion = false;
  isSubmittingComentario = false;

  actividades: any[] = [];

  currentUserId: number = 0;
  tieneRolAprobador = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ticketsService: TicketsService,
    private fb: FormBuilder
  ) {
    this.estimacionForm = this.fb.group({
      descripcionActividad: ['', Validators.required],
      horas: [0, [Validators.required, Validators.min(0.1)]],
      precioUnitario: [0, [Validators.required, Validators.min(0)]],
      comentarioEstimacion: ['']
    });

    this.aprobacionForm = this.fb.group({
      aprobar: [false],
      comentarioAprobacion: ['']
    });

    this.comentarioForm = this.fb.group({
      comentario: ['', [Validators.required, Validators.minLength(3)]]
    });

    // TODO: Obtener del usuario logueado
    this.currentUserId = parseInt(localStorage.getItem('userId') || '0');
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.ticketId = params['id'];
      this.cargarTicket();
    });
  }

  cargarTicket(): void {
    this.isLoading = true;
    this.ticketsService.obtener(this.ticketId).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.ticket = res.data;
          this.actividades = this.ticket.actividades || [];
        }
        this.isLoading = false;
      },
      error: () => {
        alert('Error al cargar el ticket');
        this.isLoading = false;
      }
    });
  }

  agregarActividad(): void {
    if (!this.estimacionForm.valid) {
      alert('Por favor completa todos los campos de la actividad');
      return;
    }

    const actividad = {
      descripcion: this.estimacionForm.get('descripcionActividad')?.value,
      horas: this.estimacionForm.get('horas')?.value,
      precioUnitario: this.estimacionForm.get('precioUnitario')?.value,
      orden: this.actividades.length
    };

    this.actividades.push(actividad);
    this.estimacionForm.get('descripcionActividad')?.reset();
    this.estimacionForm.get('horas')?.reset(0);
    this.estimacionForm.get('precioUnitario')?.reset(0);
  }

  eliminarActividad(index: number): void {
    this.actividades.splice(index, 1);
  }

  calcularTotalPrecio(): number {
    return this.actividades.reduce((sum, a) => sum + (a.horas * a.precioUnitario), 0);
  }

  calcularTotalHoras(): number {
    return this.actividades.reduce((sum, a) => sum + a.horas, 0);
  }

  enviarEstimacion(): void {
    if (this.actividades.length === 0) {
      alert('Debes agregar al menos una actividad');
      return;
    }

    this.isSubmittingEstimacion = true;
    const dto = {
      actividades: this.actividades,
      comentarioEstimacion: this.estimacionForm.get('comentarioEstimacion')?.value || ''
    };

    this.ticketsService.guardarEstimacion(this.ticketId, dto).subscribe({
      next: (res: any) => {
        if (res.success) {
          alert('Estimación enviada a aprobación');
          this.mostrarFormEstimacion = false;
          this.cargarTicket();
        } else {
          alert('Error al enviar estimación');
        }
        this.isSubmittingEstimacion = false;
      },
      error: () => {
        alert('Error al enviar estimación');
        this.isSubmittingEstimacion = false;
      }
    });
  }

  aprobarRechazar(aprobar: boolean): void {
    if (!this.aprobacionForm.valid) {
      alert('Debes agregar un comentario');
      return;
    }

    this.isSubmittingAprobacion = true;
    const dto = {
      aprobar: aprobar,
      comentarioAprobacion: this.aprobacionForm.get('comentarioAprobacion')?.value
    };

    this.ticketsService.aprobarRechazar(this.ticketId, dto).subscribe({
      next: (res: any) => {
        if (res.success) {
          alert(res.message);
          this.mostrarFormAprobacion = false;
          this.cargarTicket();
        } else {
          alert('Error al procesar aprobación');
        }
        this.isSubmittingAprobacion = false;
      },
      error: () => {
        alert('Error al procesar aprobación');
        this.isSubmittingAprobacion = false;
      }
    });
  }

  agregarComentario(): void {
    if (!this.comentarioForm.valid) {
      alert('El comentario no puede estar vacío');
      return;
    }

    this.isSubmittingComentario = true;
    const dto = {
      comentario: this.comentarioForm.get('comentario')?.value
    };

    this.ticketsService.agregarComentario(this.ticketId, dto).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.comentarioForm.reset();
          this.mostrarFormComentario = false;
          this.cargarTicket();
        } else {
          alert('Error al agregar comentario');
        }
        this.isSubmittingComentario = false;
      },
      error: () => {
        alert('Error al agregar comentario');
        this.isSubmittingComentario = false;
      }
    });
  }

  puedeAprobar(): boolean {
    return this.ticket?.nombreEstatus === 'Estimación Enviada' && this.tieneRolAprobador;
  }

  puedeEstimar(): boolean {
    return this.ticket?.idResponsable === this.currentUserId &&
           (this.ticket?.nombreEstatus === 'Nuevo' || this.ticket?.nombreEstatus === 'En Análisis');
  }

  volver(): void {
    this.router.navigate(['/administration/tickets']);
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
