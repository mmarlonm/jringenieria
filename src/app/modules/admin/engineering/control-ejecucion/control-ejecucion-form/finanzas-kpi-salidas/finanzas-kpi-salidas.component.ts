import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SalidaAlmacen } from '../../../engineering.service';

/**
 * KPI de Finanzas «Salidas de almacén»: suma del total de los folios de salida registrados en el proyecto (los mismos
 * de la pestaña Salidas de Almacén). Un folio que no se pudo consultar llega sin total: cuenta como $0 y se avisa,
 * para que nadie tome la suma por completa sin saberlo.
 */
@Component({
  selector: 'app-finanzas-kpi-salidas',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all" data-testid="kpi-salidas-almacen">
      <div class="flex items-center justify-between">
        <span class="text-xs font-black text-slate-400 uppercase tracking-wider">Salidas de Almacén</span>
        <div class="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
          <mat-icon class="icon-size-5">warehouse</mat-icon>
        </div>
      </div>
      <div class="mt-3">
        <ng-container *ngIf="!error; else fallo">
          <div class="text-2xl font-black text-emerald-600 tracking-tight tabular-nums" data-testid="valor-salidas">
            {{ total | currency:'MXN':'symbol':'1.2-2' }}
          </div>
          <div class="text-[11px] font-semibold text-slate-500 mt-1" data-testid="folios-salidas">{{ textoFolios }}</div>
          <div *ngIf="sinTotal > 0" class="text-[11px] font-semibold text-amber-700 mt-1" data-testid="aviso-sin-total">{{ textoSinTotal }}</div>
        </ng-container>
        <ng-template #fallo>
          <div class="text-sm font-bold text-red-600" data-testid="error-salidas">No se pudieron cargar las salidas de almacén.</div>
        </ng-template>
      </div>
      <div class="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500"></div>
    </div>
  `
})
export class FinanzasKpiSalidasComponent implements OnChanges {
  @Input() salidas: Pick<SalidaAlmacen, 'folio' | 'total'>[] | null = [];
  /** `true` si la carga de las salidas falló: se muestra el aviso en vez de un cero que parecería real. */
  @Input() error = false;

  total = 0;
  folios = 0;
  sinTotal = 0;
  textoFolios = '';
  textoSinTotal = '';

  ngOnChanges(): void {
    const lista = this.salidas ?? [];
    this.folios = lista.length;
    this.sinTotal = lista.filter(s => s.total === null || s.total === undefined || Number.isNaN(Number(s.total))).length;
    this.total = lista.reduce((suma, s) => suma + (Number(s.total) || 0), 0);
    this.textoFolios = this.folios === 0
      ? 'Sin salidas registradas'
      : `${this.folios} ${this.folios === 1 ? 'folio vinculado' : 'folios vinculados'}`;
    this.textoSinTotal = this.sinTotal === 1
      ? '1 folio sin total (cuenta como $0)'
      : `${this.sinTotal} folios sin total (cuentan como $0)`;
  }
}
