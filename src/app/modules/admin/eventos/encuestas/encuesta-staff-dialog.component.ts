import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { EncuestasEventoService } from './encuestas-evento.service';
import Swal from 'sweetalert2';

export interface EncuestaStaffDialogData {
    staffId: number;
    eventoId: number;
    nombreEvento: string;
    nombreStaff: string;
    tipoStaff: 'logistica' | 'acompanamiento';
}

@Component({
    selector: 'app-encuesta-staff-dialog',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatDialogModule, MatButtonModule, MatIconModule,
        MatInputModule, MatFormFieldModule
    ],
    template: `
<div class="encuesta-wrapper">
    <!-- Header -->
    <div class="encuesta-header">
        <div class="logos-row">
            <img src="assets/images/logo/logo-jr.png" alt="JR" class="logo-img" onerror="this.style.display='none'">
            <img src="assets/images/logo/foro-energiza.png" alt="Foro" class="logo-img" onerror="this.style.display='none'">
            <img src="assets/images/logo/pachuca.png" alt="Pachuca" class="logo-img" onerror="this.style.display='none'">
        </div>
        <h2 class="evento-title">{{ tipoLabel }}</h2>
        <p class="bienvenida"><strong>Gracias por formar parte del equipo del {{ data.nombreEvento }}.</strong></p>
        <p class="bienvenida-sub">Tu opinión es muy importante para nosotros. Esta evaluación tiene como finalidad fortalecer el trabajo en equipo y mejorar nuestros procesos de organización para futuros eventos.</p>
        <p class="tiempo"><strong>Tiempo estimado de respuesta:</strong> <span class="time-badge">3 minutos.</span></p>
        <!-- Escala -->
        <div class="escala-ref">
            <strong>Escala:</strong>
            <span *ngFor="let e of escala" class="escala-item"><strong>{{ e.val }}</strong> = {{ e.label }}</span>
        </div>
    </div>

    <!-- Steps -->
    <div class="steps-indicator">
        <span [class.active]="step === 0" (click)="step=0">
            {{ data.tipoStaff === 'logistica' ? 'Eval. Acompañamiento' : 'Eval. Logística' }}
        </span>
        <span class="sep">›</span>
        <span [class.active]="step === 1" (click)="step >= 1 && (step=1)">
            {{ data.tipoStaff === 'logistica' ? 'Autoeval. Logística' : 'Autoeval. Acompañamiento' }}
        </span>
    </div>

    <!-- LOGISTICA: Paso 0 — Evaluación del Staff de Acompañamiento -->
    <div *ngIf="step === 0 && data.tipoStaff === 'logistica'" class="step-content">
        <div class="section-header">I. Evaluación del Staff de Acompañamiento</div>
        <div class="instrucciones-box">
            <strong>Instrucciones:</strong> Lee cada afirmación y selecciona la opción que mejor refleje tu percepción.<br>
            <small><em>Nota: Todas las preguntas utilizan la misma escala de evaluación.</em></small>
        </div>
        <div class="question-card" *ngFor="let q of preguntasSecI_Log">
            <p class="question-text">{{ q.label }} <span class="req">*</span></p>
            <div class="star-row">
                <button *ngFor="let n of [1,2,3,4,5]" type="button" class="star-btn"
                    [class.active]="formLog[q.key] === n" (click)="formLog[q.key] = n">
                    <span class="star-num">{{ n }}</span>
                    <mat-icon>{{ formLog[q.key] >= n ? 'star' : 'star_border' }}</mat-icon>
                </button>
            </div>
        </div>
        <div class="question-card">
            <p class="question-text">¿Qué comentario o sugerencia harías para mejorar el desempeño del Staff de Acompañamiento? <span class="req">*</span></p>
            <mat-form-field appearance="outline" class="full-width">
                <textarea matInput [(ngModel)]="formLog.acompComentarios" rows="3" placeholder="Tu respuesta"></textarea>
            </mat-form-field>
        </div>
    </div>

    <!-- LOGISTICA: Paso 1 — Autoevaluación -->
    <div *ngIf="step === 1 && data.tipoStaff === 'logistica'" class="step-content">
        <div class="section-header">II. Autoevaluación del Staff de Logística</div>
        <div class="question-card" *ngFor="let q of preguntasSecII_Log">
            <p class="question-text">{{ q.label }} <span class="req">*</span></p>
            <div class="star-row">
                <button *ngFor="let n of [1,2,3,4,5]" type="button" class="star-btn"
                    [class.active]="formLog[q.key] === n" (click)="formLog[q.key] = n">
                    <span class="star-num">{{ n }}</span>
                    <mat-icon>{{ formLog[q.key] >= n ? 'star' : 'star_border' }}</mat-icon>
                </button>
            </div>
        </div>
        <div class="question-card">
            <p class="question-text">¿Qué aspecto consideras que el Staff de Logística puede mejorar para lograr una mejor organización en futuros eventos? <span class="req">*</span></p>
            <mat-form-field appearance="outline" class="full-width">
                <textarea matInput [(ngModel)]="formLog.logMejora" rows="3" placeholder="Tu respuesta"></textarea>
            </mat-form-field>
        </div>
    </div>

    <!-- ACOMPAÑAMIENTO: Paso 0 — Evaluación del Staff de Logística -->
    <div *ngIf="step === 0 && data.tipoStaff === 'acompanamiento'" class="step-content">
        <div class="section-header">I. Evaluación del Staff de Acompañamiento</div>
        <div class="instrucciones-box">
            <strong>Instrucciones:</strong> Lee cada afirmación y selecciona la opción que mejor refleje tu percepción.<br>
            <small><em>Nota: Todas las preguntas utilizan la misma escala de evaluación.</em></small>
        </div>
        <div class="question-card" *ngFor="let q of preguntasSecI_Acomp">
            <p class="question-text">{{ q.label }} <span class="req">*</span></p>
            <div class="star-row">
                <button *ngFor="let n of [1,2,3,4,5]" type="button" class="star-btn"
                    [class.active]="formAcomp[q.key] === n" (click)="formAcomp[q.key] = n">
                    <span class="star-num">{{ n }}</span>
                    <mat-icon>{{ formAcomp[q.key] >= n ? 'star' : 'star_border' }}</mat-icon>
                </button>
            </div>
        </div>
        <div class="question-card">
            <p class="question-text">¿Qué observaciones o recomendaciones harías para fortalecer el trabajo del Staff de Logística en futuros eventos? <span class="req">*</span></p>
            <mat-form-field appearance="outline" class="full-width">
                <textarea matInput [(ngModel)]="formAcomp.logObservaciones" rows="3" placeholder="Tu respuesta"></textarea>
            </mat-form-field>
        </div>
    </div>

    <!-- ACOMPAÑAMIENTO: Paso 1 — Autoevaluación -->
    <div *ngIf="step === 1 && data.tipoStaff === 'acompanamiento'" class="step-content">
        <div class="section-header">II. Autoevaluación del Staff de Acompañamiento</div>
        <div class="question-card" *ngFor="let q of preguntasSecII_Acomp">
            <p class="question-text">{{ q.label }} <span class="req">*</span></p>
            <div class="star-row">
                <button *ngFor="let n of [1,2,3,4,5]" type="button" class="star-btn"
                    [class.active]="formAcomp[q.key] === n" (click)="formAcomp[q.key] = n">
                    <span class="star-num">{{ n }}</span>
                    <mat-icon>{{ formAcomp[q.key] >= n ? 'star' : 'star_border' }}</mat-icon>
                </button>
            </div>
        </div>
        <div class="question-card">
            <p class="question-text">¿Qué acciones consideras que ayudarían a mejorar el desempeño del Staff de Acompañamiento en futuros eventos? <span class="req">*</span></p>
            <mat-form-field appearance="outline" class="full-width">
                <textarea matInput [(ngModel)]="formAcomp.autoMejora" rows="3" placeholder="Tu respuesta"></textarea>
            </mat-form-field>
        </div>
    </div>

    <!-- Navegación -->
    <div class="nav-row">
        <button mat-stroked-button (click)="atras()" class="btn-atras">
            {{ step === 0 ? 'Cancelar' : 'Atrás' }}
        </button>
        <button *ngIf="step < 1" mat-flat-button color="primary" (click)="nextStep()" class="btn-sig">Siguiente</button>
        <button *ngIf="step === 1" mat-flat-button color="primary" (click)="enviar()" [disabled]="sending" class="btn-sig">
            <mat-icon *ngIf="!sending">send</mat-icon>
            {{ sending ? 'Enviando...' : 'Enviar' }}
        </button>
    </div>
</div>
    `,
    styles: [`
.encuesta-wrapper { font-family: 'Inter','Roboto',sans-serif; max-width: 680px; margin: 0 auto; }
.encuesta-header { background: linear-gradient(135deg,#0d47a1,#1565c0); color:white; padding:24px 28px 20px; }
.logos-row { display:flex; align-items:center; gap:16px; margin-bottom:14px; }
.logo-img { height:38px; object-fit:contain; filter:brightness(0) invert(1); }
.evento-title { font-size:22px; font-weight:700; margin:0 0 8px; }
.bienvenida { font-size:13px; margin:0 0 4px; }
.bienvenida-sub { font-size:12px; opacity:.85; margin:0 0 8px; line-height:1.6; }
.tiempo { font-size:13px; margin:0 0 12px; }
.time-badge { color:#ffd740; font-weight:700; }
.escala-ref { background:rgba(255,255,255,.15); border-radius:8px; padding:8px 14px; font-size:11px; display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
.escala-item { background:rgba(255,255,255,.2); border-radius:4px; padding:2px 8px; }
.steps-indicator { display:flex; align-items:center; gap:8px; padding:12px 28px; background:#f5f7ff; border-bottom:1px solid #e0e6ff; font-size:13px; font-weight:500; color:#9aa3bf; }
.steps-indicator span.active { color:#1565c0; font-weight:700; }
.steps-indicator span:not(.sep):not(.active) { cursor:pointer; }
.sep { color:#c0c8e0; }
.step-content { padding:20px 28px; }
.section-header { background:#1565c0; color:white; padding:10px 16px; border-radius:8px; font-weight:600; font-size:14px; margin-bottom:16px; }
.instrucciones-box { background:#f0f4ff; border-left:4px solid #1565c0; padding:12px 16px; border-radius:0 8px 8px 0; font-size:13px; margin-bottom:16px; }
.question-card { background:white; border:1px solid #e8eaf6; border-radius:12px; padding:18px 20px; margin-bottom:14px; box-shadow:0 2px 8px rgba(0,0,0,.04); }
.question-text { font-size:14px; font-weight:500; color:#222; margin:0 0 14px; line-height:1.5; }
.req { color:#e53935; }
.star-row { display:flex; gap:12px; }
.star-btn { background:none; border:none; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:2px; padding:4px; transition:transform .15s; color:#bbb; }
.star-btn:hover, .star-btn.active { color:#1565c0; transform:scale(1.15); }
.star-btn mat-icon { font-size:28px; width:28px; height:28px; }
.star-num { font-size:11px; font-weight:600; color:inherit; }
.full-width { width:100%; }
.nav-row { display:flex; justify-content:space-between; padding:16px 28px 24px; border-top:1px solid #eef0f7; }
.btn-atras { min-width:100px; }
.btn-sig { min-width:140px; background:linear-gradient(135deg,#1565c0,#1976d2) !important; font-weight:600; }
    `]
})
export class EncuestaStaffDialogComponent implements OnInit {
    step = 0;
    sending = false;

    get tipoLabel(): string {
        return this.data.tipoStaff === 'logistica' ? 'Staff de Logística' : 'Staff de Acompañamiento';
    }

    escala = [
        { val: 1, label: 'Totalmente de acuerdo' },
        { val: 2, label: 'De acuerdo' },
        { val: 3, label: 'Ni de acuerdo ni en desacuerdo' },
        { val: 4, label: 'En desacuerdo' },
        { val: 5, label: 'Totalmente en desacuerdo' }
    ];

    // Logística – Sección I: Evaluación del Acompañamiento
    preguntasSecI_Log = [
        { key: 'acompComunicacion', label: 'La comunicación del Staff de Acompañamiento con el equipo de Logística fue clara y oportuna.' },
        { key: 'acompCumplimiento', label: 'El Staff de Acompañamiento cumplió con las actividades asignadas en tiempo y forma.' },
        { key: 'acompDisposicion',  label: 'El Staff de Acompañamiento mostró disposición para colaborar cuando se presentaron imprevistos.' },
        { key: 'acompCoordinacion', label: 'La coordinación entre el Staff de Logística y el Staff de Acompañamiento fue efectiva durante el evento.' }
    ];

    // Logística – Sección II: Autoevaluación
    preguntasSecII_Log = [
        { key: 'logDesempeno',    label: 'El Staff de Logística desempeñó sus funciones de manera eficiente durante el evento.' },
        { key: 'logCumplimiento', label: 'El Staff de Logística cumplió con las responsabilidades que le fueron asignadas.' },
        { key: 'logComunicacion', label: 'Existió una buena comunicación entre los integrantes del Staff de Logística.' },
        { key: 'logImprevistos',  label: 'El Staff de Logística respondió de manera adecuada ante situaciones imprevistas.' }
    ];

    // Acompañamiento – Sección I: Evaluación del Staff de Logística
    preguntasSecI_Acomp = [
        { key: 'logOrganizacion', label: 'El Staff de Logística organizó de manera eficiente las actividades del evento.' },
        { key: 'logInformacion',  label: 'Recibí oportunamente la información necesaria para desempeñar mis actividades.' },
        { key: 'logResolucion',   label: 'El Staff de Logística resolvió de manera efectiva las situaciones que se presentaron durante el evento.' },
        { key: 'logCoordinacion', label: 'La coordinación entre el Staff de Logística y el Staff de Acompañamiento fue efectiva durante el evento.' },
        { key: 'equipoDesempeno', label: '¿Cómo evaluarías el desempeño general de tu equipo durante el evento?' }
    ];

    // Acompañamiento – Sección II: Autoevaluación
    preguntasSecII_Acomp = [
        { key: 'autoDesempeno',    label: 'El Staff de Acompañamiento desempeñó sus funciones de manera eficiente durante el evento.' },
        { key: 'autoCumplimiento', label: 'El Staff de Acompañamiento cumplió con las responsabilidades que le fueron asignadas.' },
        { key: 'autoComunicacion', label: 'Existió una buena comunicación entre los integrantes del Staff de Acompañamiento.' },
        { key: 'autoImprevistos',  label: 'El Staff de Acompañamiento respondió de manera adecuada ante situaciones imprevistas.' }
    ];

    formLog: any = {
        acompComunicacion: null, acompCumplimiento: null, acompDisposicion: null, acompCoordinacion: null,
        acompComentarios: '',
        logDesempeno: null, logCumplimiento: null, logComunicacion: null, logImprevistos: null,
        logMejora: ''
    };

    formAcomp: any = {
        logOrganizacion: null, logInformacion: null, logResolucion: null, logCoordinacion: null,
        equipoDesempeno: null, logObservaciones: '',
        autoDesempeno: null, autoCumplimiento: null, autoComunicacion: null, autoImprevistos: null,
        autoMejora: ''
    };

    constructor(
        public dialogRef: MatDialogRef<EncuestaStaffDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: EncuestaStaffDialogData,
        private _encuestaService: EncuestasEventoService
    ) {}

    ngOnInit(): void {
        const obs$ = this.data.tipoStaff === 'logistica'
            ? this._encuestaService.getEncuestaStaff(this.data.staffId, this.data.eventoId)
            : this._encuestaService.getEncuestaAcompanamiento(this.data.staffId, this.data.eventoId);

        obs$.subscribe({
            next: (res) => {
                if (res?.completada) {
                    Swal.fire('Encuesta ya completada', '¡Gracias! Ya registraste tu retroalimentación.', 'info');
                    this.dialogRef.close();
                }
            },
            error: () => {}
        });
    }

    atras(): void {
        if (this.step > 0) {
            this.step--;
        } else {
            this.dialogRef.close();
        }
    }

    nextStep(): void {
        if (this.data.tipoStaff === 'logistica') {
            const incompleto = this.preguntasSecI_Log.some(q => !this.formLog[q.key]);
            if (incompleto) {
                Swal.fire('Campos requeridos', 'Por favor completa todas las preguntas.', 'warning');
                return;
            }
        } else {
            const incompleto = this.preguntasSecI_Acomp.some(q => !this.formAcomp[q.key]);
            if (incompleto) {
                Swal.fire('Campos requeridos', 'Por favor completa todas las preguntas.', 'warning');
                return;
            }
        }
        this.step++;
    }

    enviar(): void {
        this.sending = true;

        let obs$;
        if (this.data.tipoStaff === 'logistica') {
            const incompleto = this.preguntasSecII_Log.some(q => !this.formLog[q.key]);
            if (incompleto) {
                this.sending = false;
                Swal.fire('Campos requeridos', 'Por favor completa todas las preguntas.', 'warning');
                return;
            }
            obs$ = this._encuestaService.guardarEncuestaStaff(this.data.staffId, this.data.eventoId, {
                acompComunicacion: this.formLog.acompComunicacion,
                acompCumplimiento: this.formLog.acompCumplimiento,
                acompDisposicion: this.formLog.acompDisposicion,
                acompCoordinacion: this.formLog.acompCoordinacion,
                acompComentarios: this.formLog.acompComentarios,
                logDesempeno: this.formLog.logDesempeno,
                logCumplimiento: this.formLog.logCumplimiento,
                logComunicacion: this.formLog.logComunicacion,
                logImprevistos: this.formLog.logImprevistos,
                logMejora: this.formLog.logMejora
            });
        } else {
            const incompleto = this.preguntasSecII_Acomp.some(q => !this.formAcomp[q.key]);
            if (incompleto) {
                this.sending = false;
                Swal.fire('Campos requeridos', 'Por favor completa todas las preguntas.', 'warning');
                return;
            }
            obs$ = this._encuestaService.guardarEncuestaAcompanamiento(this.data.staffId, this.data.eventoId, {
                logOrganizacion: this.formAcomp.logOrganizacion,
                logInformacion: this.formAcomp.logInformacion,
                logResolucion: this.formAcomp.logResolucion,
                logCoordinacion: this.formAcomp.logCoordinacion,
                equipoDesempeno: this.formAcomp.equipoDesempeno,
                logObservaciones: this.formAcomp.logObservaciones,
                autoDesempeno: this.formAcomp.autoDesempeno,
                autoCumplimiento: this.formAcomp.autoCumplimiento,
                autoComunicacion: this.formAcomp.autoComunicacion,
                autoImprevistos: this.formAcomp.autoImprevistos,
                autoMejora: this.formAcomp.autoMejora
            });
        }

        obs$.subscribe({
            next: (res: any) => {
                Swal.fire({
                    title: '¡Encuesta enviada!',
                    text: res?.mensaje || 'Gracias por tu retroalimentación.',
                    icon: 'success',
                    timer: 3000,
                    showConfirmButton: false
                });
                this.dialogRef.close(true);
            },
            error: (err: any) => {
                this.sending = false;
                Swal.fire('Error', err?.error?.mensaje || 'No se pudo guardar la encuesta.', 'error');
            }
        });
    }
}
