import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SeguimientoProyecto } from '../../engineering.service';
import {
  differenceInDays,
  addDays,
  startOfDay,
  format,
  eachDayOfInterval,
  isToday
} from 'date-fns';
import { es } from 'date-fns/locale';

@Component({
  selector: 'app-seguimiento-gantt-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  template: `
    <div class="flex flex-col w-[90vw] max-w-5xl h-[85vh] overflow-hidden bg-card text-default">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b">
        <div class="flex items-center gap-2">
          <mat-icon class="text-indigo-600">bar_chart</mat-icon>
          <h2 class="text-lg font-bold">Gantt de Seguimiento de Cotización</h2>
        </div>
        <button mat-icon-button (click)="onClose()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-auto overflow-auto p-6 flex flex-col min-h-0">
        <div class="mb-4 bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-wrap gap-6 text-xs text-slate-600">
          <div><strong>Proyecto:</strong> {{ data.seguimiento.tituloProyecto || data.seguimiento.actividad }}</div>
          <div><strong>Solicitante:</strong> {{ data.seguimiento.nombreCompleto }} ({{ data.seguimiento.empresa }})</div>
          <div><strong>Monto:</strong> {{ (data.seguimiento.montoTotalEstimado || 0) | currency:'MXN':'symbol':'1.2-2' }}</div>
        </div>

        <div class="flex-auto border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-0 bg-white">
          <!-- Timeline Scale Header -->
          <div class="flex-none flex border-b border-slate-100 bg-slate-50 h-12">
            <!-- Left Header Grid Spacer -->
            <div class="w-64 border-r border-slate-200 flex items-center px-4 font-bold text-xs text-slate-500 uppercase tracking-wider shrink-0 select-none">
              Etapa del Proceso
            </div>
            <!-- Scrollable Timeline Headers -->
            <div class="flex-auto overflow-hidden relative flex">
              <div class="flex h-full absolute top-0 left-0" [style.width.px]="timelineWidth">
                <div *ngFor="let day of days" 
                     class="flex-none border-r border-slate-100 flex flex-col items-center justify-center text-[10px] select-none"
                     [style.width.px]="dayWidth"
                     [ngClass]="{'bg-primary/5 font-bold text-primary': isTodayDate(day)}">
                  <span class="text-[8px] uppercase text-slate-400 font-bold leading-none mb-0.5">{{ formatDay(day) }}</span>
                  <span>{{ day | date:'dd/MM' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Body Grid Row Area -->
          <div class="flex-auto overflow-y-auto min-h-0 flex flex-col">
            <div *ngFor="let stage of stages" class="flex h-14 border-b border-slate-100 items-center hover:bg-slate-50/50 transition-colors">
              <!-- Left Cell Name -->
              <div class="w-64 border-r border-slate-200 h-full flex items-center px-4 shrink-0 font-bold text-xs text-slate-700">
                <mat-icon class="mr-2 icon-size-4" [style.color]="stage.color">{{ stage.icon }}</mat-icon>
                {{ stage.name }}
              </div>
              
              <!-- Right Cell Timeline Bar -->
              <div class="flex-auto h-full relative overflow-hidden bg-slate-50/10">
                <!-- Gantt Bar -->
                <div *ngIf="stage.date"
                     class="absolute h-8 rounded-lg shadow-sm flex items-center px-3 border select-none transition-all"
                     [style.left.px]="getBarPositionLeft(stage.date)"
                     [style.width.px]="dayWidth"
                     [style.border-color]="stage.color"
                     [style.background-color]="stage.color + '15'"
                     [matTooltip]="stage.name + ': ' + (stage.date | date:'dd/MM/yyyy')">
                  <div class="w-1.5 h-full absolute left-0 top-0 rounded-l" [style.background-color]="stage.color"></div>
                  <span class="text-[10px] font-bold uppercase truncate" [style.color]="stage.color">
                    {{ stage.date | date:'dd/MM' }}
                  </span>
                </div>
                
                <!-- If date is missing -->
                <div *ngIf="!stage.date" class="h-full flex items-center pl-6 text-[10px] text-slate-400 italic font-semibold">
                  Sin registrar fecha
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end px-6 py-4 border-t bg-slate-50">
        <button mat-flat-button color="primary" class="!rounded-xl" (click)="onClose()">Cerrar</button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class SeguimientoGanttDialogComponent implements OnInit {
  days: Date[] = [];
  dayWidth = 60;
  timelineWidth = 0;
  startDate: Date = new Date();
  endDate: Date = new Date();

  stages: any[] = [];

  constructor(
    private _dialogRef: MatDialogRef<SeguimientoGanttDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { seguimiento: SeguimientoProyecto }
  ) {}

  ngOnInit(): void {
    // 1. Extraer hitos
    this.stages = [
      {
        name: '1. Requisición / Solicitud',
        date: this.data.seguimiento.fechaRegistro ? new Date(this.data.seguimiento.fechaRegistro) : null,
        color: '#3b82f6', // Azul
        icon: 'assignment'
      },
      {
        name: '2. Levantamiento Técnico',
        date: this.data.seguimiento.fechaLevantamiento ? new Date(this.data.seguimiento.fechaLevantamiento) : null,
        color: '#f59e0b', // Amber
        icon: 'engineering'
      },
      {
        name: '3. Envío de Cotización',
        date: this.data.seguimiento.fechaCotizacion ? new Date(this.data.seguimiento.fechaCotizacion) : null,
        color: '#8b5cf6', // Morado
        icon: 'request_quote'
      },
      {
        name: '4. Decisión / Aprobación',
        date: this.data.seguimiento.fechaAprobacion ? new Date(this.data.seguimiento.fechaAprobacion) : null,
        color: this.data.seguimiento.estatusAprobacion === 2 ? '#10b981' : (this.data.seguimiento.estatusAprobacion === 3 ? '#ef4444' : '#64748b'),
        icon: this.data.seguimiento.estatusAprobacion === 2 ? 'check_circle' : (this.data.seguimiento.estatusAprobacion === 3 ? 'cancel' : 'hourglass_empty')
      }
    ];

    // 2. Definir fechas límites del Timeline en base a los hitos existentes
    const validDates = this.stages.map(s => s.date).filter(d => d !== null) as Date[];
    
    if (validDates.length > 0) {
      let minDate = new Date(Math.min(...validDates.map(d => d.getTime())));
      let maxDate = new Date(Math.max(...validDates.map(d => d.getTime())));
      
      // Margen de 5 días a los lados
      this.startDate = startOfDay(addDays(minDate, -5));
      this.endDate = startOfDay(addDays(maxDate, 5));
    } else {
      this.startDate = startOfDay(addDays(new Date(), -5));
      this.endDate = startOfDay(addDays(new Date(), 10));
    }

    // Calcular diferencia de días
    const totalDays = differenceInDays(this.endDate, this.startDate) + 1;
    this.days = eachDayOfInterval({ start: this.startDate, end: this.endDate });
    this.timelineWidth = this.days.length * this.dayWidth;
  }

  isTodayDate(d: Date): boolean {
    return isToday(d);
  }

  formatDay(d: Date): string {
    return format(d, 'eee', { locale: es });
  }

  getBarPositionLeft(targetDate: Date): number {
    const diff = differenceInDays(startOfDay(targetDate), this.startDate);
    return Math.max(0, diff * this.dayWidth);
  }

  onClose(): void {
    this._dialogRef.close();
  }
}
