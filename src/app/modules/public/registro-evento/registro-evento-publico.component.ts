import { Component, OnInit, OnDestroy, ViewEncapsulation, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';
import { FormularioRegistroService, FormularioRegistroPublicoDto, CampoConfig, DisenoConfig, PasoFormularioConfig } from '../../admin/eventos/configurador-registro/formulario-registro.service';

@Component({
    selector: 'app-registro-evento-publico',
    standalone: true,
    imports: [CommonModule, FormsModule, MatIconModule],
    encapsulation: ViewEncapsulation.None,
    template: `
<div class="public-registration-root" [ngClass]="{'dark-theme': diseno?.temaOscuro}">
    
    <!-- PANTALLA DE CARGA -->
    <div *ngIf="loading" class="state-card-wrapper">
        <div class="state-box animate-fade-in">
            <div class="spinner-ring"></div>
            <h3 class="text-base font-bold text-slate-800 dark:text-white mt-4">Cargando cuestionario...</h3>
            <p class="text-xs text-slate-400 mt-1">Obteniendo información del evento</p>
        </div>
    </div>

    <!-- ERROR / ENLACE INVÁLIDO -->
    <div *ngIf="!loading && (!formPublico || !formPublico.activo)" class="state-card-wrapper">
        <div class="state-box animate-fade-in border border-rose-100 dark:border-rose-900/40">
            <div class="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center mx-auto mb-3">
                <mat-icon class="text-3xl">error_outline</mat-icon>
            </div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">Formulario No Disponible</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Este enlace de registro no existe o ha concluido el periodo de inscripciones. Por favor contacta al comité organizador.
            </p>
        </div>
    </div>

    <!-- PANTALLA DE ÉXITO TRAS COMPLETAR REGISTRO -->
    <div *ngIf="enviadoConExito" class="state-card-wrapper">
        <div class="state-box animate-fade-in border border-emerald-100 dark:border-emerald-900/40 max-w-md">
            <!-- Checkmark animado -->
            <div class="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                <mat-icon class="text-3xl">check_circle</mat-icon>
            </div>
            
            <h2 class="text-xl font-black text-slate-900 dark:text-white">
                {{ diseno?.tipoFormulario === 'Satisfaccion' ? '¡Gracias por tus Respuestas!' : '¡Registro Confirmado!' }}
            </h2>
            <p class="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                {{ resultadoRegistro?.nombreCompleto || 'Estimado(a) Participante' }}
            </p>
            <p class="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                {{ diseno?.mensajeExito || (diseno?.tipoFormulario === 'Satisfaccion' ? 'Tu encuesta ha sido recibida exitosamente. Tu opinión nos ayuda a mejorar.' : 'Tu registro ha sido completado exitosamente.') }}
            </p>

            <!-- Notificaciones enviadas: Email y WhatsApp (Solo para registros de acceso con pase) -->
            <div *ngIf="diseno?.tipoFormulario !== 'Satisfaccion'" class="mt-3 flex flex-wrap justify-center gap-2 text-xs">
                <span *ngIf="resultadoRegistro?.emailEnviado" 
                      class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
                    <mat-icon class="text-[14px]">email</mat-icon>
                    Pase enviado por correo
                </span>
                <span *ngIf="resultadoRegistro?.whatsappEnviado" 
                      class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                    <mat-icon class="text-[14px]">chat</mat-icon>
                    Pase enviado a tu WhatsApp
                </span>
            </div>

            <!-- Pase QR Digital si está activado -->
            <div *ngIf="diseno?.mostrarQrExito && qrCodeUrl" class="mt-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center">
                <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">Tu Pase Digital de Acceso</span>
                <div class="bg-white p-3 rounded-xl shadow-md inline-block mb-3 border border-slate-100">
                    <img [src]="qrCodeUrl" alt="Pase QR" class="w-40 h-40 object-contain mx-auto">
                </div>
                <div class="text-[11px] text-slate-400 font-mono select-all truncate">ID: {{ resultadoRegistro?.tokenQR }}</div>
                
                <div class="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
                    <a [href]="qrCodeUrl" target="_blank" download="mi-pase-acceso.png"
                       class="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center justify-center gap-1.5"
                       [ngStyle]="{'background-color': diseno?.colorPrimario || '#1e8449'}">
                        <mat-icon class="text-sm">download</mat-icon> Descargar Pase QR
                    </a>
                </div>
            </div>

            <p class="text-[11px] text-slate-400 mt-5">Gracias por ser parte de nuestros eventos. — JR Ingeniería</p>
        </div>
    </div>

    <!-- CONTENEDOR PRINCIPAL DEL FORMULARIO PÚBLICO -->
    <!-- Centrado, con tope hasta abajo de la pantalla sin sobrepasarse, con scroll interno si hay muchos campos -->
    <main *ngIf="!loading && formPublico && formPublico.activo && !enviadoConExito" class="form-viewport-container">
        
        <div class="public-card animate-fade-in"
             [ngClass]="[
                 diseno?.radioBorde || 'rounded-2xl',
                 diseno?.temaOscuro ? 'card-dark' : 'card-light',
                 diseno?.estiloCard === 'glassmorphism' ? 'card-glass' : '',
                 diseno?.estiloCard === 'bordered' ? 'card-bordered' : ''
             ]"
             [ngStyle]="{'border-color': diseno?.estiloCard === 'bordered' ? diseno?.colorPrimario : undefined}">

            <!-- 1. HEADER: IMAGEN DE PORTADA / BANNER -->
            <header class="public-card-header"
                    [ngClass]="{
                        'h-compact': diseno?.alturaPortada === 'compact',
                        'h-medium': diseno?.alturaPortada === 'medium',
                        'h-tall': diseno?.alturaPortada === 'tall'
                    }">
                <img *ngIf="formPublico.imagenPortadaUrl" [src]="formPublico.imagenPortadaUrl" alt="Portada del evento" class="header-cover-img">
                <div *ngIf="!formPublico.imagenPortadaUrl" class="header-cover-placeholder"></div>

                <!-- Overlay con gradiente para lectura óptima -->
                <div class="header-overlay">
                    <div class="header-badge-row">
                        <span class="event-badge" [ngStyle]="{'background-color': diseno?.colorPrimario || '#1e8449'}">
                            {{ formPublico.nombreEvento || 'Evento Especial' }}
                        </span>
                    </div>
                    <h1 class="header-title">{{ formPublico.titulo }}</h1>
                </div>
            </header>

            <!-- 2. BODY DEL CUESTIONARIO CON SCROLL INTERNO LIMPIO -->
            <div class="public-card-body">
                
                <!-- STEPPER / INDICADOR DE PROGRESO (WIZARD MULTI-PASO) -->
                <div *ngIf="diseno?.modoPasos" class="wizard-stepper-container animate-fade-in">
                    <div class="stepper-header-row">
                        <span class="stepper-step-badge" [ngStyle]="{'background-color': (diseno?.colorPrimario || '#1e8449') + '20', 'color': diseno?.colorPrimario || '#1e8449'}">
                            Paso {{ indicePasoActualVisible + 1 }} de {{ totalPasosVisibles }}
                        </span>
                        <span class="stepper-step-title">
                            {{ pasoActualConfig?.titulo || ('Paso ' + (indicePasoActualVisible + 1)) }}
                        </span>
                    </div>

                    <!-- Barra de progreso continua -->
                    <div class="stepper-progress-track">
                        <div class="stepper-progress-fill"
                             [ngStyle]="{
                                 'width': totalPasosVisibles > 0 ? (((indicePasoActualVisible + 1) / totalPasosVisibles) * 100) + '%' : '100%',
                                 'background-color': diseno?.colorPrimario || '#1e8449'
                             }"></div>
                    </div>

                    <!-- Subtítulo o descripción del paso -->
                    <p *ngIf="pasoActualConfig?.descripcion" class="stepper-step-desc">
                        {{ pasoActualConfig?.descripcion }}
                    </p>
                </div>

                <!-- Descripción general (Solo en paso 1 o formulario sin pasos) -->
                <div *ngIf="formPublico.descripcion && (!diseno?.modoPasos || indicePasoActualVisible === 0)" class="intro-description">
                    <p>{{ formPublico.descripcion }}</p>
                </div>

                <!-- Mensaje de error general -->
                <div *ngIf="errorMessage" class="error-banner animate-fade-in">
                    <mat-icon class="text-sm">warning</mat-icon>
                    <span>{{ errorMessage }}</span>
                </div>

                <!-- CAMPOS DINÁMICOS -->
                <form (ngSubmit)="enviarRegistro()" class="fields-grid" #regForm="ngForm">
                    <ng-container *ngFor="let campo of campos">
                    <div *ngIf="esCampoVisible(campo) && esCampoDePasoActual(campo)"
                         class="field-col"
                         [ngClass]="{'col-full': campo.ancho === 'full' || campo.tipo === 'matrix' || campo.tipo === 'section', 'col-half': campo.ancho === 'half'}">

                        <!-- COMPONENTE: BLOQUE / SEPARADOR DE SECCIÓN -->
                        <div *ngIf="campo.tipo === 'section'" class="section-block-container animate-fade-in">
                            <div class="section-accent-bar" [ngStyle]="{'background-color': diseno?.colorPrimario || '#1e8449'}"></div>
                            <div class="section-header-content">
                                <h2 class="section-title-text">{{ campo.etiqueta }}</h2>
                                <p *ngIf="campo.placeholder" class="section-desc-text">{{ campo.placeholder }}</p>
                            </div>
                        </div>

                        <!-- Etiqueta del campo (si no es bloque de sección) -->
                        <label *ngIf="campo.tipo !== 'section'" class="field-label" [for]="campo.id">
                            {{ campo.etiqueta }}
                            <span *ngIf="campo.requerido" class="required-star">*</span>
                        </label>

                        <!-- COMPONENTE: MATRIZ / TABLA DE EVALUACIÓN LIKERT (1 AL 5) -->
                        <div *ngIf="campo.tipo === 'matrix'" class="matrix-card-wrapper" [class.matrix-has-error]="erroresCampos[campo.id]">
                            <p *ngIf="campo.placeholder" class="matrix-instruction-text">{{ campo.placeholder }}</p>

                            <div class="matrix-table-scroll">
                                <table class="matrix-evaluation-table">
                                    <thead>
                                        <tr>
                                            <th class="matrix-th-aspect">Aspecto</th>
                                            <th *ngFor="let col of campo.columnasMatriz" class="matrix-th-score">
                                                {{ col.etiqueta }}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr *ngFor="let fila of campo.filasMatriz">
                                            <td class="matrix-td-aspect">
                                                <span class="aspect-main-text">{{ fila.texto }}</span>
                                                <span *ngIf="fila.subtexto" class="aspect-sub-text">{{ fila.subtexto }}</span>
                                            </td>
                                            <td *ngFor="let col of campo.columnasMatriz" class="matrix-td-score">
                                                <div class="matrix-score-option cursor-pointer select-none"
                                                     role="radio"
                                                     [attr.aria-checked]="respuestas[campo.id]?.[fila.id] === col.valor"
                                                     [class.score-checked]="respuestas[campo.id]?.[fila.id] === col.valor"
                                                     (click)="seleccionarMatriz(campo.id, fila.id, col.valor)">
                                                    <span class="matrix-radio-disc"
                                                          [ngStyle]="{'background-color': respuestas[campo.id]?.[fila.id] === col.valor ? (diseno?.colorPrimario || '#1e8449') : undefined}">
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <!-- Leyenda de Escala al pie de la tabla -->
                            <div class="matrix-footer-legend" *ngIf="campo.escalaNotaInferior || campo.escalaNotaSuperior">
                                <span *ngIf="campo.escalaNotaInferior"><strong>Escala:</strong> {{ campo.escalaNotaInferior }}</span>
                                <span *ngIf="campo.escalaNotaSuperior">{{ campo.escalaNotaSuperior }}</span>
                            </div>
                        </div>

                        <!-- Input texto / email / tel / number -->
                        <div *ngIf="campo.tipo === 'input' || campo.tipo === 'email' || campo.tipo === 'tel' || campo.tipo === 'number'" class="input-wrap">
                            <input [type]="campo.tipo === 'number' ? 'number' : (campo.tipo === 'email' ? 'email' : (campo.tipo === 'tel' ? 'tel' : 'text'))"
                                   [id]="campo.id"
                                   [(ngModel)]="respuestas[campo.id]"
                                   [name]="campo.id"
                                   [placeholder]="campo.placeholder || ''"
                                   [required]="campo.requerido"
                                   class="custom-input"
                                   [class.input-error]="erroresCampos[campo.id]"
                                   (focus)="limpiarError(campo.id)">
                        </div>

                        <!-- Textarea -->
                        <div *ngIf="campo.tipo === 'textarea'" class="input-wrap">
                            <textarea [id]="campo.id"
                                      [(ngModel)]="respuestas[campo.id]"
                                      [name]="campo.id"
                                      rows="3"
                                      [placeholder]="campo.placeholder || ''"
                                      [required]="campo.requerido"
                                      class="custom-textarea"
                                      [class.input-error]="erroresCampos[campo.id]"
                                      (focus)="limpiarError(campo.id)"></textarea>
                        </div>

                        <!-- Select -->
                        <div *ngIf="campo.tipo === 'select'" class="input-wrap">
                            <select [id]="campo.id"
                                    [(ngModel)]="respuestas[campo.id]"
                                    [name]="campo.id"
                                    [required]="campo.requerido"
                                    class="custom-select"
                                    [class.input-error]="erroresCampos[campo.id]"
                                    (change)="limpiarError(campo.id)">
                                <option value="" disabled selected>{{ campo.placeholder || 'Selecciona una opción...' }}</option>
                                <option *ngFor="let opt of campo.opciones" [value]="opt">{{ opt }}</option>
                            </select>
                        </div>

                        <!-- Radio Buttons -->
                        <div *ngIf="campo.tipo === 'radio'" class="options-group">
                            <div *ngFor="let opt of campo.opciones"
                                 class="radio-pill cursor-pointer select-none"
                                 role="radio"
                                 [attr.aria-checked]="respuestas[campo.id] === opt"
                                 [class.radio-selected]="respuestas[campo.id] === opt"
                                 (click)="seleccionarRadio(campo.id, opt)">
                                <span class="radio-indicator" [class.indicator-checked]="respuestas[campo.id] === opt"
                                      [ngStyle]="{'background-color': respuestas[campo.id] === opt ? (diseno?.colorPrimario || '#1e8449') : undefined}"></span>
                                <span class="option-text flex-1">{{ opt }}</span>
                            </div>
                        </div>

                        <!-- Checkboxes (Multiple / Barras Horizontales) -->
                        <div *ngIf="campo.tipo === 'checkbox'" class="options-group">
                            <div *ngFor="let opt of campo.opciones"
                                 class="checkbox-pill cursor-pointer select-none"
                                 role="checkbox"
                                 [attr.aria-checked]="isCheckboxChecked(campo.id, opt)"
                                 [class.checkbox-selected]="isCheckboxChecked(campo.id, opt)"
                                 (click)="toggleCheckbox(campo.id, opt)">
                                <span class="checkbox-indicator" [class.checkbox-checked]="isCheckboxChecked(campo.id, opt)"
                                      [ngStyle]="{'background-color': isCheckboxChecked(campo.id, opt) ? (diseno?.colorPrimario || '#1e8449') : undefined}">
                                    <mat-icon *ngIf="isCheckboxChecked(campo.id, opt)" class="check-icon">check</mat-icon>
                                </span>
                                <span class="option-text flex-1">{{ opt }}</span>
                            </div>
                        </div>

                        <!-- Error individual de campo requerido -->
                        <span *ngIf="erroresCampos[campo.id]" class="field-error-msg">
                            Este campo es obligatorio.
                        </span>

                        <!-- File / Imagen -->
                        <div *ngIf="campo.tipo === 'file'" class="input-wrap">
                            <label class="file-upload-box" [class.input-error]="erroresCampos[campo.id]">
                                <input type="file" [id]="campo.id" [name]="campo.id" accept="image/*,.pdf" class="sr-only" (change)="onFileSelected($event, campo.id)">
                                <div *ngIf="!respuestas[campo.id]" class="file-placeholder">
                                    <mat-icon class="file-icon">cloud_upload</mat-icon>
                                    <span class="file-text">Selecciona o arrastra tu archivo</span>
                                </div>
                                <div *ngIf="respuestas[campo.id]" class="file-preview-wrap">
                                    <img *ngIf="respuestas[campo.id].startsWith('data:image')" [src]="respuestas[campo.id]" class="file-preview-img">
                                    <span class="file-success-text">Archivo listo para subir</span>
                                </div>
                            </label>
                        </div>
                    </div>
                    </ng-container>

                    <!-- ACCIONES DE NAVEGACIÓN Y ENVÍO -->
                    <div class="submit-action-row">
                        <!-- Navegación si está en Modo Pasos y no es el último paso visible -->
                        <div *ngIf="diseno?.modoPasos && !esUltimoPaso" class="wizard-nav-actions">
                            <button *ngIf="indicePasoActualVisible > 0"
                                    type="button"
                                    (click)="retrocederPaso()"
                                    class="btn-nav-prev">
                                <mat-icon class="btn-arrow">arrow_back</mat-icon>
                                <span>Anterior</span>
                            </button>
                            <button type="button"
                                    (click)="avanzarPaso()"
                                    class="btn-primary-submit"
                                    [ngStyle]="{'background-color': diseno?.colorPrimario || '#1e8449'}">
                                <span>Siguiente Paso</span>
                                <mat-icon class="btn-arrow">arrow_forward</mat-icon>
                            </button>
                        </div>

                        <!-- Último paso visible o modo normal -->
                        <div *ngIf="!diseno?.modoPasos || esUltimoPaso" class="wizard-nav-actions">
                            <button *ngIf="diseno?.modoPasos && indicePasoActualVisible > 0"
                                    type="button"
                                    (click)="retrocederPaso()"
                                    class="btn-nav-prev">
                                <mat-icon class="btn-arrow">arrow_back</mat-icon>
                                <span>Anterior</span>
                            </button>
                            <button type="submit"
                                    [disabled]="enviando"
                                    class="btn-primary-submit flex-1"
                                    [ngStyle]="{'background-color': diseno?.colorPrimario || '#1e8449'}">
                                <span *ngIf="enviando" class="submit-spinner"></span>
                                <span>{{ enviando ? 'Enviando...' : (diseno?.botonTexto || (diseno?.tipoFormulario === 'Satisfaccion' ? 'Enviar Encuesta' : 'Completar Registro')) }}</span>
                                <mat-icon *ngIf="!enviando" class="btn-arrow">send</mat-icon>
                            </button>
                        </div>

                        <p class="terms-note">JR Ingeniería garantiza el tratamiento confidencial y seguro de tus datos.</p>
                    </div>
                </form>

            </div>

        </div>

    </main>
</div>
    `,
    styles: [`
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');

:host {
    display: block;
    width: 100%;
    min-height: 100vh;
    margin: 0;
    padding: 0;
    font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
    -webkit-font-smoothing: antialiased;
    box-sizing: border-box;
}

/* === ESTILOS DEL WIZARD / STEPPER === */
.wizard-stepper-container {
    padding: 0.85rem 1rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 1rem;
    margin-bottom: 1rem;

    .card-dark & {
        background: #1e293b;
        border-color: #334155;
    }
}

.stepper-header-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.stepper-step-badge {
    padding: 0.2rem 0.6rem;
    border-radius: 9999px;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.02em;
    text-transform: uppercase;
}

.stepper-step-title {
    font-size: 0.85rem;
    font-weight: 700;
    color: #1e293b;

    .card-dark & {
        color: #f8fafc;
    }
}

.stepper-progress-track {
    width: 100%;
    height: 6px;
    background: #e2e8f0;
    border-radius: 9999px;
    overflow: hidden;

    .card-dark & {
        background: #334155;
    }
}

.stepper-progress-fill {
    height: 100%;
    transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 9999px;
}

.stepper-step-desc {
    font-size: 0.7rem;
    color: #64748b;
    margin-top: 0.4rem;
    margin-bottom: 0;
}

/* === ESTILOS DEL BLOQUE / SEPARADOR DE SECCIÓN === */
.section-block-container {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem 0 0.5rem 0;
    margin-top: 0.5rem;
    border-top: 2px dashed #e2e8f0;

    .card-dark & {
        border-top-color: #334155;
    }
}

.section-accent-bar {
    width: 4px;
    height: 36px;
    border-radius: 9999px;
    flex-shrink: 0;
}

.section-header-content {
    flex: 1;
}

.section-title-text {
    font-size: 0.95rem;
    font-weight: 900;
    letter-spacing: -0.01em;
    color: #0f172a;
    margin: 0;
    text-transform: uppercase;

    .card-dark & {
        color: #f8fafc;
    }
}

.section-desc-text {
    font-size: 0.75rem;
    color: #64748b;
    margin: 0.15rem 0 0 0;
    line-height: 1.4;

    .card-dark & {
        color: #94a3b8;
    }
}

/* === ESTILOS DE LA TABLA / MATRIZ LIKERT (1 AL 5) === */
.matrix-card-wrapper {
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 1.25rem;
    padding: 1rem;
    margin-top: 0.35rem;

    .card-dark & {
        background: #1e293b;
        border-color: #334155;
    }

    &.matrix-has-error {
        border-color: #ef4444;
    }
}

.matrix-instruction-text {
    font-size: 0.75rem;
    color: #64748b;
    margin-bottom: 0.75rem;
    font-style: italic;

    .card-dark & {
        color: #94a3b8;
    }
}

.matrix-table-scroll {
    overflow-x: auto;
    border-radius: 0.85rem;
    border: 1px solid #e2e8f0;
    background: #ffffff;

    .card-dark & {
        border-color: #334155;
        background: #0f172a;
    }
}

.matrix-evaluation-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.75rem;
}

.matrix-th-aspect {
    text-align: left;
    padding: 0.75rem 1rem;
    background: #f1f5f9;
    color: #475569;
    font-weight: 800;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    min-width: 180px;

    .card-dark & {
        background: #1e293b;
        color: #94a3b8;
    }
}

.matrix-th-score {
    text-align: center;
    padding: 0.75rem 0.5rem;
    background: #f1f5f9;
    color: #1e293b;
    font-weight: 800;
    font-size: 0.75rem;
    min-width: 44px;

    .card-dark & {
        background: #1e293b;
        color: #f8fafc;
    }
}

.matrix-td-aspect {
    padding: 0.75rem 1rem;
    border-top: 1px solid #f1f5f9;
    vertical-align: middle;

    .card-dark & {
        border-top-color: #334155;
    }
}

.aspect-main-text {
    display: block;
    font-weight: 600;
    color: #1e293b;
    line-height: 1.35;

    .card-dark & {
        color: #f8fafc;
    }
}

.aspect-sub-text {
    display: block;
    font-size: 0.65rem;
    color: #64748b;
    margin-top: 0.2rem;
}

.matrix-td-score {
    text-align: center;
    padding: 0.5rem;
    border-top: 1px solid #f1f5f9;
    vertical-align: middle;

    .card-dark & {
        border-top-color: #334155;
    }
}

.matrix-score-option {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background-color: #f1f5f9;

        .card-dark & {
            background-color: #334155;
        }
    }
}

.matrix-radio-disc {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid #cbd5e1;
    display: inline-block;
    transition: all 0.2s ease;

    .score-checked & {
        border-color: transparent !important;
        transform: scale(1.15);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    }
}

.matrix-footer-legend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding-top: 0.5rem;
    font-size: 0.7rem;
    color: #64748b;

    .card-dark & {
        color: #94a3b8;
    }
}

/* === ACCIONES DE NAVEGACIÓN WIZARD === */
.wizard-nav-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
}

.btn-nav-prev {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.85rem 1.25rem;
    border-radius: 0.85rem;
    border: 1.5px solid #cbd5e1;
    background: transparent;
    color: #475569;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: #f1f5f9;
        border-color: #94a3b8;
    }

    .card-dark & {
        border-color: #475569;
        color: #cbd5e1;

        &:hover {
            background: #334155;
        }
    }
}

.public-registration-root {
    width: 100%;
    min-height: 100vh;
    background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 50%, #e2e8f0 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 2.5rem 1rem 4rem 1rem;
    box-sizing: border-box;

    &.dark-theme {
        background: linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e293b 100%);
    }

    @media (max-width: 640px) {
        padding: 1.25rem 0.75rem 3rem 0.75rem;
    }
}

/* === ESTADOS DE CARGA Y MENSAJES === */
.state-card-wrapper {
    width: 100%;
    min-height: calc(100vh - 5rem);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    margin: auto 0;
}

.state-box {
    background: #ffffff;
    border-radius: 1.5rem;
    padding: 2.5rem 2rem;
    max-width: 440px;
    width: 100%;
    text-align: center;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

    .dark-theme & {
        background: #1e293b;
        color: #f8fafc;
    }
}

.spinner-ring {
    width: 44px;
    height: 44px;
    border: 3.5px solid #e2e8f0;
    border-top-color: #1e8449;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* === CONTENEDOR VIEWPORT CARD === */
.form-viewport-container {
    width: 100%;
    max-width: 680px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 0;
    box-sizing: border-box;
}

.public-card {
    width: 100%;
    max-width: 680px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.25);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    margin: 0 auto;
}

/* Temas de Card */
.card-light {
    background: #ffffff;
    color: #0f172a;
    border: 1px solid rgba(226, 232, 240, 0.9);
}

.card-dark {
    background: #0f172a;
    color: #f8fafc;
    border: 1px solid rgba(51, 65, 85, 0.8);
}

.card-glass {
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    background: rgba(255, 255, 255, 0.88);

    .dark-theme & {
        background: rgba(15, 23, 42, 0.88);
    }
}

.card-bordered {
    border-width: 2px;
}

/* === 1. HEADER CON PORTADA === */
.public-card-header {
    position: relative;
    width: 100%;
    flex-shrink: 0;
    overflow: hidden;
    background: #0f172a;

    &.h-compact { height: 140px; }
    &.h-medium { height: 190px; }
    &.h-tall { height: 250px; }

    @media (max-width: 480px) {
        &.h-tall { height: 190px; }
    }
}

.header-cover-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.header-cover-placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
}

.header-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.45) 50%, rgba(15, 23, 42, 0.1) 100%);
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 1.25rem 1.5rem;
    color: white;
}

.header-badge-row {
    margin-bottom: 0.35rem;
}

.event-badge {
    display: inline-block;
    padding: 0.2rem 0.65rem;
    border-radius: 9999px;
    font-size: 0.65rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.header-title {
    font-size: 1.25rem;
    font-weight: 800;
    line-height: 1.25;
    margin: 0;
    letter-spacing: -0.02em;

    @media (min-width: 640px) {
        font-size: 1.45rem;
    }
}

/* === 2. BODY CON SCROLL NATURAL Y ESPACIOSO === */
.public-card-body {
    width: 100%;
    padding: 1.5rem 2rem 2.25rem;
    box-sizing: border-box;

    @media (max-width: 640px) {
        padding: 1.25rem 1.15rem 1.75rem;
    }
}

.intro-description {
    font-size: 0.8rem;
    line-height: 1.55;
    color: #64748b;
    margin-bottom: 1.25rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #f1f5f9;

    .card-dark & {
        color: #94a3b8;
        border-bottom-color: #1e293b;
    }
}

.error-banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    background-color: #fef2f2;
    border-left: 4px solid #ef4444;
    color: #b91c1c;
    font-size: 0.75rem;
    font-weight: 600;
    margin-bottom: 1.25rem;

    .card-dark & {
        background-color: rgba(127, 29, 29, 0.25);
        color: #fca5a5;
    }
}

/* GRID DE CAMPOS */
.fields-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.15rem;

    @media (min-width: 640px) {
        grid-template-columns: repeat(2, 1fr);
    }
}

.field-col {
    display: flex;
    flex-direction: column;

    &.col-full {
        grid-column: 1 / -1;
    }

    &.col-half {
        grid-column: span 1;

        @media (max-width: 639px) {
            grid-column: 1 / -1;
        }
    }
}

.field-label {
    font-size: 0.75rem;
    font-weight: 700;
    margin-bottom: 0.35rem;
    letter-spacing: -0.01em;
}

.required-star {
    color: #ef4444;
    margin-left: 2px;
}

.input-wrap {
    position: relative;
    width: 100%;
}

.custom-input,
.custom-textarea,
.custom-select {
    width: 100%;
    padding: 0.65rem 0.85rem;
    border-radius: 0.75rem;
    font-size: 0.8rem;
    border: 1.5px solid #e2e8f0;
    background-color: #ffffff;
    color: #0f172a;
    outline: none;
    transition: all 0.2s ease;
    box-sizing: border-box;

    &:focus {
        border-color: #1e8449;
        box-shadow: 0 0 0 3px rgba(30, 132, 73, 0.12);
    }

    .card-dark & {
        background-color: #1e293b;
        border-color: #334155;
        color: #f8fafc;

        &:focus {
            border-color: #34d399;
            box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.15);
        }
    }

    &.input-error {
        border-color: #ef4444 !important;
        background-color: #fff5f5;

        .card-dark & {
            background-color: rgba(127, 29, 29, 0.15);
        }
    }
}

.custom-textarea {
    resize: vertical;
    min-height: 80px;
}

.options-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.2rem;
}

.radio-pill,
.checkbox-pill {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.6rem 0.85rem;
    border-radius: 0.75rem;
    border: 1.5px solid #e2e8f0;
    background-color: #ffffff;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        border-color: #cbd5e1;
        background-color: #f8fafc;
    }

    .card-dark & {
        background-color: #1e293b;
        border-color: #334155;

        &:hover {
            border-color: #475569;
            background-color: #1e293b;
        }
    }

    &.radio-selected,
    &.checkbox-selected {
        border-color: #1e8449;
        background-color: rgba(30, 132, 73, 0.05);

        .card-dark & {
            border-color: #34d399;
            background-color: rgba(52, 211, 153, 0.1);
        }
    }
}

.file-upload-box {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px dashed #cbd5e1;
    border-radius: 1rem;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.2s;
    background-color: #f8fafc;
    min-height: 120px;
}

.file-upload-box:hover {
    border-color: #1e8449;
    background-color: #f0fdf4;
}

.file-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: #64748b;
}

.file-icon {
    font-size: 2rem;
    width: 2rem;
    height: 2rem;
    color: #94a3b8;
}

.file-text {
    font-size: 0.85rem;
    font-weight: 600;
}

.file-preview-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
}

.file-preview-img {
    max-height: 100px;
    border-radius: 0.5rem;
    object-fit: cover;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.file-success-text {
    font-size: 0.75rem;
    color: #10b981;
    font-weight: 700;
}

.dark-theme .file-upload-box {
    background-color: #1e293b;
    border-color: #334155;
}

.dark-theme .file-upload-box:hover {
    border-color: #34d399;
    background-color: rgba(52, 211, 153, 0.1);
}



.radio-indicator {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid #cbd5e1;
    display: inline-block;
    transition: all 0.2s ease;
}

.indicator-checked {
    border-color: transparent !important;
}

.checkbox-indicator {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    border: 2px solid #cbd5e1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    color: white;

    .check-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
    }
}

.checkbox-checked {
    border-color: transparent !important;
}

.option-text {
    font-size: 0.75rem;
    font-weight: 500;
}

.field-error-msg {
    font-size: 0.65rem;
    color: #ef4444;
    margin-top: 0.25rem;
    font-weight: 600;
}

/* BOTÓN DE SUBMIT */
.submit-action-row {
    grid-column: 1 / -1;
    margin-top: 0.75rem;
    padding-top: 1rem;
    border-top: 1px solid #f1f5f9;

    .card-dark & {
        border-top-color: #1e293b;
    }
}

.btn-primary-submit {
    width: 100%;
    padding: 0.85rem 1.25rem;
    border-radius: 0.85rem;
    border: none;
    color: white;
    font-size: 0.85rem;
    font-weight: 800;
    letter-spacing: 0.03em;
    cursor: pointer;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;

    &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.25);
    }

    &:active:not(:disabled) {
        transform: translateY(0);
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .btn-arrow {
        font-size: 18px;
        width: 18px;
        height: 18px;
    }
}

.submit-spinner {
    width: 18px;
    height: 18px;
    border: 2.5px solid white;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

.terms-note {
    font-size: 0.65rem;
    color: #94a3b8;
    text-align: center;
    margin-top: 0.65rem;
}

.animate-fade-in {
    animation: fadeIn 0.35s ease-out;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
}
    `]
})
export class RegistroEventoPublicoComponent implements OnInit, OnDestroy {
    private _route = inject(ActivatedRoute);
    private _formService = inject(FormularioRegistroService);
    private _cdr = inject(ChangeDetectorRef);
    private _destroy$ = new Subject<void>();

    slug = '';
    loading = true;
    enviando = false;
    enviadoConExito = false;
    errorMessage = '';

    formPublico: FormularioRegistroPublicoDto | null = null;
    campos: CampoConfig[] = [];
    diseno: DisenoConfig | null = null;

    // Control de Wizard Multi-Paso
    pasoActual = 1;

    // Respuestas del usuario
    respuestas: { [key: string]: any } = {};
    erroresCampos: { [key: string]: boolean } = {};

    // Resultado de registro
    resultadoRegistro: any = null;

    /** Pasos configurados en el formulario */
    get pasos(): PasoFormularioConfig[] {
        if (this.diseno?.modoPasos && this.diseno.pasos && this.diseno.pasos.length > 0) {
            return this.diseno.pasos;
        }
        return [{ numero: 1, titulo: 'Datos Generales' }];
    }

    /** Pasos activos y visibles según las respuestas del usuario */
    get pasosVisibles(): PasoFormularioConfig[] {
        if (!this.diseno?.modoPasos) return [];
        return this.pasos.filter(p => this.esPasoVisible(p));
    }

    /** Posición ordinal del paso actual dentro de los pasos visibles */
    get indicePasoActualVisible(): number {
        const visibles = this.pasosVisibles;
        if (visibles.length === 0) return 0;
        const idx = visibles.findIndex(p => p.numero === this.pasoActual);
        return idx !== -1 ? idx : 0;
    }

    get totalPasos(): number {
        return this.diseno?.modoPasos ? this.pasosVisibles.length : this.pasos.length;
    }

    get totalPasosVisibles(): number {
        return this.pasosVisibles.length;
    }

    get pasoActualConfig(): PasoFormularioConfig | undefined {
        const visibles = this.pasosVisibles;
        if (visibles.length === 0) return this.pasos[0];
        return visibles[this.indicePasoActualVisible] || this.pasos[0];
    }

    get esUltimoPaso(): boolean {
        if (!this.diseno?.modoPasos) return true;
        const visibles = this.pasosVisibles;
        if (visibles.length === 0) return true;
        return this.indicePasoActualVisible >= visibles.length - 1;
    }

    ngOnInit(): void {
        this.slug = this._route.snapshot.paramMap.get('slug') || '';
        if (!this.slug) {
            this.loading = false;
            return;
        }
        this.cargarFormulario();
    }

    ngOnDestroy(): void {
        this._destroy$.next();
        this._destroy$.complete();
    }

    cargarFormulario(): void {
        this.loading = true;
        this._formService.getPublicoPorSlug(this.slug)
            .pipe(takeUntil(this._destroy$))
            .subscribe({
                next: (dto) => {
                    this.formPublico = dto;
                    this.loading = false;

                    try {
                        this.campos = JSON.parse(dto.camposConfigJson || '[]');
                    } catch {
                        this.campos = [];
                    }

                    try {
                        this.diseno = JSON.parse(dto.disenoConfigJson || '{}');
                    } catch {
                        this.diseno = null;
                    }

                    this.inicializarRespuestas();
                    this.pasoActual = 1;
                    this._cdr.markForCheck();
                },
                error: () => {
                    this.formPublico = null;
                    this.loading = false;
                    this._cdr.markForCheck();
                }
            });
    }

    inicializarRespuestas(): void {
        this.respuestas = {};
        this.erroresCampos = {};
        this.campos.forEach(c => {
            if (c.tipo === 'checkbox') {
                this.respuestas[c.id] = [];
            } else if (c.tipo === 'matrix') {
                this.respuestas[c.id] = {};
            } else {
                this.respuestas[c.id] = '';
            }
        });
    }

    /** Navegación Wizard: Avanza validando solo los campos del paso actual visible */
    avanzarPaso(): void {
        if (!this.validarPaso(this.pasoActual)) {
            return;
        }
        const visibles = this.pasosVisibles;
        const idx = visibles.findIndex(p => p.numero === this.pasoActual);
        if (idx !== -1 && idx < visibles.length - 1) {
            this.pasoActual = visibles[idx + 1].numero;
            this.errorMessage = '';
            if (typeof window !== 'undefined') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            this._cdr.markForCheck();
        }
    }

    /** Navegación Wizard: Regresa al paso anterior visible */
    retrocederPaso(): void {
        const visibles = this.pasosVisibles;
        const idx = visibles.findIndex(p => p.numero === this.pasoActual);
        if (idx > 0) {
            this.pasoActual = visibles[idx - 1].numero;
            this.errorMessage = '';
            if (typeof window !== 'undefined') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            this._cdr.markForCheck();
        }
    }

    /** Evalúa si un paso completo debe ser visible según sus dependencias o campos visibles */
    esPasoVisible(paso: PasoFormularioConfig): boolean {
        if (!paso) return false;
        if (paso.dependeDeCampoId) {
            const cumple = this.evaluarCondicionPaso(paso.dependeDeCampoId, paso.dependeDeValor, paso.dependeDeOperador);
            if (!cumple) return false;
        }
        const camposDelPaso = this.campos.filter(c => (c.paso || 1) === paso.numero);
        if (camposDelPaso.length === 0) {
            return paso.numero === 1;
        }
        return camposDelPaso.some(c => this.esCampoVisible(c));
    }

    evaluarCondicionPaso(campoId: string, valEsperado?: string, operador?: string): boolean {
        const valorDependencia = this.respuestas[campoId];
        if (valorDependencia === undefined || valorDependencia === null || valorDependencia === '') {
            return false;
        }
        const valRequerido = (valEsperado || '').toLowerCase().trim();
        if (!valRequerido) return true;

        if (Array.isArray(valorDependencia)) {
            if (valorDependencia.length === 0) return false;
            return valorDependencia.some(v => {
                const item = (v || '').toLowerCase().trim();
                return item === valRequerido || item.includes(valRequerido) || valRequerido.includes(item);
            });
        }

        const valActual = String(valorDependencia).toLowerCase().trim();
        if (operador === 'contains') {
            return valActual.includes(valRequerido) || valRequerido.includes(valActual);
        }
        return valActual === valRequerido || valActual.includes(valRequerido);
    }

    /** Determina si un campo pertenece al paso visible en pantalla */
    esCampoDePasoActual(campo: CampoConfig): boolean {
        if (!this.diseno?.modoPasos) return true;
        const pasoCampo = campo.paso || 1;
        return pasoCampo === this.pasoActual;
    }

    /** Seleccionar opción en la tabla de evaluación Matriz (Likert 1 al 5) */
    seleccionarMatriz(campoId: string, filaId: string, valor: string): void {
        if (!this.respuestas[campoId] || typeof this.respuestas[campoId] !== 'object' || Array.isArray(this.respuestas[campoId])) {
            this.respuestas[campoId] = {};
        }
        this.respuestas[campoId][filaId] = valor;
        this.limpiarError(campoId);
        this._cdr.markForCheck();
    }

    /** Seleccionar opción en botones de radio */
    seleccionarRadio(campoId: string, opt: string): void {
        this.respuestas[campoId] = opt;
        this.limpiarError(campoId);
        this._cdr.markForCheck();
    }

    /** Comprueba si una opción de checkbox está seleccionada */
    isCheckboxChecked(campoId: string, opt: string): boolean {
        const val = this.respuestas[campoId];
        if (Array.isArray(val)) {
            return val.includes(opt);
        }
        if (typeof val === 'string' && val.length > 0) {
            return val.split(',').map(s => s.trim()).includes(opt);
        }
        return false;
    }

    /** Alternar selección de checkbox múltiple de forma segura y reactiva */
    toggleCheckbox(campoId: string, opcion: string): void {
        if (!this.respuestas[campoId] || !Array.isArray(this.respuestas[campoId])) {
            if (typeof this.respuestas[campoId] === 'string' && this.respuestas[campoId]) {
                this.respuestas[campoId] = (this.respuestas[campoId] as string).split(',').map(s => s.trim());
            } else {
                this.respuestas[campoId] = [];
            }
        }
        const arr = this.respuestas[campoId] as string[];
        const idx = arr.indexOf(opcion);
        if (idx >= 0) {
            arr.splice(idx, 1);
        } else {
            arr.push(opcion);
        }

        // Si el paso actual dejó de ser visible tras el cambio, ajustar al primer paso visible
        const visibles = this.pasosVisibles;
        if (visibles.length > 0 && !visibles.some(p => p.numero === this.pasoActual)) {
            this.pasoActual = visibles[0].numero;
        }

        this.limpiarError(campoId);
        this._cdr.markForCheck();
    }

    limpiarError(campoId: string): void {
        this.erroresCampos[campoId] = false;
        this.errorMessage = '';
    }

    /** Evalúa si el campo o bloque debe ser visible según la respuesta del campo dependiente */
    esCampoVisible(campo: CampoConfig): boolean {
        if (!campo.dependeDeCampoId) {
            return true;
        }

        const valorDependencia = this.respuestas[campo.dependeDeCampoId];
        if (valorDependencia === undefined || valorDependencia === null || valorDependencia === '') {
            return false;
        }

        const valRequerido = (campo.dependeDeValor || '').toLowerCase().trim();
        if (!valRequerido) {
            return true;
        }

        // Si el campo padre es selección múltiple (checkbox / array)
        if (Array.isArray(valorDependencia)) {
            if (valorDependencia.length === 0) return false;
            return valorDependencia.some(v => {
                const item = (v || '').toLowerCase().trim();
                return item === valRequerido || item.includes(valRequerido) || valRequerido.includes(item);
            });
        }

        const valActual = String(valorDependencia).toLowerCase().trim();
        if (campo.dependeDeOperador === 'contains') {
            return valActual.includes(valRequerido) || valRequerido.includes(valActual);
        }

        return valActual === valRequerido || valActual.includes(valRequerido);
    }

    onFileSelected(event: any, campoId: string): void {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                this.respuestas[campoId] = reader.result as string; // Guardar como Base64
                this.limpiarError(campoId);
            };
            reader.readAsDataURL(file);
        }
    }

    /** Valida campos requeridos del paso especificado */
    validarPaso(pasoNum: number): boolean {
        this.erroresCampos = {};
        let valido = true;

        const camposDelPaso = this.campos.filter(c => {
            if (!this.esCampoVisible(c)) return false;
            if (!this.diseno?.modoPasos) return true;
            return (c.paso || 1) === pasoNum;
        });

        for (const campo of camposDelPaso) {
            if (campo.tipo === 'section') continue; // Los bloques no requieren valor

            if (campo.tipo === 'matrix') {
                if (campo.requerido && campo.filasMatriz && campo.filasMatriz.length > 0) {
                    const respMatriz = this.respuestas[campo.id] || {};
                    const faltaAlgunaFila = campo.filasMatriz.some(f => !respMatriz[f.id]);
                    if (faltaAlgunaFila) {
                        this.erroresCampos[campo.id] = true;
                        valido = false;
                    }
                }
                continue;
            }

            if (campo.requerido) {
                const val = this.respuestas[campo.id];
                if (val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
                    this.erroresCampos[campo.id] = true;
                    valido = false;
                }
            }
        }

        if (!valido) {
            this.errorMessage = 'Por favor completa todos los campos obligatorios del paso actual marcados con asterisco (*).';
        } else {
            this.errorMessage = '';
        }

        this._cdr.markForCheck();
        return valido;
    }

    /** Valida la totalidad de los pasos visibles del formulario antes de enviar */
    validar(): boolean {
        for (const paso of this.pasosVisibles) {
            if (!this.validarPaso(paso.numero)) {
                this.pasoActual = paso.numero;
                return false;
            }
        }
        return true;
    }

    enviarRegistro(): void {
        if (!this.validar()) return;

        this.enviando = true;
        this.errorMessage = '';

        const payload = {
            respuestas: this.respuestas
        };

        this._formService.responderPublico(this.slug, payload)
            .pipe(takeUntil(this._destroy$))
            .subscribe({
                next: (res) => {
                    this.enviando = false;
                    this.resultadoRegistro = res;
                    this.enviadoConExito = true;
                    this._cdr.markForCheck();
                },
                error: (err) => {
                    this.enviando = false;
                    this.errorMessage = err?.error?.mensaje || 'Ocurrió un error al procesar tu respuesta. Por favor intenta de nuevo.';
                    this._cdr.markForCheck();
                }
            });
    }

    get qrCodeUrl(): string {
        if (!this.resultadoRegistro?.tokenQR) return '';
        const baseUrl = window.location.origin + window.location.pathname;
        const fichaUrl = `${baseUrl}#/eventos/ficha-personal/${this.resultadoRegistro.tokenQR}`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(fichaUrl)}`;
    }
}
