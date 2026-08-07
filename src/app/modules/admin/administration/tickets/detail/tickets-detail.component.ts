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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TicketsService } from '../tickets.service';
import Swal from 'sweetalert2';

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
    MatExpansionModule,
    MatSnackBarModule
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
  usuariosPermitidosParaAprobacion: number[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ticketsService: TicketsService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
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
  }

  ngOnInit(): void {
    // Obtener el ID del usuario actual desde userInformation
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInformation') || '{}');
      this.currentUserId = userInfo?.usuario?.id || 0;
    } catch (e) {
      this.currentUserId = 0;
    }
    console.log('Current User ID:', this.currentUserId);

    // Cargar los aprobadores permitidos del backend
    this.cargarAprobadores();

    this.route.params.subscribe(params => {
      this.ticketId = params['id'];
      this.cargarTicket();
    });
  }

  cargarAprobadores(): void {
    this.ticketsService.obtenerAprobadores().subscribe({
      next: (res: any) => {
        if (res.success && Array.isArray(res.data)) {
          this.usuariosPermitidosParaAprobacion = res.data.map((u: any) =>
            typeof u === 'number' ? u : u.usuarioId
          );
          console.log('Aprobadores permitidos:', this.usuariosPermitidosParaAprobacion);
        }
      },
      error: (err) => {
        console.error('Error al cargar aprobadores:', err);
      }
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
        this.snackBar.open('Error al cargar el ticket', 'Cerrar', { duration: 4000 });
        this.isLoading = false;
      }
    });
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

  aprobarRechazar(aprobar: boolean): void {
    if (!this.aprobacionForm.valid) {
      this.snackBar.open('Debes agregar un comentario', 'Cerrar', { duration: 4000 });
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
          this.snackBar.open(res.message, 'Cerrar', { duration: 4000 });
          this.mostrarFormAprobacion = false;
          this.cargarTicket();
        } else {
          this.snackBar.open('Error al procesar aprobación', 'Cerrar', { duration: 4000 });
        }
        this.isSubmittingAprobacion = false;
      },
      error: () => {
        this.snackBar.open('Error al procesar aprobación', 'Cerrar', { duration: 4000 });
        this.isSubmittingAprobacion = false;
      }
    });
  }

  agregarComentario(): void {
    if (!this.comentarioForm.valid) {
      this.snackBar.open('El comentario no puede estar vacío', 'Cerrar', { duration: 4000 });
      return;
    }

    this.isSubmittingComentario = true;
    const dto = {
      comentario: this.comentarioForm.get('comentario')?.value
    };

    this.ticketsService.agregarComentario(this.ticketId, dto).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.snackBar.open('Comentario agregado', 'Cerrar', { duration: 3000 });
          this.comentarioForm.reset();
          this.mostrarFormComentario = false;
          this.cargarTicket();
        } else {
          this.snackBar.open('Error al agregar comentario', 'Cerrar', { duration: 4000 });
        }
        this.isSubmittingComentario = false;
      },
      error: () => {
        this.snackBar.open('Error al agregar comentario', 'Cerrar', { duration: 4000 });
        this.isSubmittingComentario = false;
      }
    });
  }

  puedeAprobar(): boolean {
    const usuarioPermitido = this.usuariosPermitidosParaAprobacion.includes(this.currentUserId);
    const puedeAprobar = usuarioPermitido;
    console.log('Verificación de aprobación:', {
      currentUserId: this.currentUserId,
      usuariosPermitidos: this.usuariosPermitidosParaAprobacion,
      usuarioPermitido,
      estatusTicket: this.ticket?.nombreEstatus,
      resultado: puedeAprobar
    });
    return this.ticket?.nombreEstatus === 'Estimación Enviada' && puedeAprobar;
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

  esCreador(): boolean {
    return this.ticket && this.currentUserId === this.ticket.idSolicitante;
  }

  puedeEstimar(): boolean {
    // Mostrar si está en estado "Nuevo" o "En Análisis" (sin restricción de responsable)
    if (!this.ticket) return false;
    return this.ticket.ticketEstatusId === 1 || this.ticket.ticketEstatusId === 2;
  }

  agregarActividad(): void {
    if (!this.estimacionForm.valid) {
      this.snackBar.open('Completa todos los campos requeridos', 'Cerrar', { duration: 4000 });
      return;
    }

    const actividad = {
      descripcion: this.estimacionForm.get('descripcionActividad')?.value,
      horas: parseFloat(this.estimacionForm.get('horas')?.value),
      precioUnitario: parseFloat(this.estimacionForm.get('precioUnitario')?.value),
      orden: this.actividades.length
    };

    this.actividades.push(actividad);
    this.estimacionForm.reset();
  }

  guardarEstimacion(): void {
    if (this.actividades.length === 0) {
      this.snackBar.open('Debe agregar al menos una actividad', 'Cerrar', { duration: 4000 });
      return;
    }

    const totalHoras = this.actividades.reduce((sum, a) => sum + a.horas, 0);
    const totalPrecio = this.actividades.reduce((sum, a) => sum + (a.horas * a.precioUnitario), 0);

    const dto = {
      actividades: this.actividades,
      horasEstimadas: totalHoras,
      precioTotalEstimado: totalPrecio,
      comentarioEstimacion: this.estimacionForm.get('comentarioEstimacion')?.value || ''
    };

    this.isSubmittingEstimacion = true;
    this.ticketsService.guardarEstimacion(this.ticketId, dto).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.snackBar.open('Estimación enviada a aprobación', 'Cerrar', { duration: 4000 });
          this.actividades = [];
          this.cargarTicket();
          this.mostrarFormEstimacion = false;
        } else {
          this.snackBar.open(res.message || 'Error al guardar estimación', 'Cerrar', { duration: 4000 });
        }
        this.isSubmittingEstimacion = false;
      },
      error: () => {
        this.snackBar.open('Error al guardar estimación', 'Cerrar', { duration: 4000 });
        this.isSubmittingEstimacion = false;
      }
    });
  }

  abrirFormularioEditar(): void {
    if (!this.esCreador()) {
      this.snackBar.open('Solo el solicitante puede editar el ticket', 'Cerrar', { duration: 4000 });
      return;
    }
    this.router.navigate(['/administration/tickets', this.ticketId, 'editar']);
  }

  confirmarEliminar(): void {
    if (!this.esCreador()) {
      this.snackBar.open('Solo el solicitante puede eliminar el ticket', 'Cerrar', { duration: 4000 });
      return;
    }

    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ticketsService.eliminar(this.ticketId).subscribe({
          next: (res: any) => {
            if (res.success) {
              this.snackBar.open('Ticket eliminado', 'Cerrar', { duration: 3000 });
              this.router.navigate(['/administration/tickets']);
            } else {
              this.snackBar.open(res.message || 'Error al eliminar el ticket', 'Cerrar', { duration: 4000 });
            }
          },
          error: () => {
            this.snackBar.open('Error al eliminar el ticket', 'Cerrar', { duration: 4000 });
          }
        });
      }
    });
  }
}
