import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';
import { Observable } from 'rxjs';
import { DialogoEvaluacionDesempenoComponent } from './dialogos/dialogo-evaluacion-desempeno.component';
import { DesempenoService } from './desempeno.service';
import { EvaluacionDesempeno } from './desempeno.types';
import {
    AccionEvaluacion,
    accionesEvaluacion,
    claseEstadoEvaluacion,
    estadoEvaluacion,
    etiquetaEvaluador,
    etiquetaTipo
} from './desempeno.utils';

/** Evaluaciones de desempeño con su ciclo: abierta → cerrada → liberada al colaborador. */
@Component({
    selector: 'app-tab-evaluaciones',
    standalone: true,
    imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatDialogModule],
    template: `
        <div class="flex flex-col gap-4 pt-4">
            <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
                <mat-form-field appearance="outline" class="w-full sm:w-80" subscriptSizing="dynamic">
                    <mat-icon matPrefix svgIcon="heroicons_outline:magnifying-glass" class="mr-2 text-gray-400"></mat-icon>
                    <input matInput [(ngModel)]="buscarTexto" (keyup.enter)="cargar()" placeholder="Buscar colaborador o periodo..." />
                </mat-form-field>
                <button mat-flat-button color="primary" (click)="nueva()">
                    <mat-icon svgIcon="heroicons_outline:plus"></mat-icon>
                    <span class="ml-2">Nueva evaluación</span>
                </button>
            </div>

            <div *ngIf="!esGestor" class="p-3 rounded-lg text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                Evalúas a tu personal directo. RRHH libera los resultados para que cada colaborador los vea.
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div *ngIf="cargando" class="p-8 text-center text-gray-500">Cargando evaluaciones...</div>
                <div *ngIf="!cargando && errorCarga" class="p-8 text-center text-red-600">
                    No se pudieron cargar las evaluaciones.
                    <button mat-button color="primary" (click)="cargar()">Reintentar</button>
                </div>
                <div *ngIf="!cargando && !errorCarga && evaluaciones.length === 0" class="p-12 text-center text-gray-500">
                    <p class="text-base font-semibold">No hay evaluaciones de desempeño</p>
                    <p class="text-sm text-gray-400">Crea una para registrar objetivo, resultado y calificación.</p>
                </div>

                <div *ngIf="!cargando && evaluaciones.length > 0" class="overflow-x-auto">
                    <table class="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                        <thead class="bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th class="py-3 px-4">Colaborador / Periodo</th>
                                <th class="py-3 px-4">Objetivo y resultado</th>
                                <th class="py-3 px-4">Tipo / Evaluador</th>
                                <th class="py-3 px-4 text-center">Calificación</th>
                                <th class="py-3 px-4 text-center">Estado</th>
                                <th class="py-3 px-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                            <tr *ngFor="let e of evaluaciones">
                                <td class="py-3 px-4">
                                    <div class="font-bold text-gray-900 dark:text-gray-100">{{ e.colaboradorNombre }}</div>
                                    <div class="text-xs text-gray-400">{{ e.periodo }}</div>
                                </td>
                                <td class="py-3 px-4 max-w-md">
                                    <div class="text-gray-800 dark:text-gray-200 line-clamp-2">{{ e.objetivo }}</div>
                                    <div class="text-xs text-gray-400 line-clamp-2">{{ e.resultado || 'Sin resultado' }}</div>
                                </td>
                                <td class="py-3 px-4">
                                    <div>{{ etiquetaTipo(e.tipoEvaluacion) }}</div>
                                    <div class="text-xs text-gray-400">{{ etiquetaEvaluador(e.evaluador) }}</div>
                                </td>
                                <td class="py-3 px-4 text-center font-black">
                                    {{ e.calificacion !== null && e.calificacion !== undefined ? e.calificacion.toFixed(1) : '—' }}
                                </td>
                                <td class="py-3 px-4 text-center">
                                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold" [ngClass]="claseEstadoEvaluacion(estado(e))">
                                        {{ estado(e) }}
                                    </span>
                                </td>
                                <td class="py-3 px-4">
                                    <div class="flex flex-wrap justify-end gap-1">
                                        <button *ngFor="let a of acciones(e)" mat-stroked-button [color]="a === 'reabrir' || a === 'retirarLiberacion' ? 'warn' : 'primary'"
                                                [disabled]="ocupado" (click)="ejecutar(a, e)">
                                            {{ etiquetaAccion(a) }}
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
export class TabEvaluacionesComponent implements OnInit {
    private readonly _service = inject(DesempenoService);
    private readonly _dialog = inject(MatDialog);
    private readonly _permisos = inject(PermisosEspecialesService);

    evaluaciones: EvaluacionDesempeno[] = [];
    cargando = false;
    errorCarga = false;
    ocupado = false;
    buscarTexto = '';

    readonly etiquetaTipo = etiquetaTipo;
    readonly etiquetaEvaluador = etiquetaEvaluador;
    readonly claseEstadoEvaluacion = claseEstadoEvaluacion;
    readonly estado = estadoEvaluacion;

    get esGestor(): boolean {
        return this._permisos.tiene('rrhh.desempeno.gestionar');
    }

    acciones(e: EvaluacionDesempeno): AccionEvaluacion[] {
        return accionesEvaluacion(e, this.esGestor);
    }

    ngOnInit(): void {
        this.cargar();
    }

    cargar(): void {
        this.cargando = true;
        this.errorCarga = false;
        this._service.listarEvaluaciones({ buscar: this.buscarTexto.trim() || undefined }).subscribe({
            next: (data) => {
                this.evaluaciones = data;
                this.cargando = false;
            },
            error: () => {
                this.cargando = false;
                this.errorCarga = true;
            }
        });
    }

    nueva(): void {
        this._dialog.open(DialogoEvaluacionDesempenoComponent, { data: {}, maxHeight: '90vh' })
            .afterClosed().subscribe((res) => { if (res) this.cargar(); });
    }

    ejecutar(accion: AccionEvaluacion, e: EvaluacionDesempeno): void {
        switch (accion) {
            case 'editar':
                this._dialog.open(DialogoEvaluacionDesempenoComponent, { data: { evaluacion: e }, maxHeight: '90vh' })
                    .afterClosed().subscribe((res) => { if (res) this.reemplazar(res); });
                break;
            case 'cerrar':
                this.confirmar(`¿Cerrar el ciclo de ${e.colaboradorNombre}? Después ya no se edita.`, () => this._service.cerrarCiclo(e.desempenoId));
                break;
            case 'liberar':
                this.confirmar(`¿Liberar el resultado a ${e.colaboradorNombre}? Podrá verlo en «Mi desempeño».`, () => this._service.liberar(e.desempenoId));
                break;
            case 'retirarLiberacion':
                this.confirmar(`¿Retirar el resultado de la vista de ${e.colaboradorNombre}?`, () => this._service.retirarLiberacion(e.desempenoId));
                break;
            case 'reabrir':
                this.confirmar(`¿Reabrir el ciclo de ${e.colaboradorNombre}? Si estaba liberado, dejará de verlo.`, () => this._service.reabrir(e.desempenoId));
                break;
        }
    }

    etiquetaAccion(a: AccionEvaluacion): string {
        return {
            editar: 'Editar',
            cerrar: 'Cerrar ciclo',
            liberar: 'Liberar',
            retirarLiberacion: 'Retirar liberación',
            reabrir: 'Reabrir'
        }[a];
    }

    private confirmar(mensaje: string, crearPeticion: () => Observable<EvaluacionDesempeno>): void {
        if (!confirm(mensaje)) return;
        this.ocupado = true;
        crearPeticion().subscribe({
            next: (res) => {
                this.ocupado = false;
                this.reemplazar(res);
            },
            error: (err) => {
                this.ocupado = false;
                alert(err?.error?.mensaje || 'No se pudo completar la acción');
            }
        });
    }

    private reemplazar(res: EvaluacionDesempeno): void {
        this.evaluaciones = this.evaluaciones.map((x) => (x.desempenoId === res.desempenoId ? res : x));
    }
}
