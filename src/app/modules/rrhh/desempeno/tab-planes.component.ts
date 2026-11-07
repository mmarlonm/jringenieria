import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';
import { DialogoPlanComponent } from './dialogos/dialogo-plan.component';
import { DesempenoService } from './desempeno.service';
import { PlanDesarrollo } from './desempeno.types';
import { claseEstatus, etiquetaEstatus } from './desempeno.utils';

/** Plan de desarrollo individual. RRHH decide cuándo el colaborador lo ve. */
@Component({
    selector: 'app-tab-planes',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule],
    template: `
        <div class="flex flex-col gap-4 pt-4">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <p class="text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
                    Acciones para desarrollar una competencia. El colaborador solo ve su plan cuando RRHH lo activa.
                </p>
                <button mat-flat-button color="primary" (click)="nuevo()">
                    <mat-icon svgIcon="heroicons_outline:plus"></mat-icon>
                    <span class="ml-2">Nuevo plan</span>
                </button>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div *ngIf="cargando" class="p-8 text-center text-gray-500">Cargando planes...</div>
                <div *ngIf="!cargando && errorCarga" class="p-8 text-center text-red-600">
                    No se pudieron cargar los planes.
                    <button mat-button color="primary" (click)="cargar()">Reintentar</button>
                </div>
                <div *ngIf="!cargando && !errorCarga && planes.length === 0" class="p-12 text-center text-gray-500">
                    <p class="text-base font-semibold">No hay planes de desarrollo</p>
                    <p class="text-sm text-gray-400">Crea uno para dar seguimiento al desarrollo de una competencia.</p>
                </div>

                <div *ngIf="!cargando && planes.length > 0" class="overflow-x-auto">
                    <table class="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                        <thead class="bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th class="py-3 px-4">Colaborador / Competencia</th>
                                <th class="py-3 px-4">Acción</th>
                                <th class="py-3 px-4">Compromiso</th>
                                <th class="py-3 px-4 text-center">Seguimiento</th>
                                <th class="py-3 px-4 text-center">Lo ve el colaborador</th>
                                <th class="py-3 px-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                            <tr *ngFor="let p of planes">
                                <td class="py-3 px-4">
                                    <div class="font-bold text-gray-900 dark:text-gray-100">{{ p.colaboradorNombre }}</div>
                                    <div class="text-xs text-gray-400">{{ p.competencia }}</div>
                                </td>
                                <td class="py-3 px-4 max-w-md">
                                    <div class="line-clamp-2">{{ p.accion }}</div>
                                    <div *ngIf="p.seguimiento" class="text-xs text-gray-400 line-clamp-1">{{ p.seguimiento }}</div>
                                </td>
                                <td class="py-3 px-4">{{ p.fechaCompromiso | date:'dd/MM/yyyy' }}</td>
                                <td class="py-3 px-4 text-center">
                                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold" [ngClass]="claseEstatus(p.estatus)">
                                        {{ etiquetaEstatus(p.estatus) }}
                                    </span>
                                </td>
                                <td class="py-3 px-4 text-center">
                                    <span class="text-xs font-semibold" [ngClass]="p.visibleParaColaborador ? 'text-emerald-600' : 'text-gray-400'">
                                        {{ p.visibleParaColaborador ? 'Sí' : 'No' }}
                                    </span>
                                    <button *ngIf="esGestor" mat-button color="primary" class="ml-1" (click)="cambiarVisibilidad(p)">
                                        {{ p.visibleParaColaborador ? 'Ocultar' : 'Mostrar' }}
                                    </button>
                                </td>
                                <td class="py-3 px-4">
                                    <div class="flex justify-end gap-1">
                                        <button mat-stroked-button color="primary" (click)="editar(p)">Editar</button>
                                        <button mat-icon-button color="warn" (click)="eliminar(p)" aria-label="Eliminar">
                                            <mat-icon svgIcon="heroicons_outline:trash"></mat-icon>
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
export class TabPlanesComponent implements OnInit {
    private readonly _service = inject(DesempenoService);
    private readonly _dialog = inject(MatDialog);
    private readonly _permisos = inject(PermisosEspecialesService);

    planes: PlanDesarrollo[] = [];
    cargando = false;
    errorCarga = false;

    readonly claseEstatus = claseEstatus;
    readonly etiquetaEstatus = etiquetaEstatus;

    get esGestor(): boolean {
        return this._permisos.tiene('rrhh.desempeno.gestionar');
    }

    ngOnInit(): void {
        this.cargar();
    }

    cargar(): void {
        this.cargando = true;
        this.errorCarga = false;
        this._service.listarPlanes().subscribe({
            next: (data) => {
                this.planes = data;
                this.cargando = false;
            },
            error: () => {
                this.cargando = false;
                this.errorCarga = true;
            }
        });
    }

    nuevo(): void {
        this._dialog.open(DialogoPlanComponent, { data: {}, maxHeight: '90vh' })
            .afterClosed().subscribe((res) => { if (res) this.cargar(); });
    }

    editar(plan: PlanDesarrollo): void {
        this._dialog.open(DialogoPlanComponent, { data: { plan }, maxHeight: '90vh' })
            .afterClosed().subscribe((res) => { if (res) this.cargar(); });
    }

    eliminar(plan: PlanDesarrollo): void {
        if (!confirm(`¿Eliminar el plan de ${plan.colaboradorNombre} (${plan.competencia})?`)) return;
        this._service.eliminarPlan(plan.planId).subscribe({
            next: () => this.cargar(),
            error: (err) => alert(err?.error?.mensaje || 'No se pudo eliminar el plan')
        });
    }

    cambiarVisibilidad(plan: PlanDesarrollo): void {
        this._service.cambiarVisibilidadPlan(plan.planId, !plan.visibleParaColaborador).subscribe({
            next: (res) => (this.planes = this.planes.map((p) => (p.planId === res.planId ? res : p))),
            error: (err) => alert(err?.error?.mensaje || 'No se pudo cambiar la visibilidad')
        });
    }
}
