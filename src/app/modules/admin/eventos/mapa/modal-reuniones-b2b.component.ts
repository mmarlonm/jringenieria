import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { EventosService } from '../eventos.service';

@Component({
  selector: 'dialog-reuniones-b2b',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  styles: [`
    .dialog-wrapper {
      padding: 0;
      font-family: 'Inter', sans-serif;
    }
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
    }
    .header-content h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      color: #1e293b;
    }
    .subtitle {
      margin: 4px 0 0 0;
      font-size: 13px;
      color: #64748b;
      font-weight: 500;
    }
    .close-btn {
      color: #64748b;
    }
    .content-area {
      padding: 24px;
      max-height: 70vh;
      overflow-y: auto;
    }
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 0;
      color: #64748b;
      gap: 16px;
    }
    .no-schedules {
      text-align: center;
      padding: 40px 20px;
      color: #64748b;
    }
    .no-schedules-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 12px;
      color: #cbd5e1;
    }
    .schedules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }
    .schedule-card {
      background: #ffffff;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .schedule-card:hover:not(.full) {
      border-color: #6366f1;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.08);
    }
    .schedule-card.full {
      background: #f8fafc;
      border-color: #e2e8f0;
      cursor: not-allowed;
      opacity: 0.7;
    }
    .time-range {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
    }
    .time-icon {
      color: #6366f1;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .location-info {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #475569;
    }
    .loc-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #64748b;
    }
    .capacity-badge {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 4px;
      padding-top: 8px;
      border-top: 1px dashed #e2e8f0;
      font-size: 12px;
    }
    .cap-count {
      font-weight: 600;
      color: #334155;
    }
    .status-lbl {
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 10px;
      text-transform: uppercase;
    }
    .status-lbl.available {
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
    }
    .status-lbl.full {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }
    .form-wrapper {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-info-card {
      background: #f1f5f9;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 13px;
      color: #334155;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .form-info-icon {
      color: #6366f1;
    }
    .selected-time {
      font-weight: 700;
      color: #0f172a;
    }
    .back-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: #6366f1;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      margin-bottom: 12px;
      font-weight: 600;
    }
    .back-btn:hover {
      text-decoration: underline;
    }
    .field-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 640px) {
      .field-row {
        grid-template-columns: 1fr;
        gap: 0;
      }
    }
    .full-width {
      width: 100%;
    }
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      border-bottom-left-radius: 12px;
      border-bottom-right-radius: 12px;
    }
  `],
  template: `
    <div class="dialog-wrapper">
      <div class="dialog-header">
        <div class="header-content">
          <h2>Agendar Encuentro B2B</h2>
          <p class="subtitle">{{ data.stand.empresa }} — Stand {{ data.stand.label }}</p>
        </div>
        <button mat-icon-button mat-dialog-close class="close-btn">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="content-area">
        <div style="font-size: 10px; background: #fee2e2; padding: 6px; margin-bottom: 10px; border-radius: 4px;">
          <strong>DEBUG INFO:</strong>
          <div>Stand ID DB (dbId): {{ data?.stand?.dbId }}</div>
          <div>Horarios Array Length: {{ horarios?.length }}</div>
          <pre style="margin: 4px 0 0 0; max-height: 50px; overflow: auto; background: #fff;">{{ data?.stand | json }}</pre>
          <pre style="margin: 4px 0 0 0; max-height: 50px; overflow: auto; background: #fff;">Horarios: {{ horarios | json }}</pre>
        </div>

        <!-- STEP 1: SELECT SCHEDULE -->
        @if (step === 1) {
          @if (loading) {
            <div class="loading-container">
              <mat-spinner diameter="40"></mat-spinner>
              <span>Consultando horarios disponibles...</span>
            </div>
          } @else if (horarios.length === 0) {
            <div class="no-schedules">
              <mat-icon class="no-schedules-icon">calendar_today</mat-icon>
              <p>No hay horarios B2B disponibles para este stand actualmente.</p>
            </div>
          } @else {
            <div class="schedules-grid">
              @for (h of horarios; track h.id) {
                <div class="schedule-card" [class.full]="h.estaLleno || !h.disponible" (click)="selectHorario(h)">
                  <div class="time-range">
                    <mat-icon class="time-icon">schedule</mat-icon>
                    <span>{{ formatTime(h.horaInicio) }} - {{ formatTime(h.horaFin) }}</span>
                  </div>
                  <div class="location-info">
                    <mat-icon class="loc-icon">place</mat-icon>
                    <span>{{ h.ubicacion || 'Stand' }}</span>
                  </div>
                  <div class="capacity-badge">
                    <span class="cap-count">Cupos: {{ h.reservasActuales }}/{{ h.capacidadMaxima }}</span>
                    <span class="status-lbl" [class.available]="!h.estaLleno" [class.full]="h.estaLleno">
                      {{ h.estaLleno ? 'Lleno' : 'Disponible' }}
                    </span>
                  </div>
                </div>
              }
            </div>
          }
        }

        <!-- STEP 2: BOOKING FORM -->
        @if (step === 2 && selectedHorario) {
          <button class="back-btn" (click)="goBack()">
            <mat-icon class="icon-size-4">arrow_back</mat-icon> Volver a horarios
          </button>

          <div class="form-wrapper">
            <div class="form-info-card">
              <mat-icon class="form-info-icon">info</mat-icon>
              <span>Reunión programada para las <span class="selected-time">{{ formatTime(selectedHorario.horaInicio) }} - {{ formatTime(selectedHorario.horaFin) }}</span> en {{ selectedHorario.ubicacion || 'Stand' }}.</span>
            </div>

            <form [formGroup]="formReunion" class="flex flex-col gap-4">
              <div class="field-row">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Nombre Completo</mat-label>
                  <input matInput formControlName="nombreVisitante" required>
                  <mat-icon matPrefix>person</mat-icon>
                  <mat-error *ngIf="formReunion.get('nombreVisitante')?.hasError('required')">Requerido</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Correo Electrónico</mat-label>
                  <input matInput type="email" formControlName="emailVisitante" required>
                  <mat-icon matPrefix>email</mat-icon>
                  <mat-error *ngIf="formReunion.get('emailVisitante')?.hasError('required')">Requerido</mat-error>
                  <mat-error *ngIf="formReunion.get('emailVisitante')?.hasError('email')">Formato inválido</mat-error>
                </mat-form-field>
              </div>

              <div class="field-row">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Empresa</mat-label>
                  <input matInput formControlName="empresaVisitante">
                  <mat-icon matPrefix>business</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Teléfono / WhatsApp</mat-label>
                  <input matInput formControlName="telefonoVisitante">
                  <mat-icon matPrefix>phone</mat-icon>
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Comentarios / Requerimiento Especial</mat-label>
                <textarea matInput formControlName="comentarios" rows="3"></textarea>
                <mat-icon matPrefix>chat</mat-icon>
              </mat-form-field>
            </form>
          </div>
        }
      </div>

      <div class="dialog-actions">
        <button mat-button mat-dialog-close class="cancel-btn">Cancelar</button>
        @if (step === 2) {
          <button mat-raised-button color="accent"
                  [disabled]="!formReunion.valid || saving"
                  (click)="guardarReunion()"
                  class="save-btn">
            <mat-icon>check_circle</mat-icon>
            Confirmar Cita
          </button>
        }
      </div>
    </div>
  `
})
export class ModalReunionesB2B implements OnInit {
  step = 1;
  loading = true;
  saving = false;
  horarios: any[] = [];
  selectedHorario: any = null;
  formReunion!: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<ModalReunionesB2B>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _eventosService: EventosService,
    private _fb: FormBuilder,
    private _snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.formReunion = this._fb.group({
      nombreVisitante: ['', Validators.required],
      emailVisitante: ['', [Validators.required, Validators.email]],
      telefonoVisitante: [''],
      empresaVisitante: [''],
      comentarios: ['']
    });

    this.cargarHorarios();
  }

  cargarHorarios(): void {
    this.loading = true;
    console.log('[B2B] Cargar horarios para stand ID:', this.data?.stand?.dbId, this.data?.stand);
    this._eventosService.getHorariosB2B(this.data.stand.dbId).subscribe({
      next: (res) => {
        console.log('[B2B] Respuesta de horarios B2B recibida:', res);
        if (Array.isArray(res)) {
          this.horarios = res;
        } else if (res && Array.isArray(res.items)) {
          this.horarios = res.items;
        } else if (res && Array.isArray(res.Items)) {
          this.horarios = res.Items;
        } else {
          this.horarios = [];
        }
        console.log('[B2B] Horarios asignados:', this.horarios);
        this.loading = false;
      },
      error: (err) => {
        console.error('[B2B] Error al cargar horarios B2B:', err);
        this.loading = false;
      }
    });
  }

  selectHorario(h: any): void {
    if (h.estaLleno || !h.disponible) return;
    this.selectedHorario = h;
    this.step = 2;
  }

  goBack(): void {
    this.selectedHorario = null;
    this.step = 1;
  }

  formatTime(isoString: string): string {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '';
    }
  }

  guardarReunion(): void {
    if (!this.formReunion.valid || !this.selectedHorario) return;

    this.saving = true;
    const payload = {
      horarioB2BId: this.selectedHorario.id,
      nombreVisitante: this.formReunion.value.nombreVisitante,
      emailVisitante: this.formReunion.value.emailVisitante,
      telefonoVisitante: this.formReunion.value.telefonoVisitante,
      empresaVisitante: this.formReunion.value.empresaVisitante,
      comentarios: this.formReunion.value.comentarios
    };

    this._eventosService.apartarReunionB2B(this.data.stand.dbId, payload).subscribe({
      next: (res) => {
        this.saving = false;
        this.dialogRef.close({ success: true, reunion: res });
      },
      error: (err) => {
        console.error('Error al guardar reunión B2B:', err);
        this.saving = false;
        this._snackBar.open(
          err?.error?.error || '❌ Este horario ya no está disponible o ha completado su capacidad. Por favor elige otro.',
          'Cerrar',
          { duration: 6000, panelClass: ['snackbar-error'] }
        );
      }
    });
  }
}
