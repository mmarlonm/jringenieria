import { Component, Input, OnInit, OnChanges, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { EncuestasEventoService } from './encuestas-evento.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-dashboard-encuestas',
    standalone: true,
    imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule, MatProgressBarModule, MatTabsModule],
    template: `
<div class="dashboard-enc">

  <!-- ── KPI Cards ────────────────────────────────────────────────────────── -->
  <div class="kpi-grid" *ngIf="kpis">
    <div class="kpi-card">
      <div class="kpi-icon" style="background:#e8f0fe"><span class="text-2xl">📤</span></div>
      <div><div class="kpi-val">{{ kpis.enviadas }}</div><div class="kpi-lbl">Enviadas</div></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon" style="background:#e6f4ea"><span class="text-2xl">✅</span></div>
      <div><div class="kpi-val text-emerald-600">{{ kpis.respondidas }}</div><div class="kpi-lbl">Respondidas</div></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon" style="background:#fff8e1"><span class="text-2xl">👁</span></div>
      <div><div class="kpi-val text-amber-600">{{ kpis.abiertas }}</div><div class="kpi-lbl">Abiertas</div></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon" style="background:#fce4ec"><span class="text-2xl">📊</span></div>
      <div><div class="kpi-val text-rose-600">{{ kpis.tasaRespuesta | number:'1.1-1' }}%</div><div class="kpi-lbl">Tasa Respuesta</div></div>
    </div>
    <div class="kpi-card nps-card" [class.nps-pos]="kpis.nps?.score > 0" [class.nps-neg]="kpis.nps?.score < 0">
      <div class="kpi-icon" style="background:#ede7f6"><span class="text-2xl">🎯</span></div>
      <div><div class="kpi-val">{{ kpis.nps?.score | number:'1.0-1' }}</div><div class="kpi-lbl">NPS Score</div></div>
    </div>
  </div>

  <!-- ── Promedios por Pregunta ────────────────────────────────────────────── -->
  <div class="section-card" *ngIf="kpis?.promedios">
    <div class="section-title">Promedio por pregunta (escala 1–5)</div>
    <div class="preguntas-list">
      <div class="preg-row" *ngFor="let p of preguntasLabels">
        <span class="preg-label">{{ p.label }}</span>
        <mat-progress-bar mode="determinate" [value]="(kpis.promedios[p.key] || 0) / 5 * 100" class="preg-bar"></mat-progress-bar>
        <span class="preg-val">{{ kpis.promedios[p.key] | number:'1.1-2' }}</span>
      </div>
    </div>
  </div>

  <!-- ── NPS Detalle + Participación Futura ───────────────────────────────── -->
  <div class="two-col-grid" *ngIf="kpis">
    <div class="section-card" *ngIf="kpis.nps">
      <div class="section-title">NPS Distribución</div>
      <div class="nps-bars">
        <div class="nps-item">
          <span class="nps-dot prm">●</span> Promotores (5)
          <strong>{{ kpis.nps.promotores | number:'1.0-1' }}%</strong>
        </div>
        <div class="nps-item">
          <span class="nps-dot pas">●</span> Pasivos (3-4)
          <strong>{{ 100 - kpis.nps.promotores - kpis.nps.detractores | number:'1.0-1' }}%</strong>
        </div>
        <div class="nps-item">
          <span class="nps-dot det">●</span> Detractores (1-2)
          <strong>{{ kpis.nps.detractores | number:'1.0-1' }}%</strong>
        </div>
        <div style="font-size:11px;color:#999;margin-top:8px">Total votos: {{ kpis.nps.total }}</div>
      </div>
    </div>
    <div class="section-card" *ngIf="kpis.participacionFutura?.length">
      <div class="section-title">Participación Futura</div>
      <div class="part-list">
        <div *ngFor="let p of kpis.participacionFutura" class="part-row">
          <span>{{ p.opcion }}</span>
          <span class="part-count">{{ p.count }}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Acciones ──────────────────────────────────────────────────────────── -->
  <div class="actions-row">
    <button class="btn-action btn-send" (click)="enviarMasivo()" [disabled]="sending">
      <mat-icon>send</mat-icon> {{ sending ? 'Enviando...' : 'Enviar Encuestas' }}
    </button>
    <button class="btn-action btn-resend" (click)="reenviarNoRespondidos()" [disabled]="sending">
      <mat-icon>refresh</mat-icon> Reenviar a No Respondidos
    </button>
    <button class="btn-action btn-export" (click)="exportar()">
      <mat-icon>download</mat-icon> Exportar CSV
    </button>
  </div>

  <!-- ── Tabla de Tracking ─────────────────────────────────────────────────── -->
  <div class="section-card">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <div class="section-title">Estado de Envíos por Asistente</div>
      <div class="filter-group">
        <button class="filter-btn" [class.active]="filtroRespuesta === 'todos'" (click)="filtroRespuesta = 'todos'">
          Todos ({{ tracking.length }})
        </button>
        <button class="filter-btn" [class.active]="filtroRespuesta === 'respondidos'" (click)="filtroRespuesta = 'respondidos'">
          ✓ Respondidos ({{ countRespondidos }})
        </button>
        <button class="filter-btn" [class.active]="filtroRespuesta === 'pendientes'" (click)="filtroRespuesta = 'pendientes'">
          ⏳ Pendientes ({{ countPendientes }})
        </button>
      </div>
    </div>
    <div class="table-wrap">
      <table class="track-table">
        <thead>
          <tr>
            <th>Asistente</th>
            <th>Empresa</th>
            <th>Email</th>
            <th>WhatsApp</th>
            <th>Abierto</th>
            <th>Respondido</th>
            <th>Fecha Resp.</th>
            <th>Reenvíos</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of trackingFiltrado" [class.respondido-row]="r.respondido" [class.pendiente-row]="!r.respondido">
            <td>
              <div style="font-weight:600;font-size:13px">{{ r.nombre }}</div>
              <div style="font-size:11px;color:#888">{{ r.correo }}</div>
            </td>
            <td>{{ r.empresa || '–' }}</td>
            <td><span class="badge" [class.badge-ok]="r.enviado" [class.badge-no]="!r.enviado">{{ r.enviado ? '✓' : '–' }}</span></td>
            <td><span class="badge" [class.badge-ok]="r.whatsapp" [class.badge-no]="!r.whatsapp">{{ r.whatsapp ? '✓' : '–' }}</span></td>
            <td><span class="badge" [class.badge-ok]="r.abierto" [class.badge-no]="!r.abierto">{{ r.abierto ? '✓' : '–' }}</span></td>
            <td><span class="badge-estado" [class.respondido]="r.respondido" [class.pendiente]="!r.respondido">{{ r.respondido ? '✓ Respondido' : 'Pendiente' }}</span></td>
            <td>{{ r.fechaRespuesta ? (r.fechaRespuesta | date:'dd/MM HH:mm') : '–' }}</td>
            <td>{{ r.reenvios }}</td>
            <td>
              <button mat-icon-button matTooltip="Reenviar encuesta" *ngIf="!r.respondido"
                (click)="reenviar(r)" [disabled]="sending">
                <mat-icon style="font-size:16px">send</mat-icon>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div *ngIf="trackingFiltrado.length === 0" style="text-align:center; padding:30px; color:#999; font-size:13px;">
        No hay asistentes en esta categoría
      </div>
    </div>
  </div>

  <!-- ── Comentarios ───────────────────────────────────────────────────────── -->
  <div class="section-card" *ngIf="kpis && kpis.comentarios && kpis.comentarios.length > 0">
    <div class="section-title">💬 Comentarios "¿Qué podríamos mejorar?"</div>
    <div class="comentarios">
      <div class="comentario" *ngFor="let c of kpis.comentarios">{{ formatearComentario(c) }}</div>
    </div>
  </div>

</div>
    `,
    styles: [`
.dashboard-enc { font-family:'Inter','Roboto',sans-serif; padding:0; display:flex; flex-direction:column; gap:20px; }

.kpi-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:14px; }
.kpi-card { background:white; border:1px solid #e8eaf6; border-radius:14px; padding:16px 18px; display:flex; align-items:center; gap:12px; box-shadow:0 2px 8px rgba(0,0,0,0.04); }
.kpi-icon { width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.kpi-val { font-size:22px; font-weight:800; color:#1a1a2e; }
.kpi-lbl { font-size:11px; color:#888; font-weight:500; text-transform:uppercase; letter-spacing:0.5px; }

.section-card { background:white; border:1px solid #e8eaf6; border-radius:14px; padding:20px 22px; box-shadow:0 2px 8px rgba(0,0,0,0.04); }
.section-title { font-size:13px; font-weight:700; color:#333; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:14px; }

.preguntas-list { display:flex; flex-direction:column; gap:10px; }
.preg-row { display:flex; align-items:center; gap:10px; }
.preg-label { width:250px; font-size:12px; color:#555; flex-shrink:0; }
.preg-bar { flex:1; height:8px; border-radius:4px; }
.preg-val { width:32px; text-align:right; font-size:13px; font-weight:700; color:#1565c0; }

.two-col-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.nps-bars { display:flex; flex-direction:column; gap:10px; }
.nps-item { display:flex; align-items:center; gap:8px; font-size:13px; color:#444; }
.nps-item strong { margin-left:auto; font-size:14px; }
.nps-dot.prm { color:#43a047; } .nps-dot.pas { color:#fb8c00; } .nps-dot.det { color:#e53935; }

.part-list { display:flex; flex-direction:column; gap:8px; }
.part-row { display:flex; justify-content:space-between; font-size:13px; padding:6px 0; border-bottom:1px solid #f0f0f0; }
.part-count { font-weight:700; color:#1565c0; }

.actions-row { display:flex; gap:10px; flex-wrap:wrap; }
.btn-action { display:flex; align-items:center; gap:6px; padding:10px 18px; border:none; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; }
.btn-send { background:linear-gradient(135deg,#1565c0,#1976d2); color:white; }
.btn-resend { background:#f0f4ff; color:#1565c0; border:1px solid #c5cae9; }
.btn-export { background:#f5f5f5; color:#555; border:1px solid #e0e0e0; }
.btn-action:hover { filter:brightness(1.07); transform:translateY(-1px); }
.btn-action:disabled { opacity:0.6; cursor:not-allowed; transform:none; }

.table-wrap { overflow-x:auto; }
.track-table { width:100%; border-collapse:collapse; font-size:12.5px; }
.track-table th { background:#f7f9ff; color:#555; font-weight:700; text-transform:uppercase; font-size:10px; padding:10px 12px; border-bottom:2px solid #e8eaf6; text-align:left; }
.track-table td { padding:10px 12px; border-bottom:1px solid #f0f2f8; }
.track-table tr:hover td { background:#fafbff; }

.badge { display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:6px; font-size:12px; font-weight:700; }
.badge-ok { background:#e6f4ea; color:#2e7d32; }
.badge-no { background:#fafafa; color:#ccc; }

.badge-estado { display:inline-flex; align-items:center; justify-content:center; padding:4px 10px; border-radius:6px; font-size:12px; font-weight:700; }
.badge-estado.respondido { background:#e6f4ea; color:#2e7d32; }
.badge-estado.pendiente { background:#fff3cd; color:#856404; }

.filter-group { display:flex; gap:8px; }
.filter-btn { padding:6px 14px; border:1px solid #ddd; background:white; border-radius:6px; font-size:12px; font-weight:600; color:#666; cursor:pointer; transition:all .2s; white-space:nowrap; }
.filter-btn:hover { border-color:#1565c0; color:#1565c0; }
.filter-btn.active { background:#1565c0; color:white; border-color:#1565c0; }

.respondido-row { background:#f0f8f5; }
.pendiente-row { background:#fffbf0; }

.comentarios { display:flex; flex-direction:column; gap:8px; }
.comentario { background:#f7f9ff; border-left:3px solid #1565c0; padding:10px 14px; border-radius:0 8px 8px 0; font-size:13px; color:#444; line-height:1.5; }
    `]
})
export class DashboardEncuestasComponent implements OnInit, OnChanges {
    @Input() eventoId!: number;

    kpis: any = null;
    tracking: any[] = [];
    sending = false;
    filtroRespuesta: 'todos' | 'respondidos' | 'pendientes' = 'todos';

    get trackingFiltrado(): any[] {
        if (this.filtroRespuesta === 'respondidos') {
            return this.tracking.filter(r => r.respondido);
        } else if (this.filtroRespuesta === 'pendientes') {
            return this.tracking.filter(r => !r.respondido);
        }
        return this.tracking;
    }

    get countRespondidos(): number {
        return this.tracking.filter(r => r.respondido).length;
    }

    get countPendientes(): number {
        return this.tracking.filter(r => !r.respondido).length;
    }

    formatearComentario(c: any): string {
        if (typeof c === 'string') return c;
        return c?.texto || c?.comentario || c?.queMejorar || '';
    }

    preguntasLabels = [
        { key: 'expGeneral',         label: 'Experiencia general' },
        { key: 'contactosValor',     label: 'Contactos de valor generados' },
        { key: 'alianzaJR',          label: 'JR como aliado estratégico' },
        { key: 'interesForoEnergiza',label: 'Interés en Foro Energiza 2026' },
        { key: 'organizacion',       label: 'Organización del evento' }
    ];

    private _route = inject(ActivatedRoute);

    constructor(private _encuestaSvc: EncuestasEventoService) {}

    ngOnInit(): void {
        const routeId = this._route.snapshot.queryParams['id'];
        if (routeId) {
            this.eventoId = Number(routeId);
        }
        this.load();
    }
    ngOnChanges(): void { if (this.eventoId) this.load(); }

    load(): void {
        if (!this.eventoId) return;
        this._encuestaSvc.getKpis(this.eventoId).subscribe({ next: d => this.kpis = d, error: () => {} });
        this._encuestaSvc.getTracking(this.eventoId).subscribe({ next: d => this.tracking = d, error: () => {} });
    }

    enviarMasivo(): void {
        Swal.fire({ title: '¿Enviar encuesta a todos?', text: 'Se enviará un correo a cada asistente del evento.', icon: 'question', showCancelButton: true, confirmButtonText: 'Sí, enviar', cancelButtonText: 'Cancelar' }).then(r => {
            if (!r.isConfirmed) return;
            this.sending = true;
            this._encuestaSvc.enviarEncuestasMasivo(this.eventoId).subscribe({
                next: res => { this.sending = false; Swal.fire('Enviado', res.mensaje, 'success'); this.load(); },
                error: () => { this.sending = false; Swal.fire('Error', 'No se pudo completar el envío.', 'error'); }
            });
        });
    }

    reenviarNoRespondidos(): void {
        const pendientes = this.tracking.filter(r => !r.respondido && r.enviado);
        if (!pendientes.length) { Swal.fire('Sin pendientes', 'Todos los encuestados han respondido.', 'info'); return; }
        Swal.fire({ title: `¿Reenviar a ${pendientes.length} asistente(s)?`, icon: 'question', showCancelButton: true, confirmButtonText: 'Sí, reenviar' }).then(r => {
            if (!r.isConfirmed) return;
            this.sending = true;
            let done = 0;
            pendientes.forEach(p => {
                this._encuestaSvc.reenviarEncuesta(p.asistenteId).subscribe({ next: () => { done++; if (done === pendientes.length) { this.sending = false; Swal.fire('Completado', `${done} reenvío(s) realizados.`, 'success'); this.load(); } }, error: () => { done++; if (done === pendientes.length) { this.sending = false; this.load(); } } });
            });
        });
    }

    reenviar(r: any): void {
        this._encuestaSvc.reenviarEncuesta(r.asistenteId).subscribe({
            next: () => { Swal.fire('Enviado', 'Correo reenviado correctamente.', 'success'); this.load(); },
            error: () => Swal.fire('Error', 'No se pudo reenviar.', 'error')
        });
    }

    exportar(): void { this._encuestaSvc.exportarCsv(this.eventoId); }
}
