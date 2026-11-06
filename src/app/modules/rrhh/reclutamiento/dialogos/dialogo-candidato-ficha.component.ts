import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AVISO_RESPONSABILIDAD_IA, TEXTO_CONSENTIMIENTO_IA } from '../reclutamiento.constants';
import { ReclutamientoService } from '../reclutamiento.service';
import { Candidato } from '../reclutamiento.types';
import { DialogoDescarteComponent } from './dialogo-descarte.component';
import { DialogoEntrevistaComponent } from './dialogo-entrevista.component';
import { DialogoEvaluacionComponent } from './dialogo-evaluacion.component';

@Component({
    selector: 'app-dialogo-candidato-ficha',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatCheckboxModule,
        MatFormFieldModule,
        MatInputModule
    ],
    template: `
        <div class="flex flex-col max-w-4xl w-full max-h-[90vh] overflow-hidden" *ngIf="candidato">
            <!-- Header -->
            <div class="flex items-start justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                        {{ candidato.nombre.charAt(0) }}
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">{{ candidato.nombre }}</h2>
                            <span class="px-2 py-0.5 rounded-full text-xs font-semibold"
                                  [ngClass]="estatusClase(candidato.estatus)">
                                {{ candidato.estatus }}
                            </span>
                            <span *ngIf="candidato.avisoPrivacidadAceptado"
                                  class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 flex items-center gap-1">
                                <mat-icon class="icon-size-3" svgIcon="heroicons_mini:shield-check"></mat-icon>
                                Aviso Aceptado
                            </span>
                            <span *ngIf="!candidato.avisoPrivacidadAceptado"
                                  class="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 flex items-center gap-1">
                                <mat-icon class="icon-size-3" svgIcon="heroicons_mini:exclamation-triangle"></mat-icon>
                                Sin Aviso de Privacidad
                            </span>
                            <span *ngIf="candidato.puntajeIa !== null && candidato.puntajeIa !== undefined"
                                  class="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 flex items-center gap-1">
                                <mat-icon class="icon-size-3" svgIcon="heroicons_mini:sparkles"></mat-icon>
                                IA: {{ candidato.puntajeIa.toFixed(1) }} / 5.0
                            </span>
                        </div>
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                            Vacante: {{ candidato.requisicionFolio }} - {{ candidato.requisicionPuesto }} | Fuente: {{ candidato.fuente }}
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <button mat-stroked-button [matMenuTriggerFor]="menuEstatus">
                        <span>Cambiar Estado</span>
                        <mat-icon svgIcon="heroicons_mini:chevron-down"></mat-icon>
                    </button>
                    <mat-menu #menuEstatus="matMenu">
                        <button mat-menu-item (click)="cambiarEstado('Contactado')" *ngIf="candidato.estatus === 'Nuevo'">
                            Pasar a Contactado
                        </button>
                        <button mat-menu-item (click)="cambiarEstado('EnEntrevistas')"
                                [disabled]="!candidato.avisoPrivacidadAceptado"
                                *ngIf="candidato.estatus === 'Contactado' || candidato.estatus === 'Nuevo'">
                            Pasar a En Entrevistas
                        </button>
                        <button mat-menu-item (click)="cambiarEstado('Evaluado')"
                                [disabled]="!candidato.avisoPrivacidadAceptado"
                                *ngIf="candidato.estatus === 'EnEntrevistas'">
                            Pasar a Evaluado
                        </button>
                        <button mat-menu-item (click)="cambiarEstado('Seleccionado')"
                                [disabled]="!candidato.avisoPrivacidadAceptado"
                                *ngIf="candidato.estatus === 'Evaluado'">
                            Seleccionar para Contratación
                        </button>
                        <button mat-menu-item class="text-red-600" (click)="abrirDescarte()">
                            Descartar Candidato
                        </button>
                    </mat-menu>

                    <button mat-icon-button mat-dialog-close>
                        <mat-icon svgIcon="heroicons_outline:x-mark"></mat-icon>
                    </button>
                </div>
            </div>

            <!-- Content Area Scrollable -->
            <div class="overflow-y-auto py-4 flex flex-col gap-6 pr-1">
                <!-- Calificación General & Componentes -->
                <div class="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800/60 border border-blue-200 dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div class="flex items-center gap-4">
                        <div class="w-16 h-16 rounded-xl bg-primary text-white flex flex-col items-center justify-center shadow-md">
                            <span class="text-2xl font-black">
                                {{ candidato.calificacionGeneral !== null && candidato.calificacionGeneral !== undefined ? candidato.calificacionGeneral.toFixed(1) : '-' }}
                            </span>
                            <span class="text-[10px] tracking-wide font-medium uppercase opacity-80">de 5.0</span>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="font-bold text-gray-800 dark:text-gray-100 text-lg">Calificación Ponderada</span>
                                <span *ngIf="candidato.calificacionIncompleta"
                                      class="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-200 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
                                    Incompleta
                                </span>
                            </div>
                            <p class="text-xs text-gray-500 dark:text-gray-400">
                                Ponderación: Entrevistas (40%) + Psicométrica (30%) + Práctica (30%)
                            </p>
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-3 w-full md:w-auto">
                        <div class="bg-white dark:bg-gray-700/60 p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-center">
                            <span class="text-xs text-gray-500 dark:text-gray-400 block font-medium">Entrevistas (40%)</span>
                            <span class="text-base font-bold text-gray-800 dark:text-gray-100">
                                {{ candidato.promedioEntrevistas !== null && candidato.promedioEntrevistas !== undefined ? candidato.promedioEntrevistas.toFixed(1) : '-' }}
                            </span>
                        </div>
                        <div class="bg-white dark:bg-gray-700/60 p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-center">
                            <span class="text-xs text-gray-500 dark:text-gray-400 block font-medium">Psicométrica (30%)</span>
                            <span class="text-base font-bold text-gray-800 dark:text-gray-100">
                                {{ candidato.promedioPsicometrica !== null && candidato.promedioPsicometrica !== undefined ? candidato.promedioPsicometrica.toFixed(1) : '-' }}
                            </span>
                        </div>
                        <div class="bg-white dark:bg-gray-700/60 p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-center">
                            <span class="text-xs text-gray-500 dark:text-gray-400 block font-medium">Práctica (30%)</span>
                            <span class="text-base font-bold text-gray-800 dark:text-gray-100">
                                {{ candidato.promedioPractica !== null && candidato.promedioPractica !== undefined ? candidato.promedioPractica.toFixed(1) : '-' }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Datos de Contacto y Expectativa -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 text-sm">
                    <div>
                        <span class="text-xs text-gray-400 block font-medium">Email</span>
                        <span class="font-medium text-gray-700 dark:text-gray-200">{{ candidato.email || 'No registrado' }}</span>
                    </div>
                    <div>
                        <span class="text-xs text-gray-400 block font-medium">Teléfono</span>
                        <span class="font-medium text-gray-700 dark:text-gray-200">{{ candidato.telefono || 'No registrado' }}</span>
                    </div>
                    <div>
                        <span class="text-xs text-gray-400 block font-medium">Expectativa Salarial</span>
                        <span class="font-medium text-gray-700 dark:text-gray-200">
                            {{ candidato.expectativaSalarial ? (candidato.expectativaSalarial | currency:'MXN':'symbol-narrow':'1.2-2') : 'No especificada' }}
                        </span>
                    </div>
                    <div class="col-span-full" *ngIf="candidato.motivoDescarte">
                        <span class="text-xs text-red-500 block font-semibold">Motivo de Descarte</span>
                        <span class="text-red-700 dark:text-red-300 font-medium">{{ candidato.motivoDescarte }}</span>
                    </div>
                </div>

                <!-- Preselección con IA -->
                <div class="p-5 rounded-xl bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800/80 border border-indigo-200 dark:border-indigo-900/50 flex flex-col gap-4 shadow-sm">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 dark:border-gray-700 pb-3">
                        <div class="flex items-center gap-2">
                            <div class="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                                <mat-icon class="text-white" svgIcon="heroicons_outline:sparkles"></mat-icon>
                            </div>
                            <div>
                                <h3 class="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    Preselección con Inteligencia Artificial
                                    <span *ngIf="candidato.preseleccionIa"
                                          class="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                                        Analizado
                                    </span>
                                </h3>
                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                    Evaluación curricular automatizada contra el perfil requerido de la vacante.
                                </p>
                            </div>
                        </div>

                        <div class="flex items-center gap-2">
                            <button mat-flat-button color="primary"
                                    (click)="analizarConIa()"
                                    [disabled]="analizandoIa || !candidato.avisoPrivacidadAceptado">
                                <mat-icon [svgIcon]="analizandoIa ? 'heroicons_outline:arrow-path' : 'heroicons_outline:sparkles'"
                                          [class.animate-spin]="analizandoIa"></mat-icon>
                                <span class="ml-1.5">{{ analizandoIa ? 'Analizando con IA...' : (candidato.preseleccionIa ? 'Re-analizar con IA' : 'Analizar con IA') }}</span>
                            </button>
                        </div>
                    </div>

                    <!-- Alerta si falta aviso de privacidad -->
                    <div *ngIf="!candidato.avisoPrivacidadAceptado"
                         class="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                        <mat-icon class="icon-size-4 text-amber-600 shrink-0" svgIcon="heroicons_mini:exclamation-triangle"></mat-icon>
                        <span>El candidato debe tener firmado o aceptado el <strong>aviso de privacidad</strong> antes de poder realizar el análisis automatizado.</span>
                    </div>

                    <!-- Entrada de CV y Consentimiento -->
                    <div class="flex flex-col gap-3">
                        <mat-form-field appearance="outline" class="w-full">
                            <mat-label>Texto del Currículum Vitae (CV)</mat-label>
                            <textarea matInput [(ngModel)]="cvTextoEdicion" rows="4" maxlength="12000"
                                      placeholder="Pega aquí el contenido en texto del currículum vitae del candidato..."></textarea>
                            <mat-hint align="end">{{ cvTextoEdicion.length }} / 12,000 caracteres</mat-hint>
                        </mat-form-field>

                        <div class="p-3.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-800/40">
                            <mat-checkbox [(ngModel)]="consentimientoIaEdicion" color="primary">
                                <span class="text-xs font-medium text-gray-800 dark:text-gray-200 leading-tight">
                                    {{ textoConsentimientoIa }}
                                </span>
                            </mat-checkbox>
                        </div>

                        <div class="flex justify-end" *ngIf="hayCambiosCv()">
                            <button mat-stroked-button (click)="guardarCvYConsentimiento()" [disabled]="guardandoCv">
                                <mat-icon svgIcon="heroicons_outline:check"></mat-icon>
                                <span class="ml-1">{{ guardandoCv ? 'Guardando...' : 'Guardar CV y Consentimiento' }}</span>
                            </button>
                        </div>
                    </div>

                    <!-- Resultado del Análisis si existe -->
                    <div *ngIf="candidato.preseleccionIa"
                         class="mt-2 p-4 rounded-xl bg-white dark:bg-gray-800/90 border border-indigo-100 dark:border-gray-700 flex flex-col gap-4">
                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                            <div class="flex items-center gap-3">
                                <div class="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white flex items-center gap-1.5 shadow-sm">
                                    <mat-icon class="icon-size-4 text-white" svgIcon="heroicons_mini:sparkles"></mat-icon>
                                    <span class="text-xl font-black">{{ candidato.preseleccionIa.puntaje.toFixed(1) }}</span>
                                    <span class="text-xs opacity-80 uppercase tracking-wider font-semibold">/ 5.0</span>
                                </div>
                                <div>
                                    <span class="text-xs font-bold text-gray-700 dark:text-gray-200 block">Puntaje de Compatibilidad IA</span>
                                    <span class="text-[11px] text-gray-400">
                                        Analizado el {{ candidato.preseleccionIa.fechaAnalisis | date:'dd/MM/yyyy HH:mm' }} • Modelo: {{ candidato.preseleccionIa.modelo }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Justificación -->
                        <div class="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 p-3.5 rounded-lg border border-gray-200 dark:border-gray-600">
                            <span class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-1">Justificación del análisis</span>
                            <p class="whitespace-pre-line leading-relaxed">{{ candidato.preseleccionIa.justificacion }}</p>
                        </div>

                        <!-- Fortalezas y Brechas -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- Fortalezas -->
                            <div class="p-3.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
                                <div class="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-2">
                                    <mat-icon class="icon-size-4 text-emerald-600" svgIcon="heroicons_mini:check-circle"></mat-icon>
                                    <span>Fortalezas detectadas ({{ candidato.preseleccionIa.fortalezas.length }})</span>
                                </div>
                                <ul class="space-y-1.5 pl-1">
                                    <li *ngFor="let f of candidato.preseleccionIa.fortalezas"
                                        class="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2">
                                        <span class="text-emerald-500 font-bold mt-0.5">•</span>
                                        <span>{{ f }}</span>
                                    </li>
                                </ul>
                            </div>

                            <!-- Brechas -->
                            <div class="p-3.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
                                <div class="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-2">
                                    <mat-icon class="icon-size-4 text-amber-600" svgIcon="heroicons_mini:exclamation-circle"></mat-icon>
                                    <span>Brechas u Oportunidades ({{ candidato.preseleccionIa.brechas.length }})</span>
                                </div>
                                <ul class="space-y-1.5 pl-1">
                                    <li *ngFor="let b of candidato.preseleccionIa.brechas"
                                        class="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2">
                                        <span class="text-amber-500 font-bold mt-0.5">•</span>
                                        <span>{{ b }}</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <!-- Aviso de responsabilidad humana -->
                        <div class="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 flex items-center gap-2 text-xs text-blue-900 dark:text-blue-200">
                            <mat-icon class="icon-size-4 text-blue-600 shrink-0" svgIcon="heroicons_mini:information-circle"></mat-icon>
                            <span>{{ avisoResponsabilidadIa }}</span>
                        </div>
                    </div>
                </div>

                <!-- Sección de Entrevistas -->
                <div class="flex flex-col gap-3">
                    <div class="flex items-center justify-between">
                        <h3 class="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <mat-icon class="text-primary" svgIcon="heroicons_outline:chat-bubble-left-right"></mat-icon>
                            Entrevistas Realizadas ({{ candidato.entrevistas.length }})
                        </h3>
                        <button mat-stroked-button color="primary" size="small" (click)="abrirEntrevista()"
                                [disabled]="!candidato.avisoPrivacidadAceptado">
                            <mat-icon svgIcon="heroicons_outline:plus"></mat-icon>
                            <span>Nueva Entrevista</span>
                        </button>
                    </div>

                    <div *ngIf="candidato.entrevistas.length === 0" class="text-center py-6 text-sm text-gray-400 border border-dashed rounded-lg">
                        No se han registrado entrevistas para este candidato.
                    </div>

                    <div *ngFor="let ent of candidato.entrevistas"
                         class="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-col gap-2">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                    {{ ent.tipo }}
                                </span>
                                <span class="font-bold text-gray-800 dark:text-gray-100">{{ ent.entrevistadorNombre }}</span>
                                <span class="text-xs text-gray-400">{{ ent.fecha | date:'dd/MM/yyyy' }}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="px-2 py-0.5 rounded text-xs font-medium"
                                      [ngClass]="ent.resultado === 'Favorable' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                                    {{ ent.resultado }}
                                </span>
                                <span class="font-bold text-primary text-sm">Promedio: {{ ent.promedioEntrevista.toFixed(1) }}</span>
                            </div>
                        </div>

                        <div class="grid grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-300 pt-1">
                            <div>Comunicación: <strong>{{ ent.calificacionComunicacion }} / 5</strong></div>
                            <div>Experiencia: <strong>{{ ent.calificacionExperiencia }} / 5</strong></div>
                            <div>Técnica: <strong>{{ ent.calificacionCompetenciasTecnicas }} / 5</strong></div>
                        </div>

                        <div *ngIf="ent.notasStar" class="mt-2 p-2.5 rounded bg-gray-50 dark:bg-gray-900/40 text-xs text-gray-700 dark:text-gray-300 whitespace-pre-line border-l-2 border-primary">
                            <strong>Notas STAR:</strong>&#10;{{ ent.notasStar }}
                        </div>
                    </div>
                </div>

                <!-- Sección de Evaluaciones -->
                <div class="flex flex-col gap-3">
                    <div class="flex items-center justify-between">
                        <h3 class="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <mat-icon class="text-primary" svgIcon="heroicons_outline:clipboard-document-check"></mat-icon>
                            Evaluaciones Psicométricas y Prácticas ({{ candidato.evaluaciones.length }})
                        </h3>
                        <div class="flex gap-2">
                            <button mat-stroked-button color="primary" size="small" (click)="abrirEvaluacion('Psicometrica')"
                                    [disabled]="!candidato.avisoPrivacidadAceptado">
                                <mat-icon svgIcon="heroicons_outline:plus"></mat-icon>
                                <span>Psicométrica</span>
                            </button>
                            <button mat-stroked-button color="primary" size="small" (click)="abrirEvaluacion('Practica')"
                                    [disabled]="!candidato.avisoPrivacidadAceptado">
                                <mat-icon svgIcon="heroicons_outline:plus"></mat-icon>
                                <span>Práctica</span>
                            </button>
                        </div>
                    </div>

                    <div *ngIf="candidato.evaluaciones.length === 0" class="text-center py-6 text-sm text-gray-400 border border-dashed rounded-lg">
                        No se han registrado evaluaciones técnicas ni psicométricas.
                    </div>

                    <div *ngFor="let ev of candidato.evaluaciones"
                         class="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-col gap-2">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                    {{ ev.tipo }}
                                </span>
                                <span class="font-bold text-gray-800 dark:text-gray-100">{{ ev.evaluadorNombre || 'Evaluador sin registrar' }}</span>
                                <span class="text-xs text-gray-400">{{ ev.fecha | date:'dd/MM/yyyy' }}</span>
                            </div>
                            <span class="font-bold text-purple-700 dark:text-purple-300 text-sm">
                                Calificación: {{ ev.calificacion.toFixed(1) }} / 5.0
                            </span>
                        </div>
                        <p *ngIf="ev.observaciones" class="text-xs text-gray-600 dark:text-gray-300">
                            {{ ev.observaciones }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <button mat-button type="button" mat-dialog-close>Cerrar Ficha</button>
            </div>
        </div>
    `
})
export class DialogoCandidatoFichaComponent implements OnInit {
    private readonly _dialog = inject(MatDialog);
    private readonly _service = inject(ReclutamientoService);

    readonly textoConsentimientoIa = TEXTO_CONSENTIMIENTO_IA;
    readonly avisoResponsabilidadIa = AVISO_RESPONSABILIDAD_IA;

    candidato: Candidato | null = null;
    cvTextoEdicion = '';
    consentimientoIaEdicion = false;
    guardandoCv = false;
    analizandoIa = false;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: { candidatoId: number },
        private readonly _dialogRef: MatDialogRef<DialogoCandidatoFichaComponent>
    ) {}

    ngOnInit(): void {
        this.recargar();
    }

    recargar(): void {
        this._service.obtenerCandidato(this.data.candidatoId).subscribe({
            next: (c) => {
                this.candidato = c;
                this.cvTextoEdicion = c.cvTexto || '';
                this.consentimientoIaEdicion = !!c.consentimientoIa;
            }
        });
    }

    hayCambiosCv(): boolean {
        if (!this.candidato) return false;
        return (this.cvTextoEdicion !== (this.candidato.cvTexto || '')) ||
               (this.consentimientoIaEdicion !== (!!this.candidato.consentimientoIa));
    }

    guardarCvYConsentimiento(): void {
        if (!this.candidato) return;
        this.guardandoCv = true;
        this._service.actualizarCandidato(this.candidato.candidatoId, {
            nombre: this.candidato.nombre,
            email: this.candidato.email,
            telefono: this.candidato.telefono,
            fuente: this.candidato.fuente,
            avisoPrivacidadAceptado: this.candidato.avisoPrivacidadAceptado,
            fechaAvisoPrivacidad: this.candidato.fechaAvisoPrivacidad,
            expectativaSalarial: this.candidato.expectativaSalarial,
            notas: this.candidato.notas,
            cvTexto: this.cvTextoEdicion,
            consentimientoIa: this.consentimientoIaEdicion
        }).subscribe({
            next: (c) => {
                this.guardandoCv = false;
                this.candidato = c;
            },
            error: (err) => {
                this.guardandoCv = false;
                alert(err?.error?.mensaje || 'Error al guardar el CV y consentimiento');
            }
        });
    }

    analizarConIa(): void {
        if (!this.candidato) return;
        if (!this.candidato.avisoPrivacidadAceptado) {
            alert('El candidato debe aceptar el aviso de privacidad antes del análisis.');
            return;
        }
        if (!this.consentimientoIaEdicion) {
            alert('Se requiere consentimiento para análisis automatizado.');
            return;
        }
        if (!this.cvTextoEdicion || !this.cvTextoEdicion.trim()) {
            alert('El currículum vitae no puede estar vacío para realizar el análisis.');
            return;
        }

        this.analizandoIa = true;

        const guardarPrevio$ = this.hayCambiosCv()
            ? this._service.actualizarCandidato(this.candidato.candidatoId, {
                nombre: this.candidato.nombre,
                email: this.candidato.email,
                telefono: this.candidato.telefono,
                fuente: this.candidato.fuente,
                avisoPrivacidadAceptado: this.candidato.avisoPrivacidadAceptado,
                fechaAvisoPrivacidad: this.candidato.fechaAvisoPrivacidad,
                expectativaSalarial: this.candidato.expectativaSalarial,
                notas: this.candidato.notas,
                cvTexto: this.cvTextoEdicion,
                consentimientoIa: this.consentimientoIaEdicion
            })
            : of(this.candidato);

        guardarPrevio$.pipe(
            switchMap(() => this._service.analizarCandidatoIa(this.candidato!.candidatoId))
        ).subscribe({
            next: (preseleccion) => {
                this.analizandoIa = false;
                if (this.candidato) {
                    this.candidato.preseleccionIa = preseleccion;
                    this.candidato.puntajeIa = preseleccion.puntaje;
                }
                this.recargar();
            },
            error: (err) => {
                this.analizandoIa = false;
                alert(err?.error?.mensaje || 'Error al ejecutar el análisis de preselección con IA');
            }
        });
    }

    estatusClase(estatus: string): string {
        switch (estatus) {
            case 'Nuevo': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'Contactado': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300';
            case 'EnEntrevistas': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
            case 'Evaluado': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
            case 'Seleccionado': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'Descartado': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    cambiarEstado(nuevoEstatus: string): void {
        if (!this.candidato) return;
        this._service.cambiarEstatusCandidato(this.candidato.candidatoId, nuevoEstatus).subscribe({
            next: () => this.recargar(),
            error: (err) => alert(err?.error?.mensaje || 'Error al cambiar el estatus')
        });
    }

    abrirDescarte(): void {
        if (!this.candidato) return;
        const ref = this._dialog.open(DialogoDescarteComponent, {
            data: { candidatoId: this.candidato.candidatoId, nombre: this.candidato.nombre }
        });
        ref.afterClosed().subscribe((res) => {
            if (res) this.recargar();
        });
    }

    abrirEntrevista(): void {
        if (!this.candidato) return;
        const ref = this._dialog.open(DialogoEntrevistaComponent, {
            data: { candidatoId: this.candidato.candidatoId, candidatoNombre: this.candidato.nombre }
        });
        ref.afterClosed().subscribe((res) => {
            if (res) this.recargar();
        });
    }

    abrirEvaluacion(tipo: 'Psicometrica' | 'Practica'): void {
        if (!this.candidato) return;
        const ref = this._dialog.open(DialogoEvaluacionComponent, {
            data: { candidatoId: this.candidato.candidatoId, candidatoNombre: this.candidato.nombre, tipoInicial: tipo }
        });
        ref.afterClosed().subscribe((res) => {
            if (res) this.recargar();
        });
    }
}

