import { ChangeDetectorRef, Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { ProcesoComercialService } from './proceso-comercial.service';
import { ProcesoComercial, ProcesoEstadoPaso, ProcesoPaso, ProcesoTipo } from './proceso-comercial.types';

export const ETIQUETAS_ESTADO: Record<ProcesoEstadoPaso, string> = {
  completado: 'Completado',
  actual: 'Aquí va',
  pendiente: 'Pendiente',
  noAplica: 'No aplica',
  detenido: 'Detenido'
};

const ICONOS_ESTADO: Record<ProcesoEstadoPaso, string> = {
  completado: 'heroicons_outline:check-circle',
  actual: 'heroicons_outline:map-pin',
  pendiente: 'heroicons_outline:clock',
  noAplica: 'heroicons_outline:minus-circle',
  detenido: 'heroicons_outline:x-circle'
};

const CLASES_ESTADO: Record<ProcesoEstadoPaso, string> = {
  completado: 'border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300',
  actual: 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-400/60 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-200',
  pendiente: 'border-gray-300 bg-white text-gray-600 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300',
  noAplica: 'border-dashed border-gray-300 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-500',
  detenido: 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300'
};

/**
 * Muestra en que paso del proceso comercial va un registro:
 * Lead -> Requerimiento -> Ingenieria (tecnico) o Cotizacion (comercial, pasa directo).
 * Se usa en los detalles de lead, requerimiento, caso de Ingenieria y cotizacion.
 */
@Component({
  selector: 'app-proceso-comercial',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './proceso-comercial.component.html'
})
export class ProcesoComercialComponent implements OnChanges, OnDestroy {
  @Input() tipo: ProcesoTipo | null = null;
  @Input() id: number | null | undefined;
  /** Cualquier valor que cambie vuelve a consultar el proceso (p. ej. despues de guardar o de cambiar de etapa). */
  @Input() refresco: unknown;

  proceso: ProcesoComercial | null = null;
  cargando = false;
  error: string | null = null;

  private suscripcion?: Subscription;

  constructor(private servicio: ProcesoComercialService, private cdr: ChangeDetectorRef) { }

  ngOnChanges(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
  }

  cargar(): void {
    this.suscripcion?.unsubscribe();
    this.proceso = null;
    this.error = null;

    if (!this.tipo || !this.id) {
      this.cargando = false;
      return;
    }

    this.cargando = true;
    this.suscripcion = this.servicio.obtener(this.tipo, this.id).subscribe({
      next: (proceso) => {
        this.proceso = proceso;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cargando = false;
        this.error = err?.error?.mensaje ?? 'No se pudo cargar el proceso.';
        this.cdr.markForCheck();
      }
    });
  }

  etiqueta(paso: ProcesoPaso): string {
    return ETIQUETAS_ESTADO[paso.estado] ?? paso.estado;
  }

  icono(paso: ProcesoPaso): string {
    return ICONOS_ESTADO[paso.estado] ?? ICONOS_ESTADO.pendiente;
  }

  clases(paso: ProcesoPaso): string {
    return CLASES_ESTADO[paso.estado] ?? CLASES_ESTADO.pendiente;
  }

  trackPaso(_: number, paso: ProcesoPaso): string {
    return paso.clave;
  }
}
