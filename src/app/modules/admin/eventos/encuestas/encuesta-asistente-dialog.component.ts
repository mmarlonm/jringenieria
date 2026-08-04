import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatStepperModule } from '@angular/material/stepper';
import { EncuestasEventoService } from './encuestas-evento.service';
import Swal from 'sweetalert2';

export interface EncuestaAsistenteDialogData {
    asistenteId: number;
    nombreEvento: string;
    nombreAsistente: string;
}

@Component({
    selector: 'app-encuesta-asistente-dialog',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatDialogModule, MatButtonModule, MatIconModule,
        MatRadioModule, MatInputModule, MatFormFieldModule, MatStepperModule
    ],
    template: `
<div class="encuesta-wrapper">
    <!-- Header -->
    <div class="encuesta-header">
        <div class="logos-row">
            <img src="assets/images/logo/logo-jr.png" alt="JR" class="logo-img" onerror="this.style.display='none'">
            <img src="assets/images/logo/foro-energiza.png" alt="Foro Energiza" class="logo-img" onerror="this.style.display='none'">
            <img src="assets/images/logo/pachuca.png" alt="Pachuca" class="logo-img" onerror="this.style.display='none'">
        </div>
        <h2 class="evento-title">{{ data.nombreEvento }}</h2>
        <p class="bienvenida">Gracias por acompañarnos. Tu opinión es muy importante para nosotros.</p>
        <p class="instrucciones-sub">Las respuestas serán tratadas de manera confidencial.</p>

        <!-- Escala de referencia -->
        <div class="escala-ref">
            <strong>Escala de evaluación:</strong>
            <span *ngFor="let e of escala" class="escala-item">
                <strong>{{ e.val }}</strong> = {{ e.label }}
            </span>
        </div>
    </div>

    <!-- Paso actual -->
    <div class="steps-indicator">
        <span [class.active]="step === 0" (click)="step=0">Perfil</span>
        <span class="sep">›</span>
        <span [class.active]="step === 1" (click)="step >= 1 && (step=1)">Evaluación</span>
        <span class="sep">›</span>
        <span [class.active]="step === 2" (click)="step >= 2 && (step=2)">Participación</span>
    </div>

    <!-- PASO 0: Perfil -->
    <div *ngIf="step === 0" class="step-content">
        <div class="section-header">I. Perfil del Asistente</div>
        <div class="question-card">
            <p class="question-text">¿Cuál de las siguientes opciones describe mejor su perfil? <span class="req">*</span></p>
            <div class="radio-options">
                <label *ngFor="let opt of perfilOptions" class="radio-opt" [class.selected]="form.perfil === opt">
                    <input type="radio" [(ngModel)]="form.perfil" [value]="opt" name="perfil">
                    {{ opt }}
                </label>
            </div>
        </div>
    </div>

    <!-- PASO 1: Evaluación del Evento -->
    <div *ngIf="step === 1" class="step-content">
        <div class="section-header">I. Evaluación del Evento</div>
        <div class="instrucciones-box">
            <strong>Instrucciones:</strong> Lee cada afirmación y selecciona la opción que mejor refleje tu percepción.<br>
            <em>Nota: Todas las preguntas utilizan la misma escala de evaluación.</em>
        </div>

        <div class="question-card" *ngFor="let q of evalPreguntas">
            <p class="question-text">{{ q.label }} <span class="req">*</span></p>
            <div class="star-row">
                <button *ngFor="let n of [1,2,3,4,5]" type="button" class="star-btn"
                    [class.active]="form[q.key] === n"
                    (click)="form[q.key] = n">
                    <span class="star-num">{{ n }}</span>
                    <mat-icon>{{ form[q.key] >= n ? 'star' : 'star_border' }}</mat-icon>
                </button>
            </div>
        </div>

        <div class="question-card">
            <p class="question-text">¿Qué aspecto considera que podríamos mejorar para hacer aún más valiosa su experiencia? <span class="req">*</span></p>
            <mat-form-field appearance="outline" class="full-width">
                <textarea matInput [(ngModel)]="form.queMejorar" rows="3" placeholder="Tu respuesta"></textarea>
            </mat-form-field>
        </div>

        <div class="question-card">
            <p class="question-text">En una escala del 1 al 5, ¿qué tan probable es que recomiende este evento? <span class="req">*</span></p>
            <div class="star-row">
                <button *ngFor="let n of [1,2,3,4,5]" type="button" class="star-btn radio-style"
                    [class.active]="form.npsRecomendacion === n"
                    (click)="form.npsRecomendacion = n">
                    <span class="star-num">{{ n }}</span>
                    <div class="radio-circle" [class.filled]="form.npsRecomendacion === n"></div>
                </button>
            </div>
        </div>
    </div>

    <!-- PASO 2: Participación futura -->
    <div *ngIf="step === 2" class="step-content">
        <div class="section-header">II. Participación en Foro Energiza 2026</div>

        <div class="question-card">
            <p class="question-text">¿Cómo le gustaría participar en Foro Energiza 2026? <span class="req">*</span></p>
            <div class="radio-options">
                <label *ngFor="let opt of participacionOptions" class="radio-opt" [class.selected]="form.participacionFutura === opt">
                    <input type="radio" [(ngModel)]="form.participacionFutura" [value]="opt" name="participacion">
                    {{ opt }}
                </label>
            </div>
        </div>

        <div class="question-card">
            <p class="question-text">¿Le gustaría que un representante de JR Ingeniería Eléctrica se comunique con usted? <span class="req">*</span></p>
            <div class="radio-options">
                <label class="radio-opt" [class.selected]="form.quiereContacto === true">
                    <input type="radio" [(ngModel)]="form.quiereContacto" [value]="true" name="contacto"> Sí
                </label>
                <label class="radio-opt" [class.selected]="form.quiereContacto === false">
                    <input type="radio" [(ngModel)]="form.quiereContacto" [value]="false" name="contacto"> No
                </label>
            </div>
        </div>
    </div>

    <!-- Navegación -->
    <div class="nav-row">
        <button mat-stroked-button (click)="step > 0 ? step-- : dialogRef.close()" class="btn-atras">
            {{ step === 0 ? 'Cancelar' : 'Atrás' }}
        </button>
        <button *ngIf="step < 2" mat-flat-button color="primary" (click)="nextStep()" class="btn-sig">
            Siguiente
        </button>
        <button *ngIf="step === 2" mat-flat-button color="primary" (click)="enviar()" [disabled]="sending" class="btn-sig">
            <mat-icon *ngIf="!sending">send</mat-icon>
            {{ sending ? 'Enviando...' : 'Enviar' }}
        </button>
    </div>
</div>
    `,
    styles: [`
.encuesta-wrapper {
    font-family: 'Inter', 'Roboto', sans-serif;
    max-width: 680px;
    margin: 0 auto;
    padding: 0;
}
.encuesta-header {
    background: linear-gradient(135deg, #0d47a1, #1565c0);
    color: white;
    padding: 24px 28px 20px;
    border-radius: 0;
}
.logos-row {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
}
.logo-img { height: 40px; object-fit: contain; filter: brightness(0) invert(1); }
.evento-title { font-size: 22px; font-weight: 700; margin: 0 0 6px; }
.bienvenida { font-size: 13px; margin: 0 0 4px; opacity: 0.9; }
.instrucciones-sub { font-size: 12px; opacity: 0.75; margin: 0 0 12px; }
.escala-ref {
    background: rgba(255,255,255,0.15);
    border-radius: 8px;
    padding: 8px 14px;
    font-size: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
}
.escala-item { background: rgba(255,255,255,0.2); border-radius: 4px; padding: 2px 8px; }
.steps-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 28px;
    background: #f5f7ff;
    border-bottom: 1px solid #e0e6ff;
    font-size: 13px;
    font-weight: 500;
    color: #9aa3bf;
}
.steps-indicator span.active { color: #1565c0; font-weight: 700; cursor: default; }
.steps-indicator span:not(.sep):not(.active) { cursor: pointer; }
.sep { color: #c0c8e0; }
.step-content { padding: 20px 28px; }
.section-header {
    background: #1565c0;
    color: white;
    padding: 10px 16px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 16px;
}
.instrucciones-box {
    background: #f0f4ff;
    border-left: 4px solid #1565c0;
    padding: 12px 16px;
    border-radius: 0 8px 8px 0;
    font-size: 13px;
    margin-bottom: 16px;
    color: #334;
}
.question-card {
    background: white;
    border: 1px solid #e8eaf6;
    border-radius: 12px;
    padding: 18px 20px;
    margin-bottom: 14px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.question-text {
    font-size: 14px;
    font-weight: 500;
    color: #222;
    margin: 0 0 14px;
    line-height: 1.5;
}
.req { color: #e53935; margin-left: 2px; }
.star-row {
    display: flex;
    gap: 12px;
    align-items: center;
}
.star-btn {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 4px;
    transition: transform 0.15s;
    color: #bbb;
}
.star-btn:hover, .star-btn.active { color: #1565c0; transform: scale(1.15); }
.star-btn mat-icon { font-size: 28px; width: 28px; height: 28px; }
.star-num { font-size: 11px; font-weight: 600; color: inherit; }
.radio-style .radio-circle {
    width: 20px; height: 20px;
    border: 2px solid #bbb;
    border-radius: 50%;
    transition: all 0.2s;
}
.radio-style.active .radio-circle {
    border-color: #1565c0;
    background: #1565c0;
}
.radio-options { display: flex; flex-direction: column; gap: 10px; }
.radio-opt {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    padding: 10px 14px;
    border: 1.5px solid #e0e3f0;
    border-radius: 8px;
    font-size: 14px;
    transition: all 0.2s;
}
.radio-opt:hover { border-color: #5c7cfa; background: #f5f7ff; }
.radio-opt.selected { border-color: #1565c0; background: #e8f0fe; color: #1565c0; font-weight: 600; }
.radio-opt input { accent-color: #1565c0; }
.full-width { width: 100%; }
.nav-row {
    display: flex;
    justify-content: space-between;
    padding: 16px 28px 24px;
    border-top: 1px solid #eef0f7;
    gap: 12px;
}
.btn-atras { min-width: 100px; }
.btn-sig {
    min-width: 140px;
    background: linear-gradient(135deg, #1565c0, #1976d2) !important;
    font-weight: 600;
    letter-spacing: 0.5px;
}
    `]
})
export class EncuestaAsistenteDialogComponent implements OnInit {
    step = 0;
    sending = false;

    escala = [
        { val: 1, label: 'Totalmente de acuerdo' },
        { val: 2, label: 'De acuerdo' },
        { val: 3, label: 'Ni de acuerdo ni en desacuerdo' },
        { val: 4, label: 'En desacuerdo' },
        { val: 5, label: 'Totalmente en desacuerdo' }
    ];

    perfilOptions = ['Empresario(a)', 'Director(a) y Gerente', 'Cámara o Asociación Empresarial', 'Otros'];

    participacionOptions = [
        'Como visitante',
        'Como patrocinador',
        'Me gustaría recibir más información',
        'Aún no lo sé'
    ];

    evalPreguntas = [
        { key: 'expGeneral',        label: 'Mi experiencia general durante el evento fue satisfactoria.' },
        { key: 'contactosValor',    label: 'Durante el evento logré generar contactos de valor para mi organización.' },
        { key: 'alianzaJR',         label: 'Después de asistir al evento, considero a JR Ingeniería Eléctrica como un aliado estratégico.' },
        { key: 'interesForoEnergiza', label: 'La presentación del Foro Energiza 2026 despertó el interés de mi organización para participar en futuras ediciones.' },
        { key: 'organizacionCumple', label: 'La organización del evento cumplió con mis expectativas.' }
    ];

    form: any = {
        perfil: null,
        expGeneral: null,
        contactosValor: null,
        alianzaJR: null,
        interesForoEnergiza: null,
        organizacionCumple: null,
        queMejorar: '',
        npsRecomendacion: null,
        participacionFutura: null,
        quiereContacto: null
    };

    constructor(
        public dialogRef: MatDialogRef<EncuestaAsistenteDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: EncuestaAsistenteDialogData,
        private _encuestaService: EncuestasEventoService
    ) {}

    ngOnInit(): void {
        // Verificar si ya completó la encuesta
        this._encuestaService.getEncuestaAsistente(this.data.asistenteId).subscribe({
            next: (res) => {
                if (res?.completada) {
                    Swal.fire('Encuesta ya completada', 'Ya registraste tu retroalimentación. ¡Gracias!', 'info');
                    this.dialogRef.close();
                }
            },
            error: () => {} // 404 significa que no ha respondido aún — es lo esperado
        });
    }

    nextStep(): void {
        if (this.step === 0 && !this.form.perfil) {
            Swal.fire('Campo requerido', 'Por favor selecciona tu perfil.', 'warning');
            return;
        }
        if (this.step === 1) {
            const incompleto = this.evalPreguntas.some(q => !this.form[q.key]);
            if (incompleto || !this.form.npsRecomendacion) {
                Swal.fire('Campos requeridos', 'Por favor responde todas las preguntas de evaluación.', 'warning');
                return;
            }
        }
        this.step++;
    }

    enviar(): void {
        if (!this.form.participacionFutura || this.form.quiereContacto === null) {
            Swal.fire('Campos requeridos', 'Por favor completa todas las preguntas.', 'warning');
            return;
        }

        this.sending = true;
        const payload = {
            perfil: this.form.perfil,
            expGeneral: this.form.expGeneral,
            contactosValor: this.form.contactosValor,
            alianzaJR: this.form.alianzaJR,
            interesForoEnergiza: this.form.interesForoEnergiza,
            organizacionCumple: this.form.organizacionCumple,
            queMejorar: this.form.queMejorar,
            npsRecomendacion: this.form.npsRecomendacion,
            participacionFutura: this.form.participacionFutura,
            quiereContacto: this.form.quiereContacto
        };

        this._encuestaService.guardarEncuestaAsistente(this.data.asistenteId, payload).subscribe({
            next: (res) => {
                Swal.fire({
                    title: '¡Gracias!',
                    text: res?.mensaje || 'Tu encuesta fue registrada con éxito.',
                    icon: 'success',
                    timer: 3000,
                    showConfirmButton: false
                });
                this.dialogRef.close(true);
            },
            error: (err) => {
                this.sending = false;
                Swal.fire('Error', err?.error?.mensaje || 'No se pudo guardar la encuesta.', 'error');
            }
        });
    }
}
