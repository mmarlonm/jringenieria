import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

const NOMBRES_ETAPAS: Record<string, string> = {
  Borrador: 'Borrador',
  EnRevision: 'En revisión',
  Aprobada: 'Aprobada',
  Emitida: 'Emitida',
  EnSeguimiento: 'En seguimiento',
  Ganada: 'Ganada',
  Perdida: 'Perdida',
  Cancelada: 'Cancelada',
  Vencida: 'Vencida',
  CerradaSinRespuesta: 'Cerrada sin respuesta',
};

const CLASES_ETAPAS: Record<string, string> = {
  Borrador: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-200',
  EnRevision: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200',
  Aprobada: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200',
  Emitida: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-200',
  EnSeguimiento: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/40 dark:text-teal-200',
  Ganada: 'bg-emerald-700 text-white border-emerald-800',
  Perdida: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-200',
  Cancelada: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-200',
  Vencida: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-200',
  CerradaSinRespuesta: 'bg-gray-800 text-white border-gray-900 dark:bg-gray-900 dark:text-gray-100',
};

@Component({
  selector: 'app-etapa-chip',
  templateUrl: './etapa-chip.component.html',
  standalone: true,
  imports: [CommonModule],
})
export class EtapaChipComponent {
  @Input() etapa: string = 'Borrador';

  get nombreLegible(): string {
    return NOMBRES_ETAPAS[this.etapa] || this.etapa || 'Borrador';
  }

  get claseColor(): string {
    return CLASES_ETAPAS[this.etapa] || 'bg-gray-100 text-gray-800 border-gray-300';
  }
}
