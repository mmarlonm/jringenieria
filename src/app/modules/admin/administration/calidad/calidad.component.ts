import { Component, OnInit, ViewChild, ElementRef, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CalidadService, ParetoItem } from './calidad.service';
import Swal from 'sweetalert2';
import * as Highcharts from 'highcharts';
import Pareto from 'highcharts/modules/pareto';
import Networkgraph from 'highcharts/modules/networkgraph';

// Initialize Highcharts modules safely
try {
    const hc: any = Highcharts;
    if (typeof Pareto === 'function' && hc.seriesTypes && !hc.seriesTypes.pareto) {
        Pareto(Highcharts);
    }
    if (typeof Networkgraph === 'function' && hc.seriesTypes && !hc.seriesTypes.networkgraph) {
        Networkgraph(Highcharts);
    }
} catch (e) {
    console.error('Error initializing Highcharts modules', e);
}

export interface AmefItem {
    id: number;
    proceso: string;
    modoFalla: string;
    efecto: string;
    severidad: number;
    ocurrencia: number;
    deteccion: number;
    npr: number;
    accionMitigadora: string;
}

@Component({
    selector: 'app-calidad',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatProgressSpinnerModule,
        MatSnackBarModule
    ],
    template: `
        <div class="flex flex-col flex-auto min-w-0 p-6 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen">
            
            <!-- Header -->
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
                <div>
                    <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <span class="p-2 rounded-xl bg-indigo-600 text-white shadow-md">
                            <mat-icon class="icon-size-7">verified_user</mat-icon>
                        </span>
                        Sistema de Gestión de Calidad (ISO 9001:2015)
                    </h1>
                    <p class="mt-1 text-slate-500 text-sm">Suite Integrada: Pareto, Ishikawa 6M, SCAMPER, AMEF (Riesgos), FODA y Control Estadístico SPC</p>
                </div>
            </div>

            <!-- Steps / Navigation Tabs -->
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 my-6">
                <button (click)="setStep(1)" [class]="'p-3 rounded-xl border text-left transition-all font-semibold flex items-center gap-2.5 ' + (currentStep === 1 ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50')">
                    <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-white/20 border border-current">1</span>
                    <span class="text-xs truncate">Pareto (Quejas)</span>
                </button>

                <button (click)="setStep(2)" [class]="'p-3 rounded-xl border text-left transition-all font-semibold flex items-center gap-2.5 ' + (currentStep === 2 ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50')">
                    <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-white/20 border border-current">2</span>
                    <span class="text-xs truncate">Ishikawa (6M)</span>
                </button>

                <button (click)="setStep(3)" [class]="'p-3 rounded-xl border text-left transition-all font-semibold flex items-center gap-2.5 ' + (currentStep === 3 ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50')">
                    <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-white/20 border border-current">3</span>
                    <span class="text-xs truncate">SCAMPER / Plan</span>
                </button>

                <button (click)="setStep(4)" [class]="'p-3 rounded-xl border text-left transition-all font-semibold flex items-center gap-2.5 ' + (currentStep === 4 ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50')">
                    <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-white/20 border border-current">4</span>
                    <span class="text-xs truncate">AMEF (Riesgos)</span>
                </button>

                <button (click)="setStep(5)" [class]="'p-3 rounded-xl border text-left transition-all font-semibold flex items-center gap-2.5 ' + (currentStep === 5 ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50')">
                    <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-white/20 border border-current">5</span>
                    <span class="text-xs truncate">Análisis FODA</span>
                </button>

                <button (click)="setStep(6)" [class]="'p-3 rounded-xl border text-left transition-all font-semibold flex items-center gap-2.5 ' + (currentStep === 6 ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50')">
                    <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-white/20 border border-current">6</span>
                    <span class="text-xs truncate">Control SPC (±3σ)</span>
                </button>

                <button (click)="setStep(7)" [class]="'p-3 rounded-xl border text-left transition-all font-semibold flex items-center gap-2.5 ' + (currentStep === 7 ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50')">
                    <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-white/20 border border-current">7</span>
                    <span class="text-xs truncate">Acción CRM</span>
                </button>
            </div>

            <!-- Loading Spinner -->
            <div *ngIf="loading" class="flex flex-col items-center justify-center min-h-[400px]">
                <mat-spinner diameter="48"></mat-spinner>
                <span class="mt-4 text-slate-500 font-medium">Cargando módulo de calidad...</span>
            </div>

            <!-- Content Area -->
            <div *ngIf="!loading" class="grid grid-cols-1 gap-6">

                <!-- STEP 1: PARETO CHART -->
                <div *ngIf="currentStep === 1" class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h2 class="text-xl font-bold text-slate-800 dark:text-white">Análisis de Pareto: No Conformidades CRM</h2>
                            <p class="text-xs text-slate-500">Identificación del 80% de problemas concentrados en el 20% de las causas raíz</p>
                        </div>
                        <span class="px-3 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full">ISO 9001: 8.7 & 10.2</span>
                    </div>
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div class="lg:col-span-2">
                            <div #paretoChartContainer class="w-full rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700" style="height: 400px;"></div>
                        </div>
                        <div class="flex flex-col gap-4">
                            <div class="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700">
                                <h3 class="font-bold text-slate-800 dark:text-white text-sm uppercase mb-2">Instrucciones de Análisis</h3>
                                <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Selecciona abajo la No Conformidad que deseas analizar. La gráfica muestra el volumen acumulado de quejas para enfocar los esfuerzos en la solución más impactante.
                                </p>
                            </div>
                            
                            <div class="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30 flex flex-col gap-2">
                                <span class="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">Categoría a Analizar</span>
                                
                                <mat-form-field appearance="outline" class="w-full mt-1" subscriptSizing="dynamic">
                                    <mat-label>No Conformidad / Queja</mat-label>
                                    <mat-select [(value)]="selectedCategory" placeholder="Seleccione una categoría...">
                                        <mat-option *ngFor="let item of paretoData" [value]="item.categoria">
                                            {{ item.categoria }} ({{ item.frecuencia }} eventos)
                                        </mat-option>
                                    </mat-select>
                                </mat-form-field>

                                <button *ngIf="selectedCategory" mat-raised-button color="primary" class="w-full mt-3" (click)="iniciarAnalisisIshikawa()">
                                    <mat-icon class="mr-1">trending_flat</mat-icon>
                                    Iniciar Análisis Ishikawa 6M
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- STEP 2: ISHIKAWA 6M DIAGRAM -->
                <div *ngIf="currentStep === 2" class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                        <div>
                            <h2 class="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                Diagrama de Ishikawa (Espina de Pescado 6M)
                                <span class="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-700 rounded-md">Interactivo: Arrastrar & Zoom</span>
                            </h2>
                            <p class="text-xs text-slate-500">Analizando el problema: <strong class="text-indigo-600">{{ selectedCategory }}</strong></p>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                            <!-- Controles de Zoom -->
                            <div class="flex items-center bg-slate-100 dark:bg-slate-700/50 rounded-lg p-1 border border-slate-200 dark:border-slate-600">
                                <button mat-icon-button class="icon-size-7 text-slate-700 dark:text-slate-200" (click)="zoomIshikawa(0.15)" matTooltip="Acercar (Zoom In)">
                                    <mat-icon class="icon-size-4">add</mat-icon>
                                </button>
                                <span class="text-xs font-mono font-bold px-1.5 text-slate-700 dark:text-slate-200">{{ (ishikawaZoomLevel * 100) | number:'1.0-0' }}%</span>
                                <button mat-icon-button class="icon-size-7 text-slate-700 dark:text-slate-200" (click)="zoomIshikawa(-0.15)" matTooltip="Alejar (Zoom Out)">
                                    <mat-icon class="icon-size-4">remove</mat-icon>
                                </button>
                                <button mat-icon-button class="icon-size-7 text-slate-700 dark:text-slate-200" (click)="resetZoomIshikawa()" matTooltip="Restablecer Zoom y Posición">
                                    <mat-icon class="icon-size-4">restart_alt</mat-icon>
                                </button>
                            </div>

                            <button mat-stroked-button color="warn" (click)="confirmarBorrado('Ishikawa')">
                                <mat-icon class="icon-size-4">delete_sweep</mat-icon>
                                <span class="ml-1">Reiniciar</span>
                            </button>
                            <button mat-button color="primary" (click)="setStep(1)"><mat-icon>arrow_back</mat-icon> Volver al Pareto</button>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">
                        <div class="xl:col-span-3 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 relative bg-slate-900/5 dark:bg-slate-900/40 p-4">
                            
                            <!-- CONTENEDOR INTERACTIVO FISHBONE (ESPINAS SVG) -->
                            <div class="w-full overflow-auto custom-scrollbar flex items-center justify-center p-6" style="min-h-[420px]">
                                <div class="relative transition-transform origin-center select-none" [style.transform]="'scale(' + ishikawaZoomLevel + ')'" style="width: 850px; height: 380px;">
                                    
                                    <!-- SVG DE LÍNEAS Y ESTRUCTURA -->
                                    <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 850 380">
                                        <defs>
                                            <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                                <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
                                            </marker>
                                        </defs>

                                        <!-- Eje Espinal Central -->
                                        <line x1="40" y1="190" x2="680" y2="190" stroke="#475569" stroke-width="4" stroke-linecap="round" marker-end="url(#arrow)" />

                                        <!-- Líneas Diagonales Superiores (45 grados) -->
                                        <!-- Mano de Obra (X: 160) -->
                                        <line x1="160" y1="55" x2="240" y2="190" stroke="#3b82f6" stroke-width="3" stroke-dasharray="4 2" />
                                        <!-- Maquinaria (X: 340) -->
                                        <line x1="340" y1="55" x2="420" y2="190" stroke="#06b6d4" stroke-width="3" stroke-dasharray="4 2" />
                                        <!-- Métodos (X: 520) -->
                                        <line x1="520" y1="55" x2="600" y2="190" stroke="#10b981" stroke-width="3" stroke-dasharray="4 2" />

                                        <!-- Líneas Diagonales Inferiores (45 grados) -->
                                        <!-- Materiales (X: 160) -->
                                        <line x1="160" y1="325" x2="240" y2="190" stroke="#8b5cf6" stroke-width="3" stroke-dasharray="4 2" />
                                        <!-- Medio Ambiente (X: 340) -->
                                        <line x1="340" y1="325" x2="420" y2="190" stroke="#ec4899" stroke-width="3" stroke-dasharray="4 2" />
                                        <!-- Medición (X: 520) -->
                                        <line x1="520" y1="325" x2="600" y2="190" stroke="#64748b" stroke-width="3" stroke-dasharray="4 2" />
                                    </svg>

                                    <!-- NODO RAÍZ / CABEZA DEL PESCADO (PROBLEMA EN ROJO) -->
                                    <div class="absolute right-2 top-[150px] w-48 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-2xl p-3 shadow-xl border-2 border-white/20 z-20 flex flex-col items-center justify-center text-center">
                                        <span class="text-[9px] uppercase tracking-wider font-extrabold text-red-200">No Conformidad (Efecto)</span>
                                        <span class="text-xs font-black leading-tight mt-0.5">{{ selectedCategory || 'Sin Seleccionar' }}</span>
                                    </div>

                                    <!-- 6M SUPERIORES (CABECERAS + TARJETAS DE CAUSAS) -->
                                    <!-- 1. MANO DE OBRA -->
                                    <div class="absolute left-[110px] top-[15px] z-10 flex flex-col items-center">
                                        <span class="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1">
                                            <span>👤 Mano de Obra</span>
                                        </span>
                                        <div class="flex flex-col gap-1 mt-2 items-center">
                                            <div *ngFor="let c of getCausasPorCategoria('Mano de Obra')" class="px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-semibold rounded-lg shadow-sm border border-blue-100 dark:border-blue-900 flex items-center gap-1.5 hover:scale-105 transition-transform">
                                                <span>{{ c }}</span>
                                                <button class="text-red-500 hover:text-red-700 font-bold" (click)="eliminarCausaIshikawa('Mano de Obra', c)">×</button>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 2. MAQUINARIA -->
                                    <div class="absolute left-[290px] top-[15px] z-10 flex flex-col items-center">
                                        <span class="px-3 py-1 bg-cyan-600 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1">
                                            <span>⚙️ Maquinaria</span>
                                        </span>
                                        <div class="flex flex-col gap-1 mt-2 items-center">
                                            <div *ngFor="let c of getCausasPorCategoria('Maquinaria')" class="px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-semibold rounded-lg shadow-sm border border-cyan-100 dark:border-cyan-900 flex items-center gap-1.5 hover:scale-105 transition-transform">
                                                <span>{{ c }}</span>
                                                <button class="text-red-500 hover:text-red-700 font-bold" (click)="eliminarCausaIshikawa('Maquinaria', c)">×</button>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 3. MÉTODOS -->
                                    <div class="absolute left-[470px] top-[15px] z-10 flex flex-col items-center">
                                        <span class="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1">
                                            <span>📋 Métodos</span>
                                        </span>
                                        <div class="flex flex-col gap-1 mt-2 items-center">
                                            <div *ngFor="let c of getCausasPorCategoria('Métodos')" class="px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-semibold rounded-lg shadow-sm border border-emerald-100 dark:border-emerald-900 flex items-center gap-1.5 hover:scale-105 transition-transform">
                                                <span>{{ c }}</span>
                                                <button class="text-red-500 hover:text-red-700 font-bold" (click)="eliminarCausaIshikawa('Métodos', c)">×</button>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 6M INFERIORES (CABECERAS + TARJETAS DE CAUSAS) -->
                                    <!-- 4. MATERIALES -->
                                    <div class="absolute left-[110px] bottom-[15px] z-10 flex flex-col-reverse items-center">
                                        <span class="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1">
                                            <span>📦 Materiales</span>
                                        </span>
                                        <div class="flex flex-col gap-1 mb-2 items-center">
                                            <div *ngFor="let c of getCausasPorCategoria('Materiales')" class="px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-semibold rounded-lg shadow-sm border border-purple-100 dark:border-purple-900 flex items-center gap-1.5 hover:scale-105 transition-transform">
                                                <span>{{ c }}</span>
                                                <button class="text-red-500 hover:text-red-700 font-bold" (click)="eliminarCausaIshikawa('Materiales', c)">×</button>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 5. MEDIO AMBIENTE -->
                                    <div class="absolute left-[290px] bottom-[15px] z-10 flex flex-col-reverse items-center">
                                        <span class="px-3 py-1 bg-pink-600 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1">
                                            <span>🌱 Medio Ambiente</span>
                                        </span>
                                        <div class="flex flex-col gap-1 mb-2 items-center">
                                            <div *ngFor="let c of getCausasPorCategoria('Medio Ambiente')" class="px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-semibold rounded-lg shadow-sm border border-pink-100 dark:border-pink-900 flex items-center gap-1.5 hover:scale-105 transition-transform">
                                                <span>{{ c }}</span>
                                                <button class="text-red-500 hover:text-red-700 font-bold" (click)="eliminarCausaIshikawa('Medio Ambiente', c)">×</button>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 6. MEDICIÓN -->
                                    <div class="absolute left-[470px] bottom-[15px] z-10 flex flex-col-reverse items-center">
                                        <span class="px-3 py-1 bg-slate-600 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1">
                                            <span>📐 Medición</span>
                                        </span>
                                        <div class="flex flex-col gap-1 mb-2 items-center">
                                            <div *ngFor="let c of getCausasPorCategoria('Medición')" class="px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-semibold rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 hover:scale-105 transition-transform">
                                                <span>{{ c }}</span>
                                                <button class="text-red-500 hover:text-red-700 font-bold" (click)="eliminarCausaIshikawa('Medición', c)">×</button>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                        
                        <div class="flex flex-col gap-4">
                            <div class="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700">
                                <h3 class="font-bold text-slate-800 dark:text-white text-sm uppercase mb-3">Agregar Causa a las 6M</h3>
                                <div class="flex flex-col gap-3">
                                    <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                                        <mat-label>Categoría 6M</mat-label>
                                        <mat-select [(value)]="nuevaCausaCategoria">
                                            <mat-option value="Mano de Obra">Mano de Obra</mat-option>
                                            <mat-option value="Maquinaria">Maquinaria</mat-option>
                                            <mat-option value="Métodos">Métodos</mat-option>
                                            <mat-option value="Materiales">Materiales</mat-option>
                                            <mat-option value="Medio Ambiente">Medio Ambiente</mat-option>
                                            <mat-option value="Medición">Medición</mat-option>
                                        </mat-select>
                                    </mat-form-field>

                                    <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                                        <mat-label>Descripción de la Causa</mat-label>
                                        <input matInput [(ngModel)]="nuevaCausaTexto" placeholder="Ej. Falta de capacitación">
                                    </mat-form-field>

                                    <button mat-flat-button color="accent" (click)="agregarCausaIshikawa()">Agregar Causa</button>
                                </div>
                            </div>

                            <div class="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30 flex flex-col gap-2">
                                <span class="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">Acción</span>
                                <p class="text-xs text-slate-500">Guarda el diagrama de Ishikawa y define tu plan de acción en el Mapa Mental / SCAMPER.</p>
                                <button mat-raised-button color="primary" class="w-full" (click)="guardarEIniciarMapaMental()">
                                    Proceder a Plan / SCAMPER
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- STEP 3: MIND MAP / SCAMPER -->
                <div *ngIf="currentStep === 3" class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                        <div>
                            <h2 class="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                Plan de Ideas Creativas (SCAMPER & Mapa Mental)
                                <span class="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-purple-100 text-purple-700 rounded-md">Innovación ISO 9001: 8.3</span>
                            </h2>
                            <p class="text-xs text-slate-500">Generación de propuestas para resolver: <strong class="text-indigo-600">{{ selectedCategory }}</strong></p>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                            <!-- Controles de Zoom -->
                            <div class="flex items-center bg-slate-100 dark:bg-slate-700/50 rounded-lg p-1 border border-slate-200 dark:border-slate-600">
                                <button mat-icon-button class="icon-size-7 text-slate-700 dark:text-slate-200" (click)="zoomMindmap(0.15)" matTooltip="Acercar (Zoom In)">
                                    <mat-icon class="icon-size-4">add</mat-icon>
                                </button>
                                <span class="text-xs font-mono font-bold px-1.5 text-slate-700 dark:text-slate-200">{{ (mindmapZoomLevel * 100) | number:'1.0-0' }}%</span>
                                <button mat-icon-button class="icon-size-7 text-slate-700 dark:text-slate-200" (click)="zoomMindmap(-0.15)" matTooltip="Alejar (Zoom Out)">
                                    <mat-icon class="icon-size-4">remove</mat-icon>
                                </button>
                                <button mat-icon-button class="icon-size-7 text-slate-700 dark:text-slate-200" (click)="resetZoomMindmap()" matTooltip="Restablecer Zoom y Posición">
                                    <mat-icon class="icon-size-4">restart_alt</mat-icon>
                                </button>
                            </div>

                            <button mat-stroked-button color="warn" (click)="confirmarBorrado('MapaMental')">
                                <mat-icon class="icon-size-4">delete_sweep</mat-icon>
                                <span class="ml-1">Reiniciar</span>
                            </button>
                            <button mat-button color="primary" (click)="setStep(2)"><mat-icon>arrow_back</mat-icon> Volver a Ishikawa</button>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">
                        <div class="xl:col-span-3 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 relative bg-slate-900/5 dark:bg-slate-900/40 p-4">
                            
                            <!-- LIENZO DINÁMICO MAPA MENTAL / SCAMPER -->
                            <div class="w-full overflow-auto custom-scrollbar flex items-center justify-center p-6" style="min-h-[420px]">
                                <div class="relative transition-transform origin-center select-none flex flex-col items-center gap-8" [style.transform]="'scale(' + mindmapZoomLevel + ')'" style="width: 800px;">
                                    
                                    <!-- NODO CENTRAL PRINCIPAL (PROBLEMA) -->
                                    <div class="bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 text-white rounded-2xl p-4 shadow-xl border-2 border-white/30 text-center max-w-md w-full z-20">
                                        <span class="text-[10px] uppercase font-black tracking-widest text-purple-200">No Conformidad Raíz</span>
                                        <h3 class="text-base font-extrabold mt-0.5 leading-snug">{{ selectedCategory || 'Sin Seleccionar' }}</h3>
                                    </div>

                                    <!-- REJILLA DE IDEAS SCAMPER ORGANIZADAS EN TARJETAS -->
                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full z-10">
                                        <div *ngFor="let nodo of mindMapNodes; let i = index" class="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-purple-100 dark:border-purple-900/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3 group">
                                            <div>
                                                <div class="flex items-center justify-between mb-1.5">
                                                    <span class="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                                                        💡 Idea #{{ i + 1 }}
                                                    </span>
                                                    <button class="text-slate-400 hover:text-red-500 font-bold text-xs" (click)="eliminarNodoMindMap(i)">×</button>
                                                </div>
                                                <p class="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug">
                                                    {{ nodo.etiqueta }}
                                                </p>
                                            </div>

                                            <button mat-flat-button color="primary" class="w-full dense-button text-xs font-bold" (click)="seleccionarIdeaParaTarea(nodo.etiqueta)">
                                                <mat-icon class="icon-size-4">rocket_launch</mat-icon>
                                                <span>Convertir en Tarea CRM</span>
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        <div class="flex flex-col gap-4">
                            <div class="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700">
                                <h3 class="font-bold text-slate-800 dark:text-white text-sm uppercase mb-3">Agregar Idea / SCAMPER</h3>
                                <div class="flex flex-col gap-3">
                                    <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                                        <mat-label>Técnica SCAMPER</mat-label>
                                        <mat-select [(value)]="scamperTecnicaSeleccionada">
                                            <mat-option value="Sustituir">Sustituir (S)</mat-option>
                                            <mat-option value="Combinar">Combinar (C)</mat-option>
                                            <mat-option value="Adaptar">Adaptar (A)</mat-option>
                                            <mat-option value="Modificar">Modificar (M)</mat-option>
                                            <mat-option value="Proponer">Proponer otros usos (P)</mat-option>
                                            <mat-option value="Eliminar">Eliminar (E)</mat-option>
                                            <mat-option value="Reordenar">Reordenar (R)</mat-option>
                                        </mat-select>
                                    </mat-form-field>

                                    <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                                        <mat-label>Propuesta de Mejora</mat-label>
                                        <input matInput [(ngModel)]="nuevoNodoTexto" placeholder="Ej. Automatizar alertas de traslape">
                                    </mat-form-field>

                                    <button mat-flat-button color="accent" (click)="agregarNodoMindMap()">Agregar Idea</button>
                                </div>
                            </div>

                            <div class="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30 flex flex-col gap-2">
                                <span class="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">Acción Final</span>
                                <p class="text-xs text-slate-500">Guarda el Plan y procede a convertir la idea seleccionada en una tarea en el CRM.</p>
                                <button mat-raised-button color="primary" class="w-full" (click)="guardarEIniciarConversion()">
                                    Proceder a Conversión de Tarea
                                </button>
                            </div>
                        </div>
                    </div>
                </div>


                <!-- STEP 4: AMEF / FMEA (Riesgos ISO 9001: 6.1) -->
                <div *ngIf="currentStep === 4" class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h2 class="text-xl font-bold text-slate-800 dark:text-white">Análisis de Modo y Efecto de Fallas (AMEF / FMEA)</h2>
                            <p class="text-xs text-slate-500">Gestión de Riesgos (ISO 9001: 6.1) — Cálculo del Número de Prioridad de Riesgo (NPR = Severidad × Ocurrencia × Detección)</p>
                        </div>
                        <span class="px-3 py-1 text-xs font-bold text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300 rounded-full">Gestión de Riesgos</span>
                    </div>

                    <!-- Formulario AMEF -->
                    <div class="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700 mb-6">
                        <h3 class="font-bold text-slate-800 dark:text-white text-sm uppercase mb-3">Registrar Evaluación de Riesgo AMEF</h3>
                        <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                                <mat-label>Proceso / Actividad</mat-label>
                                <input matInput [(ngModel)]="nuevoAmef.proceso" placeholder="Ej. Despacho">
                            </mat-form-field>
                            <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                                <mat-label>Modo de Falla</mat-label>
                                <input matInput [(ngModel)]="nuevoAmef.modoFalla" placeholder="Ej. Guía equivocada">
                            </mat-form-field>
                            <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                                <mat-label>Severidad (1-10)</mat-label>
                                <input matInput type="number" min="1" max="10" [(ngModel)]="nuevoAmef.severidad">
                            </mat-form-field>
                            <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                                <mat-label>Ocurrencia (1-10)</mat-label>
                                <input matInput type="number" min="1" max="10" [(ngModel)]="nuevoAmef.ocurrencia">
                            </mat-form-field>
                            <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                                <mat-label>Detección (1-10)</mat-label>
                                <input matInput type="number" min="1" max="10" [(ngModel)]="nuevoAmef.deteccion">
                            </mat-form-field>
                            <div class="flex items-center">
                                <button mat-raised-button color="accent" class="w-full h-11" (click)="agregarAmefItem()">
                                    <mat-icon>add</mat-icon> Agregar AMEF
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Tabla de Matriz AMEF -->
                    <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                        <table class="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                            <thead class="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white uppercase font-bold text-[11px]">
                                <tr>
                                    <th class="p-3">Proceso</th>
                                    <th class="p-3">Modo de Falla</th>
                                    <th class="p-3 text-center">Sev (S)</th>
                                    <th class="p-3 text-center">Ocur (O)</th>
                                    <th class="p-3 text-center">Det (D)</th>
                                    <th class="p-3 text-center">NPR (S×O×D)</th>
                                    <th class="p-3 text-center">Nivel de Riesgo</th>
                                    <th class="p-3 text-right">Acción CRM</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
                                <tr *ngFor="let item of amefItems" class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td class="p-3 font-semibold">{{ item.proceso }}</td>
                                    <td class="p-3">{{ item.modoFalla }}</td>
                                    <td class="p-3 text-center font-mono">{{ item.severidad }}</td>
                                    <td class="p-3 text-center font-mono">{{ item.ocurrencia }}</td>
                                    <td class="p-3 text-center font-mono">{{ item.deteccion }}</td>
                                    <td class="p-3 text-center font-black text-sm font-mono">{{ item.npr }}</td>
                                    <td class="p-3 text-center">
                                        <span [class]="'px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ' + (item.npr > 100 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : (item.npr >= 40 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'))">
                                            {{ item.npr > 100 ? 'CRÍTICO (ALTO)' : (item.npr >= 40 ? 'MEDIO' : 'BAJO') }}
                                        </span>
                                    </td>
                                    <td class="p-3 text-right">
                                        <button mat-stroked-button color="primary" class="dense-button" (click)="crearTareaDesdeAmef(item)">
                                            <mat-icon class="icon-size-4">task_alt</mat-icon>
                                            <span>Mitigar en CRM</span>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- STEP 5: FODA / SWOT INTERACTIVO (ISO 9001: Cap 4) -->
                <div *ngIf="currentStep === 5" class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h2 class="text-xl font-bold text-slate-800 dark:text-white">Matriz FODA / SWOT Interactivo</h2>
                            <p class="text-xs text-slate-500">Contexto de la Organización y Partes Interesadas (ISO 9001: Cap. 4)</p>
                        </div>
                        <span class="px-3 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-full">ISO 9001: 4.1 & 4.2</span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Fortalezas -->
                        <div class="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/40">
                            <div class="flex items-center justify-between mb-3">
                                <h3 class="font-bold text-emerald-800 dark:text-emerald-300 text-base flex items-center gap-2">
                                    <mat-icon>workspace_premium</mat-icon> Fortalezas (Interno)
                                </h3>
                            </div>
                            <div class="flex gap-2 mb-3">
                                <input matInput [(ngModel)]="nuevaFortaleza" placeholder="Agregar fortaleza..." class="w-full bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border text-xs">
                                <button mat-flat-button color="primary" (click)="agregarFodaItem('fortalezas', nuevaFortaleza); nuevaFortaleza=''">+</button>
                            </div>
                            <ul class="space-y-2">
                                <li *ngFor="let item of fodaData.fortalezas; let i = index" class="p-2.5 bg-white dark:bg-slate-900 rounded-lg text-xs font-medium border border-emerald-100 dark:border-emerald-900/30 flex justify-between items-center shadow-xs">
                                    <span>{{ item }}</span>
                                    <button mat-icon-button color="warn" class="icon-size-6" (click)="eliminarFodaItem('fortalezas', i)"><mat-icon class="icon-size-4">close</mat-icon></button>
                                </li>
                            </ul>
                        </div>

                        <!-- Oportunidades -->
                        <div class="p-4 bg-blue-50/60 dark:bg-blue-950/20 rounded-2xl border border-blue-200 dark:border-blue-900/40">
                            <div class="flex items-center justify-between mb-3">
                                <h3 class="font-bold text-blue-800 dark:text-blue-300 text-base flex items-center gap-2">
                                    <mat-icon>trending_up</mat-icon> Oportunidades (Externo)
                                </h3>
                            </div>
                            <div class="flex gap-2 mb-3">
                                <input matInput [(ngModel)]="nuevaOportunidad" placeholder="Agregar oportunidad..." class="w-full bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border text-xs">
                                <button mat-flat-button color="primary" (click)="agregarFodaItem('oportunidades', nuevaOportunidad); nuevaOportunidad=''">+</button>
                            </div>
                            <ul class="space-y-2">
                                <li *ngFor="let item of fodaData.oportunidades; let i = index" class="p-2.5 bg-white dark:bg-slate-900 rounded-lg text-xs font-medium border border-blue-100 dark:border-blue-900/30 flex justify-between items-center shadow-xs">
                                    <span>{{ item }}</span>
                                    <button mat-icon-button color="warn" class="icon-size-6" (click)="eliminarFodaItem('oportunidades', i)"><mat-icon class="icon-size-4">close</mat-icon></button>
                                </li>
                            </ul>
                        </div>

                        <!-- Debilidades -->
                        <div class="p-4 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/40">
                            <div class="flex items-center justify-between mb-3">
                                <h3 class="font-bold text-amber-800 dark:text-amber-300 text-base flex items-center gap-2">
                                    <mat-icon>warning</mat-icon> Debilidades (Interno)
                                </h3>
                            </div>
                            <div class="flex gap-2 mb-3">
                                <input matInput [(ngModel)]="nuevaDebilidad" placeholder="Agregar debilidad..." class="w-full bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border text-xs">
                                <button mat-flat-button color="primary" (click)="agregarFodaItem('debilidades', nuevaDebilidad); nuevaDebilidad=''">+</button>
                            </div>
                            <ul class="space-y-2">
                                <li *ngFor="let item of fodaData.debilidades; let i = index" class="p-2.5 bg-white dark:bg-slate-900 rounded-lg text-xs font-medium border border-amber-100 dark:border-amber-900/30 flex justify-between items-center shadow-xs">
                                    <span>{{ item }}</span>
                                    <button mat-icon-button color="warn" class="icon-size-6" (click)="eliminarFodaItem('debilidades', i)"><mat-icon class="icon-size-4">close</mat-icon></button>
                                </li>
                            </ul>
                        </div>

                        <!-- Amenazas -->
                        <div class="p-4 bg-rose-50/60 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/40">
                            <div class="flex items-center justify-between mb-3">
                                <h3 class="font-bold text-rose-800 dark:text-rose-300 text-base flex items-center gap-2">
                                    <mat-icon>gavel</mat-icon> Amenazas (Externo)
                                </h3>
                            </div>
                            <div class="flex gap-2 mb-3">
                                <input matInput [(ngModel)]="nuevaAmenaza" placeholder="Agregar amenaza..." class="w-full bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border text-xs">
                                <button mat-flat-button color="primary" (click)="agregarFodaItem('amenazas', nuevaAmenaza); nuevaAmenaza=''">+</button>
                            </div>
                            <ul class="space-y-2">
                                <li *ngFor="let item of fodaData.amenazas; let i = index" class="p-2.5 bg-white dark:bg-slate-900 rounded-lg text-xs font-medium border border-rose-100 dark:border-rose-900/30 flex justify-between items-center shadow-xs">
                                    <span>{{ item }}</span>
                                    <button mat-icon-button color="warn" class="icon-size-6" (click)="eliminarFodaItem('amenazas', i)"><mat-icon class="icon-size-4">close</mat-icon></button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- STEP 6: CONTROL SPC DE PROCESOS (ISO 9001: 9.1) -->
                <div *ngIf="currentStep === 6" class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h2 class="text-xl font-bold text-slate-800 dark:text-white">Control Estadístico de Procesos (SPC - Límites ±3σ)</h2>
                            <p class="text-xs text-slate-500">Monitoreo de Estabilidad de Procesos y Alertas Tempranas (ISO 9001: 9.1 Evaluación del Desempeño)</p>
                        </div>
                        <span class="px-3 py-1 text-xs font-bold text-cyan-700 bg-cyan-50 dark:bg-cyan-900/30 dark:text-cyan-300 rounded-full">Estabilidad Operativa</span>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div class="lg:col-span-2">
                            <div #spcChartContainer class="w-full rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700" style="height: 400px;"></div>
                        </div>

                        <div class="flex flex-col gap-4">
                            <div class="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700">
                                <h3 class="font-bold text-slate-800 dark:text-white text-sm uppercase mb-2">Parámetros Estadísticos</h3>
                                <div class="space-y-2 text-xs">
                                    <div class="flex justify-between border-b pb-1">
                                        <span class="text-slate-500">Media Central (μ):</span>
                                        <span class="font-bold font-mono">{{ spcData?.media }}%</span>
                                    </div>
                                    <div class="flex justify-between border-b pb-1 text-red-600">
                                        <span>Límite Control Superior (LCS +3σ):</span>
                                        <span class="font-bold font-mono">{{ spcData?.ucl }}%</span>
                                    </div>
                                    <div class="flex justify-between border-b pb-1 text-blue-600">
                                        <span>Límite Control Inferior (LCI -3σ):</span>
                                        <span class="font-bold font-mono">{{ spcData?.lcl }}%</span>
                                    </div>
                                </div>
                            </div>

                            <div class="p-4 bg-cyan-50/50 dark:bg-cyan-900/10 rounded-xl border border-cyan-100 dark:border-cyan-900/30 flex flex-col gap-2">
                                <span class="text-xs text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider">Estado de Proceso</span>
                                <p class="text-xs text-slate-500 leading-relaxed">
                                    Si una muestra excede el LCS o cae del LCI, el sistema activa una alerta preventiva para registrar la acción correctiva.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- STEP 7: CONVERT TO TASK -->
                <div *ngIf="currentStep === 7" class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm max-w-2xl mx-auto w-full">
                    <div class="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                        <h2 class="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <mat-icon color="primary">task</mat-icon>
                            Generar Acción Correctiva / Tarea de Mejora
                        </h2>
                        <button mat-icon-button (click)="setStep(1)"><mat-icon>close</mat-icon></button>
                    </div>

                    <form [formGroup]="formTarea" class="flex flex-col gap-4">
                        <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                            <mat-label>Acción Correctiva / Título de Tarea</mat-label>
                            <input matInput formControlName="titulo" required>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                            <mat-label>Descripción / Detalles del Plan de Acción</mat-label>
                            <textarea matInput formControlName="comentarios" rows="5" placeholder="Detalla las actividades, responsables y metas..."></textarea>
                        </mat-form-field>

                        <div class="grid grid-cols-2 gap-4">
                            <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                                <mat-label>Prioridad</mat-label>
                                <mat-select formControlName="prioridad">
                                    <mat-option value="Alta">Alta</mat-option>
                                    <mat-option value="Media">Media</mat-option>
                                    <mat-option value="Baja">Baja</mat-option>
                                </mat-select>
                            </mat-form-field>

                            <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                                <mat-label>Área de Seguimiento</mat-label>
                                <input matInput formControlName="rolArea">
                            </mat-form-field>
                        </div>

                        <div class="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <button mat-button type="button" (click)="setStep(1)">Cancelar</button>
                            <button mat-raised-button color="primary" type="button" (click)="crearTareaFinal()" [disabled]="!formTarea.valid">
                                <mat-icon class="mr-1">done</mat-icon>
                                Confirmar y Crear en CRM/ERP
                            </button>
                        </div>
                    </form>
                </div>

            </div>
        </div>
    `,
    styles: [`
        :host {
            display: flex;
            flex-direction: column;
            width: 100%;
        }
    `]
})
export class CalidadComponent implements OnInit {
    @ViewChild('paretoChartContainer') paretoContainer!: ElementRef;
    @ViewChild('ishikawaChartContainer') ishikawaContainer!: ElementRef;
    @ViewChild('mindmapChartContainer') mindmapContainer!: ElementRef;
    @ViewChild('spcChartContainer') spcContainer!: ElementRef;

    private _calidadService = inject(CalidadService);
    private _fb = inject(FormBuilder);
    private _cdr = inject(ChangeDetectorRef);
    private _snackBar = inject(MatSnackBar);

    currentStep = 1;
    loading = false;

    // Pareto data
    selectedCategory = '';
    paretoData: ParetoItem[] = [];

    // Ishikawa & Mindmap Zoom & Drag State
    ishikawaZoomLevel: number = 1;
    mindmapZoomLevel: number = 1;

    // Ishikawa data
    nuevaCausaCategoria = 'Mano de Obra';
    nuevaCausaTexto = '';
    ishikawaCausas: { categoria: string; causa: string }[] = [];

    zoomIshikawa(delta: number): void {
        this.ishikawaZoomLevel = Math.max(0.5, Math.min(2.5, Math.round((this.ishikawaZoomLevel + delta) * 100) / 100));
    }

    resetZoomIshikawa(): void {
        this.ishikawaZoomLevel = 1;
        this.renderIshikawaChart();
    }

    zoomMindmap(delta: number): void {
        this.mindmapZoomLevel = Math.max(0.5, Math.min(2.5, Math.round((this.mindmapZoomLevel + delta) * 100) / 100));
    }

    resetZoomMindmap(): void {
        this.mindmapZoomLevel = 1;
        this.renderMindmapChart();
    }

    // Mind Map data
    nuevoNodoParentId = '';
    nuevoNodoTexto = '';
    mindMapNodes: { id: string; etiqueta: string; parentId: string }[] = [];

    // AMEF data
    nuevoAmef: Partial<AmefItem> = { proceso: '', modoFalla: '', severidad: 5, ocurrencia: 3, deteccion: 2 };
    amefItems: AmefItem[] = [
        { id: 1, proceso: 'Entrega de Obra / Pedido', modoFalla: 'Retraso en logística de envío', efecto: 'Insatisfacción cliente CRM', severidad: 8, ocurrencia: 6, deteccion: 4, npr: 192, accionMitigadora: 'Implementar rastreo GPS obligatorio' },
        { id: 2, proceso: 'Ensamblado de Estructura', modoFalla: 'Defecto en soldadura / fisura', efecto: 'Rechazo de calidad ISO', severidad: 9, ocurrencia: 3, deteccion: 3, npr: 81, accionMitigadora: 'Inspección previa por ultrasonido' },
        { id: 3, proceso: 'Facturación y Cobro', modoFalla: 'Diferencia en importe final', efecto: 'Retraso en pago cliente', severidad: 5, ocurrencia: 4, deteccion: 2, npr: 40, accionMitigadora: 'Validación automatizada ERP' }
    ];

    // FODA Data
    nuevaFortaleza = '';
    nuevaOportunidad = '';
    nuevaDebilidad = '';
    nuevaAmenaza = '';
    fodaData = {
        fortalezas: ['Personal de ingeniería especializado', 'Sistema CRM/ERP integrado en tiempo real'],
        oportunidades: ['Crecimiento en demanda de obras industriales', 'Automatización con IA'],
        debilidades: ['Capacitación pendiente en nuevas herramientas', 'Tiempos de proveedor logístico'],
        amenazas: ['Volatilidad en costos de materias primas', 'Competencia informal']
    };

    // SPC Data
    spcData: any = null;

    // Task Form
    formTarea!: FormGroup;

    ngOnInit(): void {
        this.formTarea = this._fb.group({
            titulo: ['', Validators.required],
            comentarios: [''],
            prioridad: ['Alta'],
            rolArea: ['Calidad']
        });

        this.cargarPareto();
    }

    setStep(step: number): void {
        this.currentStep = step;
        
        if (!this.selectedCategory && this.paretoData.length > 0) {
            this.selectedCategory = this.paretoData[0].categoria;
        }

        this._cdr.detectChanges();

        if (step === 1) {
            setTimeout(() => this.renderParetoChart(), 100);
        } else if (step === 2) {
            this.loading = true;
            this._calidadService.getHerramientasPorTipo('Ishikawa').subscribe({
                next: (herramientas) => {
                    const tituloBuscado = `Ishikawa - ${this.selectedCategory}`;
                    const existente = herramientas.find(h => h.titulo === tituloBuscado);
                    if (existente && existente.datosJson) {
                        try {
                            this.ishikawaCausas = JSON.parse(existente.datosJson);
                        } catch (e) {
                            console.error(e);
                        }
                    }
                    this.loading = false;
                    this._cdr.detectChanges();
                    setTimeout(() => this.renderIshikawaChart(), 100);
                },
                error: () => {
                    this.loading = false;
                    this._cdr.detectChanges();
                    setTimeout(() => this.renderIshikawaChart(), 100);
                }
            });
        } else if (step === 3) {
            this.loading = true;
            this._calidadService.getHerramientasPorTipo('MapaMental').subscribe({
                next: (herramientas) => {
                    const tituloBuscado = `Mapa Mental - ${this.selectedCategory}`;
                    const existente = herramientas.find(h => h.titulo === tituloBuscado);
                    if (existente && existente.datosJson) {
                        try {
                            this.mindMapNodes = JSON.parse(existente.datosJson);
                        } catch (e) {
                             console.error(e);
                        }
                    }
                    this.loading = false;
                    this._cdr.detectChanges();
                    setTimeout(() => this.renderMindmapChart(), 100);
                },
                error: () => {
                    this.loading = false;
                    this._cdr.detectChanges();
                    setTimeout(() => this.renderMindmapChart(), 100);
                }
            });
        } else if (step === 6) {
            this.cargarSpc();
        }
    }

    cargarPareto(): void {
        this.loading = true;
        this._calidadService.getParetoIncidentes().subscribe({
            next: (res) => {
                this.paretoData = res.items;
                this.loading = false;
                this._cdr.detectChanges();
                setTimeout(() => this.renderParetoChart(), 150);
            },
            error: (err) => {
                console.error(err);
                this._snackBar.open('❌ Error al cargar incidentes', 'Cerrar', { duration: 4000 });
                this.loading = false;
                this._cdr.detectChanges();
            }
        });
    }

    renderParetoChart(): void {
        if (!this.paretoContainer) return;

        const categories = this.paretoData.map(i => i.categoria);
        const frequencies = this.paretoData.map(i => i.frecuencia);

        Highcharts.chart(this.paretoContainer.nativeElement, {
            chart: {
                type: 'column',
                backgroundColor: 'transparent',
                height: '400px'
            },
            title: {
                text: 'Diagrama de Pareto de No Conformidades / Incidentes',
                style: { color: '#1e293b', fontWeight: 'bold', fontSize: '15px' }
            },
            xAxis: {
                categories: categories,
                crosshair: true,
                labels: { style: { fontSize: '11px', color: '#475569' } }
            },
            yAxis: [{
                title: { text: 'Frecuencia (Cantidad)' }
            }, {
                title: { text: 'Porcentaje Acumulado' },
                min: 0,
                max: 100,
                opposite: true,
                labels: { format: '{value}%' }
            }],
            plotOptions: {
                column: {
                    borderRadius: 6,
                    color: {
                        linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
                        stops: [
                            [0, '#6366f1'],
                            [1, '#4f46e5']
                        ]
                    }
                },
                series: { cursor: 'default' }
            },
            series: [{
                type: 'column',
                name: 'Frecuencia',
                data: frequencies,
                yAxis: 0
            }, {
                type: 'line',
                name: 'Porcentaje Acumulado',
                data: this.paretoData.map(i => i.porcentajeAcumulado),
                yAxis: 1,
                color: '#ef4444',
                marker: { enabled: true, radius: 4 }
            }],
            credits: { enabled: false }
        } as any);
    }

    iniciarAnalisisIshikawa(): void {
        if (!this.selectedCategory && this.paretoData.length > 0) {
            this.selectedCategory = this.paretoData[0].categoria;
        }
        if (!this.selectedCategory) return;
        
        this.loading = true;
        this._cdr.detectChanges();

        this._calidadService.getHerramientasPorTipo('Ishikawa').subscribe({
            next: (herramientas) => {
                const tituloBuscado = `Ishikawa - ${this.selectedCategory}`;
                const existente = herramientas.find(h => h.titulo === tituloBuscado);
                if (existente && existente.datosJson) {
                    try {
                        this.ishikawaCausas = JSON.parse(existente.datosJson);
                    } catch (e) {
                        console.error(e);
                    }
                } else {
                    this.ishikawaCausas = [
                        { categoria: 'Mano de Obra', causa: 'Falta de capacitación del personal' },
                        { categoria: 'Maquinaria', causa: 'Herramientas de software desactualizadas' },
                        { categoria: 'Métodos', causa: 'Proceso de entrega no estandarizado' },
                        { categoria: 'Materiales', causa: 'Insumos de baja calidad' },
                        { categoria: 'Medio Ambiente', causa: 'Espacio de trabajo ruidoso' },
                        { categoria: 'Medición', causa: 'Falta de indicadores clave (KPIs)' }
                    ];
                }
                this.loading = false;
                this.setStep(2);
            },
            error: () => {
                this.loading = false;
                this.setStep(2);
            }
        });
    }

    agregarCausaIshikawa(): void {
        if (!this.nuevaCausaTexto.trim()) return;

        this.ishikawaCausas.push({
            categoria: this.nuevaCausaCategoria,
            causa: this.nuevaCausaTexto.trim()
        });

        this.nuevaCausaTexto = '';
        this.renderIshikawaChart();
    }

    getCausasPorCategoria(cat: string): string[] {
        return this.ishikawaCausas.filter(c => c.categoria === cat).map(c => c.causa);
    }

    eliminarCausaIshikawa(cat: string, causa: string): void {
        this.ishikawaCausas = this.ishikawaCausas.filter(c => !(c.categoria === cat && c.causa === causa));
        this._cdr.detectChanges();
    }

    renderIshikawaChart(): void {}

    guardarEIniciarMapaMental(): void {
        const rootNode = this.selectedCategory || 'General';
        const payload = {
            tipoHerramienta: 'Ishikawa',
            titulo: `Ishikawa - ${rootNode}`,
            datosJson: JSON.stringify(this.ishikawaCausas)
        };

        this.loading = true;
        this._cdr.detectChanges();

        this._calidadService.guardarHerramienta(payload).subscribe({
            next: () => {
                this._snackBar.open('💾 Diagrama de Ishikawa guardado', 'OK', { duration: 3000 });
                
                this._calidadService.getHerramientasPorTipo('MapaMental').subscribe({
                    next: (herramientas) => {
                        const tituloBuscado = `Mapa Mental - ${rootNode}`;
                        const existente = herramientas.find(h => h.titulo === tituloBuscado);
                        if (existente && existente.datosJson) {
                            try {
                                this.mindMapNodes = JSON.parse(existente.datosJson);
                            } catch (e) {
                                console.error(e);
                            }
                        } else {
                            this.mindMapNodes = [
                                { id: 'Sustituir', etiqueta: 'Sustituir proveedores de logística', parentId: rootNode },
                                { id: 'Combinar', etiqueta: 'Combinar entregas por zonas geográficas', parentId: rootNode },
                                { id: 'Adaptar', etiqueta: 'Adaptar software de rastreo GPS', parentId: rootNode }
                            ];
                        }
                        this.nuevoNodoParentId = rootNode;
                        this.loading = false;
                        this.setStep(3);
                    },
                    error: () => {
                        this.loading = false;
                        this.setStep(3);
                    }
                });
            },
            error: () => {
                this._snackBar.open('❌ Error al guardar herramienta', 'Cerrar', { duration: 4000 });
            }
        });
    }

    // SCAMPER State & Methods
    scamperTecnicaSeleccionada = 'Adaptar';

    agregarNodoMindMap(): void {
        if (!this.nuevoNodoTexto.trim()) return;

        const newId = 'Idea_' + Math.random().toString(36).substr(2, 9);
        const tecnicaPrefix = this.scamperTecnicaSeleccionada ? `[${this.scamperTecnicaSeleccionada}] ` : '';
        this.mindMapNodes.push({
            id: newId,
            etiqueta: `${tecnicaPrefix}${this.nuevoNodoTexto.trim()}`,
            parentId: this.nuevoNodoParentId || this.selectedCategory
        });

        this.nuevoNodoTexto = '';
        this._cdr.detectChanges();
    }

    eliminarNodoMindMap(index: number): void {
        this.mindMapNodes.splice(index, 1);
        this._cdr.detectChanges();
    }

    seleccionarIdeaParaTarea(etiqueta: string): void {
        const rootNode = this.selectedCategory || 'No Conformidad';
        this.formTarea.patchValue({
            titulo: `Acción Correctiva SCAMPER: ${etiqueta}`,
            comentarios: `Acción correctiva / Tarea de mejora para solventar la no conformidad: "${rootNode}" mediante la propuesta SCAMPER: "${etiqueta}".`,
            prioridad: 'Alta'
        });
        this._cdr.detectChanges();
        this._snackBar.open(`🚀 Idea seleccionada para Tarea: ${etiqueta}`, 'OK', { duration: 4000 });
        this.setStep(7);
    }

    renderMindmapChart(): void {}

    guardarEIniciarConversion(): void {
        const payload = {
            tipoHerramienta: 'MapaMental',
            titulo: `Mapa Mental - ${this.selectedCategory}`,
            datosJson: JSON.stringify(this.mindMapNodes)
        };

        this._calidadService.guardarHerramienta(payload).subscribe({
            next: () => {
                this._snackBar.open('💾 Plan de ideas guardado', 'OK', { duration: 3000 });
                this.setStep(7);
            },
            error: () => {
                this._snackBar.open('❌ Error al guardar Mapa Mental', 'Cerrar', { duration: 4000 });
            }
        });
    }

    // AMEF Methods
    agregarAmefItem(): void {
        if (!this.nuevoAmef.proceso || !this.nuevoAmef.modoFalla) return;

        const s = Number(this.nuevoAmef.severidad || 5);
        const o = Number(this.nuevoAmef.ocurrencia || 3);
        const d = Number(this.nuevoAmef.deteccion || 2);
        const npr = s * o * d;

        this.amefItems.push({
            id: Date.now(),
            proceso: this.nuevoAmef.proceso,
            modoFalla: this.nuevoAmef.modoFalla,
            efecto: 'Riesgo operativo identificado',
            severidad: s,
            ocurrencia: o,
            deteccion: d,
            npr: npr,
            accionMitigadora: 'Acción preventiva requerida'
        });

        this.nuevoAmef = { proceso: '', modoFalla: '', severidad: 5, ocurrencia: 3, deteccion: 2 };
        this._snackBar.open('✅ Evaluación AMEF agregada', 'OK', { duration: 3000 });
    }

    crearTareaDesdeAmef(item: AmefItem): void {
        this.formTarea.patchValue({
            titulo: `Acción Mitigadora AMEF (NPR ${item.npr}): ${item.proceso}`,
            comentarios: `Acción mitigadora para el modo de falla: "${item.modoFalla}" en el proceso de "${item.proceso}". Severidad: ${item.severidad}, Ocurrencia: ${item.ocurrencia}, Detección: ${item.deteccion}. NPR: ${item.npr}.`,
            prioridad: item.npr > 100 ? 'Alta' : 'Media'
        });
        this.setStep(7);
    }

    // FODA Methods
    agregarFodaItem(categoria: 'fortalezas' | 'oportunidades' | 'debilidades' | 'amenazas', texto: string): void {
        if (!texto || !texto.trim()) return;
        this.fodaData[categoria].push(texto.trim());
    }

    eliminarFodaItem(categoria: 'fortalezas' | 'oportunidades' | 'debilidades' | 'amenazas', index: number): void {
        this.fodaData[categoria].splice(index, 1);
    }

    // SPC Methods
    cargarSpc(): void {
        this.loading = true;
        this._calidadService.getSpcControl().subscribe({
            next: (res) => {
                this.spcData = res;
                this.loading = false;
                this._cdr.detectChanges();
                setTimeout(() => this.renderSpcChart(), 100);
            },
            error: (err) => {
                console.error(err);
                this.loading = false;
            }
        });
    }

    renderSpcChart(): void {
        if (!this.spcContainer || !this.spcData) return;

        const categories = this.spcData.lotes.map((l: any) => l.lote);
        const values = this.spcData.lotes.map((l: any) => ({
            y: l.valor,
            color: l.fueraDeControl ? '#ef4444' : '#06b6d4'
        }));

        Highcharts.chart(this.spcContainer.nativeElement, {
            chart: {
                type: 'line',
                backgroundColor: 'transparent',
                height: '400px'
            },
            title: {
                text: 'Gráfico de Control Estadístico SPC (Muestras vs. Límites ±3σ)',
                style: { color: '#1e293b', fontWeight: 'bold', fontSize: '15px' }
            },
            xAxis: {
                categories: categories,
                labels: { style: { fontSize: '10px' } }
            },
            yAxis: {
                title: { text: 'Calidad / Cumplimiento (%)' },
                plotLines: [
                    { value: this.spcData.ucl, color: '#ef4444', width: 2, dashStyle: 'Dash', label: { text: `LCS (+3σ): ${this.spcData.ucl}%`, style: { color: '#ef4444', fontWeight: 'bold' } } },
                    { value: this.spcData.media, color: '#10b981', width: 2, label: { text: `Media (μ): ${this.spcData.media}%`, style: { color: '#10b981', fontWeight: 'bold' } } },
                    { value: this.spcData.lcl, color: '#3b82f6', width: 2, dashStyle: 'Dash', label: { text: `LCI (-3σ): ${this.spcData.lcl}%`, style: { color: '#3b82f6', fontWeight: 'bold' } } }
                ]
            },
            series: [{
                type: 'line',
                name: 'Medición de Lote',
                data: values,
                marker: { radius: 5 }
            }],
            credits: { enabled: false }
        } as any);
    }

    crearTareaFinal(): void {
        this.loading = true;
        this._calidadService.convertirEnTarea(this.formTarea.value).subscribe({
            next: (res) => {
                this.loading = false;
                this._cdr.detectChanges();
                
                Swal.fire({
                    title: '¡Tarea Creada!',
                    text: `${res.message}. Folio Tarea: #${res.tareaId}`,
                    icon: 'success',
                    confirmButtonText: 'Excelente'
                }).then(() => {
                    this.setStep(1);
                    this.cargarPareto();
                });
            },
            error: (err) => {
                console.error(err);
                this._snackBar.open('❌ Error al crear acción correctiva en el CRM', 'Cerrar', { duration: 4000 });
                this.loading = false;
                this._cdr.detectChanges();
            }
        });
    }

    confirmarBorrado(tipo: 'Ishikawa' | 'MapaMental'): void {
        const rootNode = this.selectedCategory || 'General';
        const titulo = `${tipo === 'Ishikawa' ? 'Ishikawa' : 'Mapa Mental'} - ${rootNode}`;

        Swal.fire({
            title: '¿Estás seguro?',
            text: `Se eliminarán los datos guardados de este análisis (${tipo}) para la categoría actual.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, reiniciar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.loading = true;
                this._cdr.detectChanges();

                this._calidadService.eliminarHerramienta(tipo, titulo).subscribe({
                    next: () => {
                        this.loading = false;
                        if (tipo === 'Ishikawa') {
                            this.ishikawaCausas = [
                                { categoria: 'Mano de Obra', causa: 'Falta de capacitación del personal' },
                                { categoria: 'Maquinaria', causa: 'Herramientas de software desactualizadas' },
                                { categoria: 'Métodos', causa: 'Proceso de entrega no estandarizado' },
                                { categoria: 'Materiales', causa: 'Insumos de baja calidad' },
                                { categoria: 'Medio Ambiente', causa: 'Espacio de trabajo ruidoso' },
                                { categoria: 'Medición', causa: 'Falta de indicadores clave (KPIs)' }
                            ];
                            this.renderIshikawaChart();
                        } else {
                            this.mindMapNodes = [
                                { id: 'Sustituir', etiqueta: 'Sustituir proveedores de logística', parentId: rootNode },
                                { id: 'Combinar', etiqueta: 'Combinar entregas por zonas geográficas', parentId: rootNode },
                                { id: 'Adaptar', etiqueta: 'Adaptar software de rastreo GPS', parentId: rootNode }
                            ];
                            this.renderMindmapChart();
                        }
                        this._cdr.detectChanges();
                        Swal.fire('¡Reiniciado!', 'Los datos se han restablecido al estado inicial.', 'success');
                    },
                    error: (err) => {
                        console.error(err);
                        this.loading = false;
                        this._cdr.detectChanges();
                        this._snackBar.open('❌ Error al eliminar los datos preexistentes', 'Cerrar', { duration: 4000 });
                    }
                });
            }
        });
    }
}
