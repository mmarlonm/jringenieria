import { Component, OnInit, OnDestroy, ViewEncapsulation, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';
import { FormularioRegistroService, FormularioRegistroPublicoDto, CampoConfig, DisenoConfig } from '../../admin/eventos/configurador-registro/formulario-registro.service';

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
            
            <h2 class="text-xl font-black text-slate-900 dark:text-white">¡Registro Confirmado!</h2>
            <p class="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                {{ resultadoRegistro?.nombreCompleto || 'Bienvenido(a)' }}
            </p>
            <p class="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                {{ diseno?.mensajeExito || 'Tu registro ha sido completado exitosamente.' }}
            </p>

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
                
                <!-- Descripción / Intro -->
                <div *ngIf="formPublico.descripcion" class="intro-description">
                    <p>{{ formPublico.descripcion }}</p>
                </div>

                <!-- Mensaje de error general -->
                <div *ngIf="errorMessage" class="error-banner animate-fade-in">
                    <mat-icon class="text-sm">warning</mat-icon>
                    <span>{{ errorMessage }}</span>
                </div>

                <!-- CAMPOS DINÁMICOS -->
                <form (ngSubmit)="enviarRegistro()" class="fields-grid" #regForm="ngForm">
                    <div *ngFor="let campo of campos"
                         class="field-col"
                         [ngClass]="{'col-full': campo.ancho === 'full', 'col-half': campo.ancho === 'half'}">

                        <!-- Etiqueta del campo -->
                        <label class="field-label" [for]="campo.id">
                            {{ campo.etiqueta }}
                            <span *ngIf="campo.requerido" class="required-star">*</span>
                        </label>

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
                            <label *ngFor="let opt of campo.opciones"
                                   class="radio-pill"
                                   [class.radio-selected]="respuestas[campo.id] === opt"
                                   (click)="respuestas[campo.id] = opt; limpiarError(campo.id)">
                                <input type="radio" [name]="campo.id" [value]="opt" [(ngModel)]="respuestas[campo.id]" class="sr-only">
                                <span class="radio-indicator" [class.indicator-checked]="respuestas[campo.id] === opt"
                                      [ngStyle]="{'background-color': respuestas[campo.id] === opt ? (diseno?.colorPrimario || '#1e8449') : undefined}"></span>
                                <span class="option-text">{{ opt }}</span>
                            </label>
                        </div>

                        <!-- Checkboxes (Multiple) -->
                        <div *ngIf="campo.tipo === 'checkbox'" class="options-group">
                            <label *ngFor="let opt of campo.opciones"
                                   class="checkbox-pill"
                                   [class.checkbox-selected]="respuestas[campo.id]?.includes(opt)"
                                   (click)="toggleCheckbox(campo.id, opt); limpiarError(campo.id)">
                                <input type="checkbox" [checked]="respuestas[campo.id]?.includes(opt)" class="sr-only">
                                <span class="checkbox-indicator" [class.checkbox-checked]="respuestas[campo.id]?.includes(opt)"
                                      [ngStyle]="{'background-color': respuestas[campo.id]?.includes(opt) ? (diseno?.colorPrimario || '#1e8449') : undefined}">
                                    <mat-icon *ngIf="respuestas[campo.id]?.includes(opt)" class="check-icon">check</mat-icon>
                                </span>
                                <span class="option-text">{{ opt }}</span>
                            </label>
                        </div>

                        <!-- Error individual de campo requerido -->
                        <span *ngIf="erroresCampos[campo.id]" class="field-error-msg">
                            Este campo es obligatorio.
                        </span>
                    </div>

                    <!-- BOTÓN DE ENVÍO -->
                    <div class="submit-action-row">
                        <button type="submit"
                                [disabled]="enviando"
                                class="btn-primary-submit"
                                [ngStyle]="{'background-color': diseno?.colorPrimario || '#1e8449'}">
                            <span *ngIf="enviando" class="submit-spinner"></span>
                            <span>{{ enviando ? 'Registrando...' : (diseno?.botonTexto || 'Completar Registro') }}</span>
                            <mat-icon *ngIf="!enviando" class="btn-arrow">arrow_forward</mat-icon>
                        </button>
                        <p class="terms-note">Al registrarte aceptas las políticas de acceso y aviso de privacidad de JR Ingeniería.</p>
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
    width: 100vw;
    height: 100vh;
    margin: 0;
    padding: 0;
    font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
    -webkit-font-smoothing: antialiased;
    box-sizing: border-box;
}

.public-registration-root {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 50%, #e2e8f0 100%);
    position: fixed;
    top: 0;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    &.dark-theme {
        background: linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e293b 100%);
    }
}

/* === ESTADOS DE CARGA Y MENSAJES === */
.state-card-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
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

/* === CONTENEDOR VIEWPORT CARD (EXACTO: CENTRADA, TOPE VERTICAL CONTENIDO) === */
.form-viewport-container {
    width: 100%;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    box-sizing: border-box;

    @media (min-width: 640px) {
        padding: 1.5rem 2rem;
    }
}

.public-card {
    width: 100%;
    max-width: 640px;
    /* La card se adapta pero nunca excede la altura de la ventana (tope abajo) */
    max-height: calc(100vh - 2rem);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.25);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    @media (min-width: 640px) {
        max-height: calc(100vh - 3rem);
    }
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

/* === 2. BODY CON SCROLL INTERNO LIMPIO === */
.public-card-body {
    flex: 1 1 auto;
    overflow-y: auto;
    padding: 1.25rem 1.5rem 1.75rem;
    scrollbar-width: thin;
    scrollbar-color: rgba(100, 116, 139, 0.25) transparent;

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-thumb {
        background-color: rgba(100, 116, 139, 0.25);
        border-radius: 9999px;
    }

    @media (min-width: 640px) {
        padding: 1.5rem 2rem 2rem;
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
            background-color: #27354a;
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

    // Respuestas del usuario
    respuestas: { [key: string]: any } = {};
    erroresCampos: { [key: string]: boolean } = {};

    // Resultado de registro
    resultadoRegistro: any = null;

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
            } else {
                this.respuestas[c.id] = '';
            }
        });
    }

    toggleCheckbox(campoId: string, opcion: string): void {
        if (!this.respuestas[campoId]) {
            this.respuestas[campoId] = [];
        }
        const arr = this.respuestas[campoId] as string[];
        const idx = arr.indexOf(opcion);
        if (idx >= 0) {
            arr.splice(idx, 1);
        } else {
            arr.push(optcionValida(opcion));
        }
        function optcionValida(o: string) { return o; }
    }

    limpiarError(campoId: string): void {
        this.erroresCampos[campoId] = false;
        this.errorMessage = '';
    }

    validar(): boolean {
        this.erroresCampos = {};
        let valido = true;

        for (const campo of this.campos) {
            if (campo.requerido) {
                const val = this.respuestas[campo.id];
                if (val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
                    this.erroresCampos[campo.id] = true;
                    valido = false;
                }
            }
        }

        if (!valido) {
            this.errorMessage = 'Por favor completa todos los campos obligatorios marcados con asterisco (*).';
        }

        return valido;
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
                    this.errorMessage = err?.error?.mensaje || 'Ocurrió un error al procesar tu registro. Por favor intenta de nuevo.';
                    this._cdr.markForCheck();
                }
            });
    }

    get qrCodeUrl(): string {
        if (!this.resultadoRegistro?.tokenQR) return '';
        return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(this.resultadoRegistro.tokenQR)}`;
    }
}
