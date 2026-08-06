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
        <div class="flex flex-col flex-auto min-w-0 p-6 md:p-8 bg-gray-50 dark:bg-slate-900 min-h-screen">
            
            <!-- Header -->
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-gray-200 dark:border-slate-800">
                <div>
                    <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Herramientas de Calidad (ISO 9001:2015)</h1>
                    <p class="mt-1 text-slate-500">Gestión de No Conformidades, Pareto, Ishikawa y Plan de Mejora / SCAMPER</p>
                </div>
            </div>

            <!-- Steps / Tabs Flow Indicator -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 my-6">
                <div [class]="'p-4 rounded-xl border transition-all cursor-pointer ' + (currentStep === 1 ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300')" (click)="setStep(1)">
                    <div class="flex items-center gap-3">
                        <span class="flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm bg-white/20 border border-current">1</span>
                        <div>
                            <p class="font-bold text-sm leading-tight">Pareto (Incidentes)</p>
                            <p class="text-xs opacity-75">Regla 80/20 de Quejas</p>
                        </div>
                    </div>
                </div>
                <div [class]="'p-4 rounded-xl border transition-all cursor-pointer ' + (currentStep === 2 ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300')" (click)="setStep(2)">
                    <div class="flex items-center gap-3">
                        <span class="flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm bg-white/20 border border-current">2</span>
                        <div>
                            <p class="font-bold text-sm leading-tight">Ishikawa (6M)</p>
                            <p class="text-xs opacity-75">Diagrama Causa-Efecto</p>
                        </div>
                    </div>
                </div>
                <div [class]="'p-4 rounded-xl border transition-all cursor-pointer ' + (currentStep === 3 ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300')" (click)="setStep(3)">
                    <div class="flex items-center gap-3">
                        <span class="flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm bg-white/20 border border-current">3</span>
                        <div>
                            <p class="font-bold text-sm leading-tight">Mapa Mental / SCAMPER</p>
                            <p class="text-xs opacity-75">Lluvia de Ideas</p>
                        </div>
                    </div>
                </div>
                <div [class]="'p-4 rounded-xl border transition-all cursor-pointer ' + (currentStep === 4 ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300')" (click)="setStep(4)">
                    <div class="flex items-center gap-3">
                        <span class="flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm bg-white/20 border border-current">4</span>
                        <div>
                            <p class="font-bold text-sm leading-tight">Acción Correctiva (CRM)</p>
                            <p class="text-xs opacity-75">Conversión Directa</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Loading Spinner -->
            <div *ngIf="loading" class="flex flex-col items-center justify-center min-h-[400px]">
                <mat-spinner diameter="48"></mat-spinner>
                <span class="mt-4 text-slate-500 font-medium">Cargando datos...</span>
            </div>

            <!-- Content Area -->
            <div *ngIf="!loading" class="grid grid-cols-1 gap-6">

                <!-- STEP 1: PARETO CHART -->
                <div *ngIf="currentStep === 1" class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-xl font-bold text-slate-800 dark:text-white">Análisis de Pareto: Quejas Recurrentes</h2>
                        <span class="px-3 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full">Norma ISO 9001: 8.7 & 10.2</span>
                    </div>
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div class="lg:col-span-2">
                            <div #paretoChartContainer class="w-full h-96 rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700"></div>
                        </div>
                        <div class="flex flex-col gap-4">
                            <div class="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700">
                                <h3 class="font-bold text-slate-800 dark:text-white text-sm uppercase mb-2">Instrucciones</h3>
                                <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Haz click en cualquier barra del gráfico de Pareto que represente la no conformidad o queja crítica para seleccionarla. El 80% de los problemas provienen del 20% de las causas.
                                </p>
                            </div>
                            
                            <div class="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30 flex flex-col gap-2">
                                <span class="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">Categoría Seleccionada</span>
                                <h4 class="text-lg font-black text-slate-800 dark:text-white">{{ selectedCategory || 'Ninguna (Haz click en el gráfico)' }}</h4>
                                <button *ngIf="selectedCategory" mat-raised-button color="primary" class="w-full mt-2" (click)="iniciarAnalisisIshikawa()">
                                    <mat-icon>trending_flat</mat-icon>
                                    Iniciar Análisis Causa Raíz
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- STEP 2: ISHIKAWA 6M DIAGRAM -->
                <div *ngIf="currentStep === 2" class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h2 class="text-xl font-bold text-slate-800 dark:text-white">Diagrama de Ishikawa (Espina de Pescado 6M)</h2>
                            <p class="text-xs text-slate-500">Analizando el problema: <strong class="text-indigo-600">{{ selectedCategory }}</strong></p>
                        </div>
                        <button mat-button color="primary" (click)="setStep(1)"><mat-icon>arrow_back</mat-icon> Volver al Pareto</button>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div class="lg:col-span-2">
                            <div #ishikawaChartContainer class="w-full h-96 rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700"></div>
                        </div>
                        
                        <div class="flex flex-col gap-4">
                            <!-- Agregar Causas Dinámicamente -->
                            <div class="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700">
                                <h3 class="font-bold text-slate-800 dark:text-white text-sm uppercase mb-3">Agregar Causa a las 6M</h3>
                                <div class="flex flex-col gap-3">
                                    <mat-form-field appearance="outline" class="w-full">
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

                                    <mat-form-field appearance="outline" class="w-full">
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
                <div *ngIf="currentStep === 3" class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h2 class="text-xl font-bold text-slate-800 dark:text-white">Plan de Ideas Creativas (Mapa Mental / SCAMPER)</h2>
                            <p class="text-xs text-slate-500">Plan de mejora para resolver: <strong class="text-indigo-600">{{ selectedCategory }}</strong></p>
                        </div>
                        <button mat-button color="primary" (click)="setStep(2)"><mat-icon>arrow_back</mat-icon> Volver a Ishikawa</button>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div class="lg:col-span-2">
                            <div #mindmapChartContainer class="w-full h-96 rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700"></div>
                        </div>

                        <div class="flex flex-col gap-4">
                            <!-- Agregar Nodo de Idea -->
                            <div class="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700">
                                <h3 class="font-bold text-slate-800 dark:text-white text-sm uppercase mb-3">Agregar Idea de Mejora</h3>
                                <div class="flex flex-col gap-3">
                                    <mat-form-field appearance="outline" class="w-full">
                                        <mat-label>Nodo Padre / Origen</mat-label>
                                        <mat-select [(value)]="nuevoNodoParentId">
                                            <mat-option [value]="selectedCategory">{{ selectedCategory }} (Raíz)</mat-option>
                                            <mat-option *ngFor="let nodo of mindMapNodes" [value]="nodo.id">{{ nodo.etiqueta }}</mat-option>
                                        </mat-select>
                                    </mat-form-field>

                                    <mat-form-field appearance="outline" class="w-full">
                                        <mat-label>Idea / Acción de Mejora</mat-label>
                                        <input matInput [(ngModel)]="nuevoNodoTexto" placeholder="Ej. Automatizar alertas de atraso">
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

                <!-- STEP 4: CONVERT TO TASK -->
                <div *ngIf="currentStep === 4" class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm max-w-2xl mx-auto w-full">
                    <div class="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                        <h2 class="text-2xl font-bold text-slate-800 dark:text-white">Generar Acción Correctiva / Tarea de Mejora</h2>
                        <button mat-icon-button (click)="setStep(3)"><mat-icon>close</mat-icon></button>
                    </div>

                    <form [formGroup]="formTarea" class="flex flex-col gap-4">
                        <mat-form-field appearance="outline" class="w-full">
                            <mat-label>Acción Correctiva / Título de Tarea</mat-label>
                            <input matInput formControlName="titulo" required>
                            <mat-error *ngIf="formTarea.get('titulo')?.hasError('required')">Título es requerido</mat-error>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="w-full">
                            <mat-label>Descripción / Detalles del Plan de Acción</mat-label>
                            <textarea matInput formControlName="comentarios" rows="5" placeholder="Detalla las actividades, responsables y metas..."></textarea>
                        </mat-form-field>

                        <div class="grid grid-cols-2 gap-4">
                            <mat-form-field appearance="outline" class="w-full">
                                <mat-label>Prioridad</mat-label>
                                <mat-select formControlName="prioridad">
                                    <mat-option value="Alta">Alta</mat-option>
                                    <mat-option value="Media">Media</mat-option>
                                    <mat-option value="Baja">Baja</mat-option>
                                </mat-select>
                            </mat-form-field>

                            <mat-form-field appearance="outline" class="w-full">
                                <mat-label>Área de Seguimiento</mat-label>
                                <input matInput formControlName="rolArea">
                            </mat-form-field>
                        </div>

                        <div class="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <button mat-button type="button" (click)="setStep(3)">Cancelar</button>
                            <button mat-raised-button color="primary" type="button" (click)="crearTareaFinal()" [disabled]="!formTarea.valid">
                                <mat-icon class="mr-1">done</mat-icon>
                                Confirmar y Crear en CRM
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

    private _calidadService = inject(CalidadService);
    private _fb = inject(FormBuilder);
    private _cdr = inject(ChangeDetectorRef);
    private _snackBar = inject(MatSnackBar);

    currentStep = 1;
    loading = false;

    // Pareto data
    selectedCategory = '';
    paretoData: ParetoItem[] = [];

    // Ishikawa data
    nuevaCausaCategoria = 'Mano de Obra';
    nuevaCausaTexto = '';
    ishikawaCausas: { categoria: string; causa: string }[] = [];

    // Mind Map data
    nuevoNodoParentId = '';
    nuevoNodoTexto = '';
    mindMapNodes: { id: string; etiqueta: string; parentId: string }[] = [];

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
        this._cdr.detectChanges();

        if (step === 1) {
            setTimeout(() => this.renderParetoChart(), 100);
        } else if (step === 2) {
            setTimeout(() => this.renderIshikawaChart(), 100);
        } else if (step === 3) {
            setTimeout(() => this.renderMindmapChart(), 100);
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
                backgroundColor: 'transparent'
            },
            title: {
                text: 'Diagrama de Pareto de No Conformidades / Incidentes'
            },
            xAxis: {
                categories: categories,
                crosshair: true
            },
            yAxis: [{
                title: {
                    text: 'Frecuencia (Cantidad)'
                }
            }, {
                title: {
                    text: 'Porcentaje Acumulado'
                },
                min: 0,
                max: 100,
                opposite: true,
                labels: {
                    format: '{value}%'
                }
            }],
            plotOptions: {
                column: {
                    color: '#6366f1'
                },
                series: {
                    cursor: 'pointer',
                    point: {
                        events: {
                            click: (event: any) => {
                                this.selectedCategory = event.point.category;
                                this._cdr.detectChanges();
                                this._snackBar.open(`🎯 Seleccionado: ${this.selectedCategory}`, 'OK', { duration: 3000 });
                            }
                        }
                    }
                }
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
                marker: {
                    enabled: true
                }
            }],
            credits: {
                enabled: false
            }
        } as any);
    }

    iniciarAnalisisIshikawa(): void {
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
                        console.error('Error parsing saved Ishikawa', e);
                    }
                } else {
                    // Seed default 6M structure for selected category
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
            error: (err) => {
                console.error(err);
                // Fallback to default
                this.ishikawaCausas = [
                    { categoria: 'Mano de Obra', causa: 'Falta de capacitación del personal' },
                    { categoria: 'Maquinaria', causa: 'Herramientas de software desactualizadas' },
                    { categoria: 'Métodos', causa: 'Proceso de entrega no estandarizado' },
                    { categoria: 'Materiales', causa: 'Insumos de baja calidad' },
                    { categoria: 'Medio Ambiente', causa: 'Espacio de trabajo ruidoso' },
                    { categoria: 'Medición', causa: 'Falta de indicadores clave (KPIs)' }
                ];
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

    renderIshikawaChart(): void {
        if (!this.ishikawaContainer) return;

        const data: any[] = [];
        
        // Add root node
        data.push([this.selectedCategory, 'Causas']);

        // Add 6M nodes
        const categories = ['Mano de Obra', 'Maquinaria', 'Métodos', 'Materiales', 'Medio Ambiente', 'Medición'];
        categories.forEach(cat => {
            data.push(['Causas', cat]);
        });

        // Add causes
        this.ishikawaCausas.forEach(item => {
            data.push([item.categoria, item.causa]);
        });

        Highcharts.chart(this.ishikawaContainer.nativeElement, {
            chart: {
                type: 'networkgraph',
                backgroundColor: 'transparent'
            },
            title: {
                text: 'Diagrama de Causa y Efecto (Ishikawa)'
            },
            subtitle: {
                text: `Problema: ${this.selectedCategory}`
            },
            plotOptions: {
                networkgraph: {
                    keys: ['from', 'to'],
                    layoutAlgorithm: {
                        enableSimulation: true,
                        friction: -0.9
                    }
                }
            },
            series: [{
                type: 'networkgraph',
                dataLabels: {
                    enabled: true,
                    linkFormat: '',
                    style: {
                        fontSize: '11px',
                        textOutline: 'none'
                    }
                },
                id: 'ishikawa-network',
                data: data,
                nodes: [
                    { id: this.selectedCategory, marker: { radius: 25 }, color: '#ef4444' },
                    { id: 'Causas', marker: { radius: 15 }, color: '#f59e0b' },
                    ...categories.map(c => ({ id: c, marker: { radius: 12 }, color: '#3b82f6' }))
                ]
            }],
            credits: {
                enabled: false
            }
        } as any);
    }

    guardarEIniciarMapaMental(): void {
        // Save tool structure to DB
        const payload = {
            tipoHerramienta: 'Ishikawa',
            titulo: `Ishikawa - ${this.selectedCategory}`,
            datosJson: JSON.stringify(this.ishikawaCausas)
        };

        this.loading = true;
        this._cdr.detectChanges();

        this._calidadService.guardarHerramienta(payload).subscribe({
            next: () => {
                this._snackBar.open('💾 Diagrama de Ishikawa guardado', 'OK', { duration: 3000 });
                
                // Now load saved Mind Map for this category
                this._calidadService.getHerramientasPorTipo('MapaMental').subscribe({
                    next: (herramientas) => {
                        const tituloBuscado = `Mapa Mental - ${this.selectedCategory}`;
                        const existente = herramientas.find(h => h.titulo === tituloBuscado);
                        if (existente && existente.datosJson) {
                            try {
                                this.mindMapNodes = JSON.parse(existente.datosJson);
                            } catch (e) {
                                console.error('Error parsing saved Mind Map', e);
                            }
                        } else {
                            // Seed initial Mind Map / SCAMPER nodes
                            this.mindMapNodes = [
                                { id: 'Sustituir', etiqueta: 'Sustituir proveedores de logística', parentId: this.selectedCategory },
                                { id: 'Combinar', etiqueta: 'Combinar entregas por zonas geográficas', parentId: this.selectedCategory },
                                { id: 'Adaptar', etiqueta: 'Adaptar software de rastreo GPS', parentId: this.selectedCategory }
                            ];
                        }
                        this.nuevoNodoParentId = this.selectedCategory;
                        this.loading = false;
                        this.setStep(3);
                    },
                    error: (err) => {
                        console.error(err);
                        this.loading = false;
                        this.setStep(3);
                    }
                });
            },
            error: (err) => {
                console.error(err);
                this._snackBar.open('❌ Error al guardar herramienta', 'Cerrar', { duration: 4000 });
            }
        });
    }

    agregarNodoMindMap(): void {
        if (!this.nuevoNodoTexto.trim()) return;

        const newId = 'Idea_' + Math.random().toString(36).substr(2, 9);
        this.mindMapNodes.push({
            id: newId,
            etiqueta: this.nuevoNodoTexto.trim(),
            parentId: this.nuevoNodoParentId
        });

        this.nuevoNodoTexto = '';
        this.renderMindmapChart();
    }

    renderMindmapChart(): void {
        if (!this.mindmapContainer) return;

        const data: any[] = [];
        
        this.mindMapNodes.forEach(nodo => {
            data.push([nodo.parentId, nodo.etiqueta]);
        });

        Highcharts.chart(this.mindmapContainer.nativeElement, {
            chart: {
                type: 'networkgraph',
                backgroundColor: 'transparent'
            },
            title: {
                text: 'Mapa Mental / Soluciones SCAMPER'
            },
            plotOptions: {
                networkgraph: {
                    keys: ['from', 'to'],
                    layoutAlgorithm: {
                        enableSimulation: true
                    }
                }
            },
            series: [{
                type: 'networkgraph',
                dataLabels: {
                    enabled: true,
                    linkFormat: '',
                    style: {
                        fontSize: '11px',
                        textOutline: 'none'
                    }
                },
                id: 'mindmap-network',
                data: data,
                nodes: [
                    { id: this.selectedCategory, marker: { radius: 25 }, color: '#8b5cf6' }
                ],
                point: {
                    events: {
                        click: (event: any) => {
                            const label = event.point.name || event.point.id;
                            if (label !== this.selectedCategory) {
                                this.formTarea.patchValue({
                                    titulo: `Acción Correctiva: ${label}`,
                                    comentarios: `Acción correctiva / Tarea de mejora para solventar la no conformidad: "${this.selectedCategory}" mediante la propuesta: "${label}".`
                                });
                                this._cdr.detectChanges();
                                this._snackBar.open(`💡 Idea seleccionada para Tarea: ${label}`, 'OK', { duration: 4000 });
                            }
                        }
                    }
                }
            }],
            credits: {
                enabled: false
            }
        } as any);
    }

    guardarEIniciarConversion(): void {
        const payload = {
            tipoHerramienta: 'MapaMental',
            titulo: `Mapa Mental - ${this.selectedCategory}`,
            datosJson: JSON.stringify(this.mindMapNodes)
        };

        this._calidadService.guardarHerramienta(payload).subscribe({
            next: () => {
                this._snackBar.open('💾 Plan de ideas guardado', 'OK', { duration: 3000 });
                this.setStep(4);
            },
            error: (err) => {
                console.error(err);
                this._snackBar.open('❌ Error al guardar Mapa Mental', 'Cerrar', { duration: 4000 });
            }
        });
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
}
