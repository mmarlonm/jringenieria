import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DesempenoService } from '../desempeno.service';
import { MiDesempeno } from '../desempeno.types';
import { claseEstatus, etiquetaEstatus, etiquetaEvaluador, etiquetaTipo } from '../desempeno.utils';

/** Lo que el propio colaborador ve: los resultados que RRHH liberó y los planes de desarrollo que activó. */
@Component({
    selector: 'app-mi-desempeno',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    template: `
        <div class="flex flex-col flex-auto min-w-0 p-6 md:p-8 gap-6">
            <div class="pb-4 border-b border-gray-200 dark:border-gray-800">
                <div class="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-3">
                    <mat-icon class="icon-size-8 text-primary" svgIcon="heroicons_outline:chart-bar"></mat-icon>
                    <span>Mi desempeño</span>
                </div>
                <div class="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1" *ngIf="datos">{{ datos.colaboradorNombre }}</div>
            </div>

            <div *ngIf="cargando" class="p-12 text-center text-gray-500">Cargando...</div>

            <div *ngIf="!cargando && mensajeError" class="p-6 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-sm">
                {{ mensajeError }}
            </div>

            <ng-container *ngIf="!cargando && datos">
                <section class="flex flex-col gap-3">
                    <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">Mis evaluaciones</h2>
                    <div *ngIf="datos.evaluaciones.length === 0" class="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-500">
                        Todavía no tienes resultados disponibles. RRHH te los mostrará cuando se liberen.
                    </div>
                    <div *ngFor="let e of datos.evaluaciones" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col gap-3">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <div class="font-bold text-gray-900 dark:text-gray-100">Periodo {{ e.periodo }}</div>
                                <div class="text-xs text-gray-400">{{ etiquetaTipo(e.tipoEvaluacion) }} • Evalúa: {{ etiquetaEvaluador(e.evaluador) }}</div>
                            </div>
                            <div class="text-right">
                                <div class="text-xs uppercase text-gray-400">Calificación</div>
                                <div class="text-2xl font-black text-primary">{{ e.calificacion !== null && e.calificacion !== undefined ? e.calificacion.toFixed(1) : '—' }}<span class="text-xs text-gray-400"> / 5.0</span></div>
                            </div>
                        </div>
                        <div>
                            <div class="text-xs uppercase text-gray-400">Objetivo</div>
                            <p class="text-sm whitespace-pre-line text-gray-800 dark:text-gray-200">{{ e.objetivo }}</p>
                        </div>
                        <div *ngIf="e.resultado">
                            <div class="text-xs uppercase text-gray-400">Resultado</div>
                            <p class="text-sm whitespace-pre-line text-gray-800 dark:text-gray-200">{{ e.resultado }}</p>
                        </div>
                        <div *ngIf="e.planAccion">
                            <div class="text-xs uppercase text-gray-400">Plan de acción</div>
                            <p class="text-sm whitespace-pre-line text-gray-800 dark:text-gray-200">{{ e.planAccion }}</p>
                        </div>
                    </div>
                </section>

                <section class="flex flex-col gap-3">
                    <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">Mi plan de desarrollo</h2>
                    <div *ngIf="datos.planes.length === 0" class="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-500">
                        Aún no tienes un plan de desarrollo disponible.
                    </div>
                    <ul *ngIf="datos.planes.length > 0" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                        <li *ngFor="let p of datos.planes" class="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div>
                                <div class="font-semibold text-gray-900 dark:text-gray-100">{{ p.competencia }}</div>
                                <p class="text-sm text-gray-700 dark:text-gray-300">{{ p.accion }}</p>
                                <div class="text-xs text-gray-400 mt-1">Compromiso: {{ p.fechaCompromiso | date:'dd/MM/yyyy' }}<span *ngIf="p.seguimiento"> • {{ p.seguimiento }}</span></div>
                            </div>
                            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold shrink-0" [ngClass]="claseEstatus(p.estatus)">
                                {{ etiquetaEstatus(p.estatus) }}
                            </span>
                        </li>
                    </ul>
                </section>
            </ng-container>
        </div>
    `
})
export class MiDesempenoComponent implements OnInit {
    private readonly _service = inject(DesempenoService);

    datos: MiDesempeno | null = null;
    cargando = false;
    mensajeError = '';

    readonly etiquetaTipo = etiquetaTipo;
    readonly etiquetaEvaluador = etiquetaEvaluador;
    readonly etiquetaEstatus = etiquetaEstatus;
    readonly claseEstatus = claseEstatus;

    ngOnInit(): void {
        this.cargando = true;
        this._service.miDesempeno().subscribe({
            next: (d) => {
                this.datos = d;
                this.cargando = false;
            },
            error: (err) => {
                this.cargando = false;
                this.mensajeError = err?.error?.mensaje || 'No se pudo cargar tu desempeño.';
            }
        });
    }
}
