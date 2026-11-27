import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export const NOMBRES_ESTATUS: Record<string, string> = {
  EnProceso: 'En proceso',
  EnviadaACliente: 'Enviada a cliente',
  AprobadaPorCliente: 'Aprobada por cliente',
  Rechazada: 'Rechazada',
};

export function nombreEstatus(estatus: string | null | undefined): string {
  if (!estatus) {
    return 'En proceso';
  }
  return NOMBRES_ESTATUS[estatus] || estatus;
}

export const CLASES_ESTATUS: Record<string, string> = {
  EnProceso: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200',
  EnviadaACliente: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200',
  AprobadaPorCliente: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200',
  Rechazada: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-200',
};

@Component({
  selector: 'app-estatus-chip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [attr.data-testid]="'chip-estatus-' + (estatus || 'desconocido')"
          class="px-2 py-0.5 text-[10px] font-bold rounded-full border inline-flex items-center tracking-wide"
          [ngClass]="claseColor">
      {{ nombreLegible }}
    </span>
  `
})
export class EstatusChipComponent {
  @Input() estatus: string | null | undefined;

  get nombreLegible(): string {
    return nombreEstatus(this.estatus);
  }

  get claseColor(): string {
    return (this.estatus && CLASES_ESTATUS[this.estatus]) || 'bg-gray-100 text-gray-800 border-gray-300';
  }
}
