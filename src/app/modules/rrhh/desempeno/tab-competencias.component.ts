import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';
import { DialogoEvaluacionCompetenciaComponent } from './dialogos/dialogo-evaluacion-competencia.component';
import { DesempenoService } from './desempeno.service';
import { EvaluacionCompetencia, ResumenBrechas } from './desempeno.types';
import {
    AccionCompetencia,
    accionesCompetencia,
    claseClasificacion,
    claseEstatus,
    etiquetaClasificacion,
    etiquetaEstatus,
    resumenBrechas
} from './desempeno.utils';

/** Evaluación individual por competencia: nivel requerido vs. actual y la brecha que alimenta el plan de capacitación. */
@Component({
    selector: 'app-tab-competencias',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatCheckboxModule, MatIconModule, MatFormFieldModule, MatInputModule, MatDialogModule],
    template: `
        <div class="flex flex-col gap-4 pt-4">
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div class="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div class="text-xs uppercase text-gray-500 font-semibold">Evaluaciones</div>
                    <div class="text-2xl font-black">{{ resumen.total }}</div>
                </div>
                <div class="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div class="text-xs uppercase text-amber-600 font-semibold">Con brecha</div>
                    <div class="text-2xl font-black text-amber-600">{{ resumen.conBrecha }}</div>
                </div>
                <div class="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div class="text-xs uppercase text-red-600 font-semibold">Brechas críticas</div>
                    <div class="text-2xl font-black text-red-600">{{ resumen.criticas }}</div>
                </div>
                <div class="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div class="text-xs uppercase text-purple-600 font-semibold">Sin capacitación</div>
                    <div class="text-2xl font-black text-purple-600">{{ resumen.sinCapacitacion }}</div>
                    <div class="text-[11px] text-gray-400">Brechas que aún no están en el plan anual</div>
                </div>
            </div>

            <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div class="flex items-center gap-4">
                    <mat-form-field appearance="outline" class="w-full sm:w-72" subscriptSizing="dynamic">
                        <mat-icon matPrefix svgIcon="heroicons_outline:magnifying-glass" class="mr-2 text-gray-400"></mat-icon>
                        <input matInput [(ngModel)]="buscarTexto" (keyup.enter)="cargar()" placeholder="Buscar colaborador o competencia..." />
                    </mat-form-field>
                    <mat-checkbox [(ngModel)]="soloConBrecha" (change)="cargar()" color="primary">Solo con brecha</mat-checkbox>
                </div>
                <button mat-flat-button color="primary" (click)="nueva()">
                    <mat-icon svgIcon="heroicons_outline:plus"></mat-icon>
                    <span class="ml-2">Evaluar competencia</span>
                </button>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div *ngIf="cargando" class="p-8 text-center text-gray-500">Cargando competencias...</div>
                <div *ngIf="!cargando && errorCarga" class="p-8 text-center text-red-600">
                    No se pudieron cargar las competencias.
                    <button mat-button color="primary" (click)="cargar()">Reintentar</button>
                </div>
                <div *ngIf="!cargando && !errorCarga && evaluaciones.length === 0" class="p-12 text-center text-gray-500">
                    <p class="text-base font-semibold">No hay evaluaciones de competencias</p>
                    <p class="text-sm text-gray-400">Evalúa una competencia para conocer su brecha.</p>
                </div>

                <div *ngIf="!cargando && evaluaciones.length > 0" class="overflow-x-auto">
                    <table class="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                        <thead class="bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th class="py-3 px-4">Colaborador / Puesto</th>
                                <th class="py-3 px-4">Competencia</th>
                                <th class="py-3 px-4 text-center">Requerido / Actual</th>
                                <th class="py-3 px-4 text-center">Brecha</th>
                                <th class="py-3 px-4">Acción / Compromiso</th>
                                <th class="py-3 px-4 text-center">Estatus</th>
                                <th class="py-3 px-4">Capacitación</th>
                                <th class="py-3 px-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                            <tr *ngFor="let e of evaluaciones">
                                <td class="py-3 px-4">
                                    <div class="font-bold text-gray-900 dark:text-gray-100">{{ e.colaboradorNombre }}</div>
                                    <div class="text-xs text-gray-400">{{ e.puesto || 'Sin puesto' }}<span *ngIf="e.area"> • {{ e.area }}</span></div>
                                </td>
                                <td class="py-3 px-4 font-medium">{{ e.competencia }}</td>
                                <td class="py-3 px-4 text-center">{{ e.nivelRequerido }} / {{ e.nivelActual }}</td>
                                <td class="py-3 px-4 text-center">
                                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold" [ngClass]="claseClasificacion(e.clasificacion)">
                                        {{ etiquetaClasificacion(e.clasificacion) }}<span *ngIf="e.brecha > 0"> ({{ e.brecha }})</span>
                                    </span>
                                </td>
                                <td class="py-3 px-4">
                                    <div class="line-clamp-2">{{ e.accion || '—' }}</div>
                                    <div class="text-xs text-gray-400" *ngIf="e.fechaCompromiso">Compromiso: {{ e.fechaCompromiso | date:'dd/MM/yyyy' }}</div>
                                </td>
                                <td class="py-3 px-4 text-center">
                                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold" [ngClass]="claseEstatus(e.estatus)">
                                        {{ etiquetaEstatus(e.estatus) }}
                                    </span>
                                </td>
                                <td class="py-3 px-4">
                                    <a *ngIf="e.capacitacionId" [routerLink]="['/rrhh/capacitacion', e.capacitacionId]" class="text-primary hover:underline font-medium">
                                        {{ e.capacitacionFolio || 'Ver curso' }}
                                    </a>
                                    <span *ngIf="!e.capacitacionId && e.requiereCapacitacion" class="text-xs text-amber-600">Requiere capacitación</span>
                                    <span *ngIf="!e.capacitacionId && !e.requiereCapacitacion" class="text-gray-400">—</span>
                                </td>
                                <td class="py-3 px-4">
                                    <div class="flex flex-wrap justify-end gap-1">
                                        <button *ngFor="let a of acciones(e)" mat-stroked-button color="primary" [disabled]="ocupado" (click)="ejecutar(a, e)">
                                            {{ a === 'editar' ? 'Editar' : 'Generar capacitación' }}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `
})
export class TabCompetenciasComponent implements OnInit {
    private readonly _service = inject(DesempenoService);
    private readonly _dialog = inject(MatDialog);
    private readonly _permisos = inject(PermisosEspecialesService);

    evaluaciones: EvaluacionCompetencia[] = [];
    resumen: ResumenBrechas = { total: 0, conBrecha: 0, criticas: 0, sinCapacitacion: 0 };
    cargando = false;
    errorCarga = false;
    ocupado = false;
    buscarTexto = '';
    soloConBrecha = false;

    readonly claseClasificacion = claseClasificacion;
    readonly etiquetaClasificacion = etiquetaClasificacion;
    readonly claseEstatus = claseEstatus;
    readonly etiquetaEstatus = etiquetaEstatus;

    get esGestor(): boolean {
        return this._permisos.tiene('rrhh.desempeno.gestionar');
    }

    acciones(e: EvaluacionCompetencia): AccionCompetencia[] {
        return accionesCompetencia(e, this.esGestor);
    }

    ngOnInit(): void {
        this.cargar();
    }

    cargar(): void {
        this.cargando = true;
        this.errorCarga = false;
        this._service.listarCompetencias({ soloConBrecha: this.soloConBrecha, buscar: this.buscarTexto.trim() || undefined }).subscribe({
            next: (data) => {
                this.evaluaciones = data;
                this.resumen = resumenBrechas(data);
                this.cargando = false;
            },
            error: () => {
                this.cargando = false;
                this.errorCarga = true;
            }
        });
    }

    nueva(): void {
        this._dialog.open(DialogoEvaluacionCompetenciaComponent, { data: {}, maxHeight: '90vh' })
            .afterClosed().subscribe((res) => { if (res) this.cargar(); });
    }

    ejecutar(accion: AccionCompetencia, e: EvaluacionCompetencia): void {
        if (accion === 'editar') {
            this._dialog.open(DialogoEvaluacionCompetenciaComponent, { data: { evaluacion: e }, maxHeight: '90vh' })
                .afterClosed().subscribe((res) => { if (res) this.cargar(); });
            return;
        }

        if (!confirm(`¿Generar en el plan anual la capacitación de ${e.competencia} para ${e.colaboradorNombre}?`)) return;
        this.ocupado = true;
        this._service.generarCapacitacion(e.evaluacionId).subscribe({
            next: () => {
                this.ocupado = false;
                this.cargar();
            },
            error: (err) => {
                this.ocupado = false;
                alert(err?.error?.mensaje || 'No se pudo generar la capacitación');
            }
        });
    }
}
