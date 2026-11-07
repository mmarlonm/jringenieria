import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { TabCompetenciasComponent } from './tab-competencias.component';
import { TabEvaluacionesComponent } from './tab-evaluaciones.component';
import { TabMatrizComponent } from './tab-matriz.component';
import { TabPlanesComponent } from './tab-planes.component';

/** Desempeño y competencias: evaluaciones, competencias con su brecha, matriz por puesto y planes de desarrollo. */
@Component({
    selector: 'app-desempeno',
    standalone: true,
    imports: [CommonModule, MatTabsModule, MatIconModule, TabEvaluacionesComponent, TabCompetenciasComponent, TabMatrizComponent, TabPlanesComponent],
    template: `
        <div class="flex flex-col flex-auto min-w-0 p-6 md:p-8">
            <div class="pb-4 border-b border-gray-200 dark:border-gray-800">
                <div class="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-3">
                    <mat-icon class="icon-size-8 text-primary" svgIcon="heroicons_outline:chart-bar"></mat-icon>
                    <span>Desempeño y competencias</span>
                </div>
                <div class="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                    Evaluaciones de desempeño, brechas de competencias que alimentan el plan de capacitación y planes de desarrollo individual.
                </div>
            </div>

            <mat-tab-group animationDuration="0ms" class="mt-2">
                <mat-tab label="Evaluaciones de desempeño">
                    <ng-template matTabContent><app-tab-evaluaciones /></ng-template>
                </mat-tab>
                <mat-tab label="Competencias">
                    <ng-template matTabContent><app-tab-competencias /></ng-template>
                </mat-tab>
                <mat-tab label="Matriz de competencias">
                    <ng-template matTabContent><app-tab-matriz /></ng-template>
                </mat-tab>
                <mat-tab label="Planes de desarrollo">
                    <ng-template matTabContent><app-tab-planes /></ng-template>
                </mat-tab>
            </mat-tab-group>
        </div>
    `
})
export class DesempenoComponent {}
