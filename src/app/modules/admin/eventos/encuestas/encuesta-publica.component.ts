import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { StarRatingModule } from 'angular-star-rating';
import { EncuestasEventoService } from './encuestas-evento.service';

@Component({
    selector: 'app-encuesta-publica',
    standalone: true,
    imports: [CommonModule, FormsModule, MatIconModule, StarRatingModule],
    encapsulation: ViewEncapsulation.None,
    template: `
<div class="survey-wrapper">
  <!-- LOADING -->
  <div *ngIf="loading" class="state-container">
    <div class="state-card">
      <div class="spinner"></div>
      <p>Cargando encuesta...</p>
    </div>
  </div>

  <!-- ERROR -->
  <div *ngIf="!loading && !datos" class="state-container">
    <div class="state-card">
      <div class="state-icon">❌</div>
      <h2>Enlace inválido</h2>
      <p>Este enlace no existe o ha expirado.</p>
    </div>
  </div>

  <!-- YA RESPONDIDA -->
  <div *ngIf="!loading && datos?.respondido && !enviado" class="state-container">
    <div class="state-card">
      <div class="state-icon">✅</div>
      <h2>¡Gracias!</h2>
      <p>Tu opinión ya fue registrada.</p>
    </div>
  </div>

  <!-- ÉXITO -->
  <div *ngIf="enviado" class="state-container">
    <div class="state-card">
      <div class="state-icon">🎉</div>
      <h2>¡Gracias, {{ datos?.nombre?.split(' ')[0] }}!</h2>
      <p>Tu encuesta fue registrada exitosamente.</p>
    </div>
  </div>

  <!-- FORMULARIO -->
  <div *ngIf="!loading && datos && !datos.respondido && !enviado" class="form-container">
    <div class="form-card">
      <!-- Header con Logo -->
      <div class="card-header">
        <img src="assets/eventos/foro-energiza-logo.png" alt="Foro Energiza" class="logo">
        <div class="header-text">
          <div class="event-label">{{ datos.nombreEvento }}</div>
          <h1 class="header-title">Encuesta de Satisfacción</h1>
        </div>
      </div>

      <!-- Intro -->
      <p class="intro-text">Hola <strong>{{ datos.nombre }}</strong>, tu opinión nos ayuda a mejorar. Esto toma menos de 3 minutos.</p>

      <!-- QUESTION 1: Perfil -->
      <div class="form-group">
        <label class="group-title">¿Con qué perfil asististe?</label>
        <div class="button-group">
          <button *ngFor="let p of perfiles" class="btn-option" [class.selected]="form.perfil === p" (click)="form.perfil = p">{{ p }}</button>
        </div>
      </div>

      <!-- QUESTION 2-6: Estrellas -->
      <div class="form-group">
        <label class="group-title">Cuéntanos tu experiencia</label>
        <div class="ratings-container">
          <div class="rating-row" *ngFor="let q of preguntas">
            <span class="rating-question">{{ q.label }}</span>
            <div class="rating-stars">
              <star-rating
                [(ngModel)]="form[q.key]"
                [starType]="'svg'"
                [rating]="form[q.key] || 0"
                [ratingOnHover]="true"
                (ratingUpdated)="form[q.key] = $event.newValue"
                [size]="'large'"
                [readOnly]="false"
                [color]="'#f39c12'">
              </star-rating>
            </div>
          </div>
        </div>
      </div>

      <!-- QUESTION 7: NPS -->
      <div class="form-group">
        <label class="group-title">¿Recomendarías Foro Energiza? (1=No, 5=Sí)</label>
        <div class="nps-group">
          <button *ngFor="let n of [1,2,3,4,5]" class="btn-nps" [class.selected]="form.npsRecomendacion === n" (click)="form.npsRecomendacion = n">{{ n }}</button>
        </div>
      </div>

      <!-- QUESTION 8: Participación -->
      <div class="form-group">
        <label class="group-title">¿Participarías en la próxima edición?</label>
        <div class="button-group">
          <button *ngFor="let op of participaciones" class="btn-option" [class.selected]="form.participacionFutura === op" (click)="form.participacionFutura = op">{{ op }}</button>
        </div>
      </div>

      <!-- QUESTION 9: Contacto -->
      <div class="form-group">
        <label class="group-title">¿Quieres que JR Ingeniería te contacte?</label>
        <div class="button-group">
          <button class="btn-option" [class.selected]="form.quiereContacto === true" (click)="form.quiereContacto = true">Sí</button>
          <button class="btn-option" [class.selected]="form.quiereContacto === false" (click)="form.quiereContacto = false">No por ahora</button>
        </div>
      </div>

      <!-- QUESTION 10: Mejoras -->
      <div class="form-group last">
        <label class="group-title">¿Qué podríamos mejorar?</label>
        <textarea [(ngModel)]="form.queMejorar" class="textarea" placeholder="Tus sugerencias nos importan..."></textarea>
      </div>

      <!-- Submit -->
      <button class="btn-submit" (click)="enviar()" [disabled]="saving || !esValido()">
        {{ saving ? 'Enviando...' : 'Enviar encuesta' }}
      </button>

      <p *ngIf="error" class="error-msg">{{ error }}</p>
    </div>
  </div>
</div>
    `,
    styles: [`
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');

:host {
  display: block;
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  position: fixed;
  top: 0;
  left: 0;
  overflow: hidden;
}

.survey-wrapper {
  width: 100vw;
  height: 100vh;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-family: 'Inter', sans-serif;
  overflow-y: auto;
  margin: 0;
  position: fixed;
  top: 0;
  left: 0;
}

/* === STATE CARDS === */
.state-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.state-card {
  background: white;
  border-radius: 20px;
  padding: 60px 40px;
  max-width: 420px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.state-card .state-icon {
  font-size: 56px;
  margin-bottom: 16px;
}

.state-card h2 {
  font-family: 'Poppins', sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 8px 0;
}

.state-card p {
  font-size: 14px;
  color: #666;
  margin: 8px 0 0 0;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5f1ed;
  border-top-color: #1e8449;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* === FORM CONTAINER === */
.form-container {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-card {
  background: white;
  border-radius: 18px;
  padding: 40px;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.15);
}

@media (max-width: 640px) {
  .form-card {
    border-radius: 16px;
    padding: 30px 20px;
  }
}

/* === HEADER === */
.card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 2px solid #f0f0f0;
}

.logo {
  height: 60px;
  width: auto;
  object-fit: contain;
}

.header-text {
  flex: 1;
}

.event-label {
  font-size: 11px;
  font-weight: 700;
  color: #1e8449;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 4px 0;
}

.header-title {
  font-family: 'Poppins', sans-serif;
  font-size: 28px;
  font-weight: 800;
  color: #1a1a2e;
  margin: 0;
}

.intro-text {
  font-size: 14px;
  color: #666;
  margin: 0 0 28px 0;
  line-height: 1.6;
}

.intro-text strong {
  color: #1e8449;
}

/* === FORM GROUPS === */
.form-group {
  margin-bottom: 26px;
}

.form-group.last {
  margin-bottom: 0;
}

.group-title {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* === BUTTONS === */
.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.btn-option {
  padding: 10px 16px;
  border: 1.5px solid #e0e0e0;
  background: white;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-option:hover {
  border-color: #1e8449;
  color: #1e8449;
}

.btn-option.selected {
  background: #1e8449;
  color: white;
  border-color: #1e8449;
}

/* === RATINGS === */
.ratings-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rating-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}

.rating-question {
  font-size: 13px;
  color: #666;
  flex: 1;
}

.rating-stars {
  display: flex;
  justify-content: flex-end;
}

/* === NPS === */
.nps-group {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.btn-nps {
  width: 44px;
  height: 44px;
  border: 1.5px solid #e0e0e0;
  background: white;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 700;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-nps:hover {
  border-color: #1e8449;
  color: #1e8449;
}

.btn-nps.selected {
  background: #1e8449;
  color: white;
  border-color: #1e8449;
}

/* === TEXTAREA === */
.textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  resize: vertical;
  min-height: 100px;
  outline: none;
  transition: all 0.2s ease;
}

.textarea:focus {
  border-color: #1e8449;
  box-shadow: 0 0 0 3px rgba(30, 132, 73, 0.1);
}

.textarea::placeholder {
  color: #999;
}

/* === SUBMIT === */
.btn-submit {
  width: 100%;
  padding: 14px;
  margin-top: 20px;
  border: none;
  border-radius: 10px;
  background: #1e8449;
  color: white;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 20px rgba(30, 132, 73, 0.25);
}

.btn-submit:hover:not(:disabled) {
  background: #0d5a3f;
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(30, 132, 73, 0.35);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* === ERROR === */
.error-msg {
  color: #dc2626;
  font-size: 12px;
  text-align: center;
  background: #fee2e2;
  padding: 10px 12px;
  border-radius: 8px;
  margin-top: 12px;
  border-left: 3px solid #dc2626;
}

@media (max-width: 480px) {
  .form-card {
    padding: 24px 18px;
  }

  .header-title {
    font-size: 22px;
  }

  .card-header {
    flex-direction: column;
    text-align: center;
  }

  .logo {
    height: 50px;
  }

  .rating-row {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .rating-stars {
    justify-content: flex-start;
  }
}
    `]
})
export class EncuestaPublicaComponent implements OnInit {
    token = '';
    datos: any = null;
    loading = true;
    saving = false;
    enviado = false;
    error = '';
    logoError = false;

    form: any = {
        perfil: null, expGeneral: null, contactosValor: null, alianzaJR: null,
        interesForoEnergiza: null, organizacionCumple: null,
        queMejorar: '', npsRecomendacion: null, participacionFutura: null, quiereContacto: null
    };

    perfiles = ['Profesional / Empresario', 'Estudiante', 'Expositor', 'Invitado Especial'];
    preguntas = [
        { key: 'expGeneral',          label: '¿Cómo calificarías tu experiencia general en el evento?' },
        { key: 'contactosValor',      label: '¿Generaste contactos de valor?' },
        { key: 'alianzaJR',           label: '¿Cómo calificarías a JR Ingeniería como aliado estratégico?' },
        { key: 'interesForoEnergiza', label: '¿Interés en Foro Energiza 2026?' },
        { key: 'organizacionCumple',  label: '¿La organización cumplió tus expectativas?' }
    ];
    participaciones = ['Como visitante', 'Como expositor / patrocinador', 'No lo sé aún', 'No asistiría'];

    constructor(private _route: ActivatedRoute, private _svc: EncuestasEventoService) {}

    ngOnInit(): void {
        this.token = this._route.snapshot.paramMap.get('token') || '';
        if (!this.token) { this.loading = false; return; }
        this._svc.getEncuestaFormPorToken(this.token).subscribe({
            next: d => { this.datos = d; this.loading = false; },
            error: () => { this.datos = null; this.loading = false; }
        });
    }

    esValido(): boolean {
        return !!this.form.expGeneral && !!this.form.npsRecomendacion && !!this.form.perfil;
    }

    enviar(): void {
        if (!this.esValido()) return;
        this.saving = true;
        this.error = '';
        this._svc.guardarEncuestaFormPorToken(this.token, this.form).subscribe({
            next: () => { this.saving = false; this.enviado = true; },
            error: err => { this.saving = false; this.error = err?.error?.mensaje || 'Error al guardar. Intenta de nuevo.'; }
        });
    }
}
