import { Component, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CotizacionIngenieriaCasoDto, CotizacionIngenieriaArchivoDto } from '../../quotes-products.types';
import { QuotesService } from '../../quotes-products.service';
import { ProcesoComercialComponent } from 'app/shared/proceso-comercial/proceso-comercial.component';
import Swal from 'sweetalert2';

export interface IngenieriaCasoDialogData {
  caso: CotizacionIngenieriaCasoDto;
}

@Component({
  selector: 'app-ingenieria-caso-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    ProcesoComercialComponent
  ],
  template: `
    <div class="flex flex-col w-full max-h-[90vh] overflow-hidden bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300">
      <!-- Header -->
      <div class="flex-none flex items-center justify-between border-b px-6 py-4 bg-slate-50 dark:bg-slate-900">
        <div class="min-w-0">
          <div class="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <mat-icon class="text-indigo-600 icon-size-5">engineering</mat-icon>
            <span>Caso de Ingeniería #{{ caso.idSeguimiento }}</span>
          </div>
          <div class="text-xs text-slate-400 mt-0.5">
            {{ caso.empresa }}
          </div>
        </div>
        <button mat-icon-button type="button" (click)="cerrar()" aria-label="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-auto min-h-0 overflow-y-auto px-6 py-5 flex flex-col gap-6">
        <!-- Panel Proceso Comercial (tipo caso) -->
        <app-proceso-comercial [tipo]="'caso'" [id]="caso.idSeguimiento"></app-proceso-comercial>

        <!-- Información General -->
        <div class="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col gap-3">
          <h3 class="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <mat-icon class="icon-size-4 text-indigo-600">info</mat-icon>
            Información del caso
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <span class="text-slate-400 block mb-0.5">Título / Proyecto:</span>
              <span class="font-bold text-slate-800 dark:text-slate-100" data-testid="caso-titulo">{{ caso.titulo }}</span>
            </div>
            <div>
              <span class="text-slate-400 block mb-0.5">Empresa solicitante:</span>
              <span class="font-semibold text-slate-800 dark:text-slate-100" data-testid="caso-empresa">{{ caso.empresa }}</span>
            </div>
            <div>
              <span class="text-slate-400 block mb-0.5">Monto total estimado:</span>
              <span class="font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums text-sm" data-testid="caso-monto">
                {{ caso.montoTotalEstimado ? (caso.montoTotalEstimado | currency:'MXN':'symbol':'1.2-2') : '—' }}
              </span>
            </div>
            <div>
              <span class="text-slate-400 block mb-0.5">Sucursal:</span>
              <span class="font-medium text-slate-700 dark:text-slate-300" data-testid="caso-sucursal">{{ caso.sucursalNombre || 'Sin sucursal' }}</span>
            </div>
            <div *ngIf="caso.requerimientoFolio">
              <span class="text-slate-400 block mb-0.5">Requerimiento origen:</span>
              <span class="font-mono font-semibold text-blue-600 dark:text-blue-400">{{ caso.requerimientoFolio }}</span>
            </div>
          </div>
        </div>

        <!-- Archivos de la etapa 5 -->
        <div class="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col gap-3">
          <h3 class="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <mat-icon class="icon-size-4 text-indigo-600">attach_file</mat-icon>
            Archivos de la etapa 5 (Cotización técnico-comercial)
          </h3>

          <div *ngIf="!caso.archivos || caso.archivos.length === 0" class="text-xs text-slate-400 italic py-2">
            No hay archivos cargados en la etapa 5 de este caso.
          </div>

          <div *ngIf="caso.archivos && caso.archivos.length > 0" class="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table class="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead class="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-medium">
                <tr>
                  <th class="px-3 py-2.5">Archivo</th>
                  <th class="px-3 py-2.5">Revisión</th>
                  <th class="px-3 py-2.5">Versión</th>
                  <th class="px-3 py-2.5">Estado</th>
                  <th class="px-3 py-2.5">Fecha</th>
                  <th class="px-3 py-2.5 text-center">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <tr *ngFor="let a of caso.archivos" class="fila-archivo-ingenieria hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td class="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                    <div class="flex items-center gap-1.5">
                      <mat-icon class="text-sm text-slate-400">description</mat-icon>
                      <span class="nombre-archivo">{{ a.nombreArchivo }}</span>
                    </div>
                  </td>
                  <td class="px-3 py-2.5 font-bold">R{{ a.revision }}</td>
                  <td class="px-3 py-2.5">v{{ a.version }}</td>
                  <td class="px-3 py-2.5">
                    <span *ngIf="!a.revisionAutorizada"
                          class="chip-sin-autorizar px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                          data-testid="chip-sin-autorizar">
                      Sin autorizar
                    </span>
                    <span *ngIf="a.revisionAutorizada"
                          class="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                      Autorizada
                    </span>
                  </td>
                  <td class="px-3 py-2.5">{{ a.fechaSubida | date:'dd/MM/yyyy HH:mm' }}</td>
                  <td class="px-3 py-2.5 text-center">
                    <button mat-stroked-button type="button" class="btn-descargar-archivo-ingenieria !px-2 !py-1 text-xs"
                            (click)="descargarArchivo(a)">
                      <mat-icon class="mr-1 text-sm text-primary">download</mat-icon>
                      Descargar
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex-none flex items-center justify-end px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <button mat-stroked-button type="button" (click)="cerrar()">
          Cerrar
        </button>
      </div>
    </div>
  `
})
export class IngenieriaCasoDialogComponent {
  caso: CotizacionIngenieriaCasoDto;

  constructor(
    @Optional() @Inject(MAT_DIALOG_DATA) public data: IngenieriaCasoDialogData | null,
    @Optional() private dialogRef: MatDialogRef<IngenieriaCasoDialogComponent> | null,
    private quotesService: QuotesService
  ) {
    this.caso = data?.caso || ({} as any);
  }

  cerrar(): void {
    this.dialogRef?.close();
  }

  descargarArchivo(archivo: CotizacionIngenieriaArchivoDto): void {
    if (!this.caso?.idSeguimiento || !archivo?.id) return;
    this.quotesService.descargarArchivoIngenieria(this.caso.idSeguimiento, archivo.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = archivo.nombreArchivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo descargar el archivo de ingeniería.',
        });
      }
    });
  }
}
