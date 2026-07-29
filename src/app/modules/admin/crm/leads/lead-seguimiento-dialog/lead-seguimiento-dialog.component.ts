import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LeadsService, Lead, LeadSeguimiento } from '../leads.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-lead-seguimiento-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
    DatePipe
  ],
  templateUrl: './lead-seguimiento-dialog.component.html',
  styles: [`
    .timeline-container {
      position: relative;
      padding-left: 24px;
    }
    .timeline-container::before {
      content: '';
      position: absolute;
      left: 7px;
      top: 10px;
      bottom: 10px;
      width: 2px;
      background: #cbd5e1;
    }
    .timeline-dot {
      position: absolute;
      left: 0;
      top: 6px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 3px solid #3b82f6;
      background: #fff;
    }
  `]
})
export class LeadSeguimientoDialogComponent implements OnInit {
  lead: Lead;
  users: any[] = [];
  seguimientos: LeadSeguimiento[] = [];
  cargando: boolean = false;

  form: FormGroup;
  medios = ['WhatsApp', 'Correo', 'Llamada', 'Visita Presencial', 'Videollamada', 'Otro'];

  constructor(
    private _fb: FormBuilder,
    private _leadsService: LeadsService,
    private _cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<LeadSeguimientoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { lead: Lead, users: any[] }
  ) {
    this.lead = data.lead;
    this.users = data.users || [];
  }

  ngOnInit(): void {
    this.cargarSeguimientos();

    // Obtener ID del usuario activo
    const userObjStr = localStorage.getItem('userInformation');
    let idUsuario = null;
    if (userObjStr) {
      try {
        const userObj = JSON.parse(userObjStr);
        idUsuario = userObj?.usuario?.usuarioId || userObj?.usuario?.id || null;
      } catch (e) {
        console.error(e);
      }
    }

    this.form = this._fb.group({
      fechaContacto: [new Date(), Validators.required],
      medioUtilizado: ['WhatsApp', Validators.required],
      avanceLogrado: ['', [Validators.required, Validators.maxLength(1000)]],
      informacionFaltante: [''],
      proximaAction: ['', [Validators.required, Validators.maxLength(500)]],
      fechaCompromiso: [null],
      idResponsable: [idUsuario, Validators.required]
    });
  }

  cargarSeguimientos(): void {
    this.cargando = true;
    this._leadsService.getSeguimientosLead(this.lead.id).subscribe({
      next: (data) => {
        this.seguimientos = data;
        this.cargando = false;
        this._cdr.markForCheck();
      },
      error: () => {
        this.cargando = false;
        this._cdr.markForCheck();
        Swal.fire('Error', 'No se pudo cargar la bitácora de seguimiento comercial', 'error');
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.cargando = true;
    const val = this.form.value;

    this._leadsService.saveSeguimientoLead(this.lead.id, val).subscribe({
      next: (nuevo) => {
        this.seguimientos = [...this.seguimientos, nuevo];
        this.form.reset({
          fechaContacto: new Date(),
          medioUtilizado: 'WhatsApp',
          idResponsable: val.idResponsable
        });
        this.cargando = false;
        this._cdr.markForCheck();
        Swal.fire({
          title: 'Registrado',
          text: 'Seguimiento comercial registrado según norma ISO 9001:7.7',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: () => {
        this.cargando = false;
        this._cdr.markForCheck();
        Swal.fire('Error', 'No se pudo guardar el seguimiento', 'error');
      }
    });
  }

  eliminarSeguimiento(id: number): void {
    Swal.fire({
      title: '¿Eliminar registro?',
      text: 'Esta acción borrará la trazabilidad del contacto comercial de forma permanente',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((res) => {
      if (res.isConfirmed) {
        this.cargando = true;
        this._leadsService.deleteSeguimientoLead(this.lead.id, id).subscribe({
          next: () => {
            this.seguimientos = this.seguimientos.filter(s => s.id !== id);
            this.cargando = false;
            this._cdr.markForCheck();
          },
          error: () => {
            this.cargando = false;
            this._cdr.markForCheck();
            Swal.fire('Error', 'No se pudo eliminar el registro', 'error');
          }
        });
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
