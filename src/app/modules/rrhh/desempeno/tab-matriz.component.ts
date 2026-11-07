import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';
import { DialogoMatrizComponent } from './dialogos/dialogo-matriz.component';
import { DesempenoService } from './desempeno.service';
import { GrupoPuesto, MatrizCompetencia } from './desempeno.types';
import { agruparMatrizPorPuesto } from './desempeno.utils';

/** Matriz de competencias: el nivel requerido (0 a 4) de cada competencia por puesto. La define RRHH. */
@Component({
    selector: 'app-tab-matriz',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule],
    template: `
        <div class="flex flex-col gap-4 pt-4">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <p class="text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
                    Nivel requerido de cada competencia por puesto, de 0 a 4. Al evaluar una competencia, si no capturas el nivel requerido se toma de aquí.
                </p>
                <button *ngIf="esGestor" mat-flat-button color="primary" (click)="agregar()">
                    <mat-icon svgIcon="heroicons_outline:plus"></mat-icon>
                    <span class="ml-2">Agregar competencia</span>
                </button>
            </div>

            <div *ngIf="!esGestor" class="p-3 rounded-lg text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                Solo RRHH define la matriz de competencias.
            </div>

            <div *ngIf="cargando" class="p-8 text-center text-gray-500">Cargando matriz...</div>
            <div *ngIf="!cargando && errorCarga" class="p-8 text-center text-red-600">
                No se pudo cargar la matriz.
                <button mat-button color="primary" (click)="cargar()">Reintentar</button>
            </div>
            <div *ngIf="!cargando && !errorCarga && grupos.length === 0" class="p-12 text-center text-gray-500">
                <p class="text-base font-semibold">La matriz de competencias está vacía</p>
                <p class="text-sm text-gray-400">Define qué competencias y qué nivel requiere cada puesto.</p>
            </div>

            <div *ngFor="let g of grupos" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div class="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <span class="font-bold text-gray-800 dark:text-gray-100">{{ g.puesto }}</span>
                    <span class="text-xs text-gray-500">{{ g.competencias.length }} {{ g.competencias.length === 1 ? 'competencia' : 'competencias' }}</span>
                </div>
                <ul class="divide-y divide-gray-200 dark:divide-gray-700">
                    <li *ngFor="let c of g.competencias" class="px-4 py-3 flex items-center justify-between gap-3">
                        <div class="min-w-0">
                            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ c.competencia }}</div>
                            <div *ngIf="c.descripcion" class="text-xs text-gray-500">{{ c.descripcion }}</div>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">Nivel {{ c.nivelRequerido }}</span>
                            <ng-container *ngIf="esGestor">
                                <button mat-icon-button (click)="editar(c)" aria-label="Editar">
                                    <mat-icon svgIcon="heroicons_outline:pencil-square"></mat-icon>
                                </button>
                                <button mat-icon-button color="warn" (click)="eliminar(c)" aria-label="Eliminar">
                                    <mat-icon svgIcon="heroicons_outline:trash"></mat-icon>
                                </button>
                            </ng-container>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
    `
})
export class TabMatrizComponent implements OnInit {
    private readonly _service = inject(DesempenoService);
    private readonly _dialog = inject(MatDialog);
    private readonly _permisos = inject(PermisosEspecialesService);

    grupos: GrupoPuesto[] = [];
    cargando = false;
    errorCarga = false;

    get esGestor(): boolean {
        return this._permisos.tiene('rrhh.desempeno.gestionar');
    }

    ngOnInit(): void {
        this.cargar();
    }

    cargar(): void {
        this.cargando = true;
        this.errorCarga = false;
        this._service.listarMatriz().subscribe({
            next: (filas) => {
                this.grupos = agruparMatrizPorPuesto(filas);
                this.cargando = false;
            },
            error: () => {
                this.cargando = false;
                this.errorCarga = true;
            }
        });
    }

    agregar(): void {
        this._dialog.open(DialogoMatrizComponent, { data: {}, maxHeight: '90vh' })
            .afterClosed().subscribe((res) => { if (res) this.cargar(); });
    }

    editar(fila: MatrizCompetencia): void {
        this._dialog.open(DialogoMatrizComponent, { data: { fila }, maxHeight: '90vh' })
            .afterClosed().subscribe((res) => { if (res) this.cargar(); });
    }

    eliminar(fila: MatrizCompetencia): void {
        if (!confirm(`¿Quitar «${fila.competencia}» del puesto ${fila.puesto}?`)) return;
        this._service.eliminarMatriz(fila.matrizId).subscribe({
            next: () => this.cargar(),
            error: (err) => alert(err?.error?.mensaje || 'No se pudo eliminar la competencia')
        });
    }
}
