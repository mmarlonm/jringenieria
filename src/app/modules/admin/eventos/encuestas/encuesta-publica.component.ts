import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { EncuestasEventoService } from './encuestas-evento.service';

@Component({
    selector: 'app-encuesta-publica',
    standalone: true,
    imports: [CommonModule, FormsModule, MatIconModule],
    template: `
<div class="enc-page">
  <!-- LOADING -->
  <div *ngIf="loading" class="enc-loading">
    <div class="spinner"></div>
    <p>Cargando encuesta...</p>
  </div>

  <!-- ERROR / INVÁLIDO -->
  <div *ngIf="!loading && !datos" class="enc-error">
    <div class="enc-icon">❌</div>
    <h2>Enlace inválido</h2>
    <p>Este enlace de encuesta no existe o ha expirado.</p>
  </div>

  <!-- YA RESPONDIDA -->
  <div *ngIf="!loading && datos?.respondido && !enviado" class="enc-success">
    <div class="enc-icon">✅</div>
    <h2>Encuesta ya respondida</h2>
    <p>Ya registramos tu opinión sobre <strong>{{ datos?.nombreEvento }}</strong>. ¡Muchas gracias!</p>
  </div>

  <!-- GRACIAS -->
  <div *ngIf="enviado" class="enc-success">
    <div class="enc-icon">🎉</div>
    <h2>¡Gracias, {{ datos?.nombre?.split(' ')[0] }}!</h2>
    <p>Tu encuesta fue registrada exitosamente.</p>
    <p style="font-size:13px;color:#888;margin-top:8px">Tu retroalimentación nos ayuda a mejorar cada edición de <strong>{{ datos?.nombreEvento }}</strong>.</p>
  </div>

  <!-- FORMULARIO -->
  <div *ngIf="!loading && datos && !datos.respondido && !enviado" class="enc-card">
    <!-- Header -->
    <div class="enc-header">
      <div class="enc-logo">JR</div>
      <div>
        <div class="enc-evento">{{ datos.nombreEvento }}</div>
        <h1 class="enc-title">Encuesta de Satisfacción</h1>
      </div>
    </div>
    <p class="enc-intro">Hola <strong>{{ datos.nombre }}</strong>, tu opinión nos ayuda a mejorar. La encuesta toma menos de 3 minutos.</p>

    <!-- Perfil -->
    <div class="campo-grupo">
      <label>¿Con qué perfil asististe?</label>
      <div class="chips-row">
        <button *ngFor="let p of perfiles" class="chip" [class.chip-sel]="form.perfil === p" (click)="form.perfil = p">{{ p }}</button>
      </div>
    </div>

    <!-- Escalas 1-5 -->
    <div class="escalas-grid">
      <div class="escala-item" *ngFor="let q of preguntas">
        <label>{{ q.label }}</label>
        <div class="stars-row">
          <button *ngFor="let s of [1,2,3,4,5]" class="star-btn" [class.star-sel]="form[q.key] === s" (click)="form[q.key] = s">
            {{ form[q.key] >= s ? '★' : '☆' }}
          </button>
        </div>
      </div>
    </div>

    <!-- NPS -->
    <div class="campo-grupo">
      <label>¿Qué tan probable es que recomiendes este evento a un colega? (1 = Poco probable, 5 = Muy probable)</label>
      <div class="nps-row">
        <button *ngFor="let n of [1,2,3,4,5]" class="nps-btn" [class.nps-sel]="form.npsRecomendacion === n" (click)="form.npsRecomendacion = n">{{ n }}</button>
      </div>
    </div>

    <!-- Participación futura -->
    <div class="campo-grupo">
      <label>¿Te gustaría participar en la próxima edición?</label>
      <div class="chips-row">
        <button *ngFor="let op of participaciones" class="chip"
          [class.chip-sel]="form.participacionFutura === op" (click)="form.participacionFutura = op">{{ op }}</button>
      </div>
    </div>

    <!-- Quiere contacto -->
    <div class="campo-grupo">
      <label>¿Deseas que JR Ingeniería te contacte?</label>
      <div class="chips-row">
        <button class="chip" [class.chip-sel]="form.quiereContacto === true" (click)="form.quiereContacto = true">Sí</button>
        <button class="chip" [class.chip-sel]="form.quiereContacto === false" (click)="form.quiereContacto = false">No por ahora</button>
      </div>
    </div>

    <!-- Mejoras -->
    <div class="campo-grupo">
      <label>¿Qué podríamos mejorar?</label>
      <textarea [(ngModel)]="form.queMejorar" rows="3" class="textarea-field" placeholder="Tu opinión es valiosa..."></textarea>
    </div>

    <button class="btn-submit" (click)="enviar()" [disabled]="saving || !esValido()">
      {{ saving ? 'Guardando...' : '📝 Enviar mi encuesta' }}
    </button>
    <p *ngIf="error" class="enc-error-msg">{{ error }}</p>
  </div>
</div>
    `,
    styles: [`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');

.enc-page { min-height:100vh; background:linear-gradient(135deg,#0d47a1 0%,#1976d2 40%,#26c6da 100%); display:flex; align-items:center; justify-content:center; padding:20px; font-family:'Inter',sans-serif; }

.enc-loading, .enc-error, .enc-success { background:white; border-radius:20px; padding:48px 32px; text-align:center; max-width:420px; width:100%; box-shadow:0 20px 60px rgba(0,0,0,0.2); }
.enc-icon { font-size:56px; margin-bottom:12px; }
.enc-loading p, .enc-error p, .enc-success p { color:#666; font-size:14px; margin-top:8px; }
.enc-error h2, .enc-success h2 { font-size:22px; font-weight:800; color:#1a1a2e; }

.spinner { width:40px; height:40px; border:4px solid #e0e0e0; border-top-color:#1976d2; border-radius:50%; animation:spin 0.8s linear infinite; margin:0 auto 16px; }
@keyframes spin { to { transform:rotate(360deg); } }

.enc-card { background:white; border-radius:24px; padding:36px 32px; max-width:680px; width:100%; box-shadow:0 20px 60px rgba(0,0,0,0.2); display:flex; flex-direction:column; gap:22px; }

.enc-header { display:flex; align-items:center; gap:16px; border-bottom:1px solid #eee; padding-bottom:16px; }
.enc-logo { width:48px; height:48px; border-radius:12px; background:linear-gradient(135deg,#1565c0,#0d47a1); color:white; font-weight:900; font-size:18px; display:flex; align-items:center; justify-content:center; }
.enc-evento { font-size:11px; color:#888; text-transform:uppercase; letter-spacing:1px; }
.enc-title { font-size:20px; font-weight:800; color:#1a1a2e; margin:0; }
.enc-intro { font-size:13.5px; color:#555; line-height:1.6; margin:0; }

.campo-grupo { display:flex; flex-direction:column; gap:8px; }
.campo-grupo label { font-size:13px; font-weight:600; color:#333; }

.chips-row { display:flex; flex-wrap:wrap; gap:8px; }
.chip { padding:8px 16px; border-radius:20px; border:1.5px solid #c5cae9; background:white; font-size:12.5px; font-weight:600; cursor:pointer; transition:all .15s; color:#555; }
.chip-sel { background:#1565c0; color:white; border-color:#1565c0; }
.chip:hover:not(.chip-sel) { border-color:#1565c0; color:#1565c0; }

.escalas-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
@media (max-width:540px) { .escalas-grid { grid-template-columns:1fr; } }
.escala-item label { font-size:12.5px; font-weight:600; color:#444; margin-bottom:6px; display:block; }
.stars-row { display:flex; gap:4px; }
.star-btn { font-size:24px; background:none; border:none; cursor:pointer; padding:0; color:#c5cae9; transition:color .12s; line-height:1; }
.star-btn.star-sel { color:#ffa000; }
.star-btn:hover { color:#ffa000; }

.nps-row { display:flex; gap:8px; }
.nps-btn { width:44px; height:44px; border-radius:10px; border:1.5px solid #c5cae9; background:white; font-size:16px; font-weight:700; cursor:pointer; transition:all .15s; color:#555; }
.nps-btn.nps-sel { background:#1565c0; color:white; border-color:#1565c0; }
.nps-btn:hover:not(.nps-sel) { border-color:#1565c0; }

.textarea-field { width:100%; padding:12px 14px; border:1.5px solid #c5cae9; border-radius:10px; font-size:13px; font-family:inherit; resize:vertical; outline:none; transition:border .15s; }
.textarea-field:focus { border-color:#1565c0; }

.btn-submit { padding:14px; border:none; border-radius:12px; background:linear-gradient(135deg,#1565c0,#1976d2); color:white; font-size:15px; font-weight:700; cursor:pointer; transition:all .2s; box-shadow:0 4px 14px rgba(21,101,192,0.3); }
.btn-submit:hover:not(:disabled) { filter:brightness(1.08); transform:translateY(-1px); }
.btn-submit:disabled { opacity:0.6; cursor:not-allowed; transform:none; }

.enc-error-msg { color:#e53935; font-size:13px; text-align:center; }
    `]
})
export class EncuestaPublicaComponent implements OnInit {
    token = '';
    datos: any = null;
    loading = true;
    saving = false;
    enviado = false;
    error = '';

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
