import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CalendarioService, EventoGoogle } from '../calendario.service';
import { claveDia, horaCorta, leerSeleccion, sumarDias } from '../calendario.utils';

const CLAVE_POSICION = 'calendarioFlotantePos';
const MARGEN = 8;
const UMBRAL_ARRASTRE = 5; // píxeles: menos que esto cuenta como clic
const TAM_BOTON = 56;

/**
 * Agenda de hoy en un recuadro flotante que se puede arrastrar por toda la ventana.
 * Se minimiza a un botón y recuerda su última posición en el navegador.
 */
@Component({
    selector: 'calendario-flotante',
    standalone: true,
    imports: [CommonModule, RouterLink, MatIconModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <!-- Botón minimizado -->
        <button *ngIf="!abierto"
                type="button"
                (pointerdown)="iniciarArrastre($event)"
                (click)="alternar()"
                class="group relative flex h-14 w-14 cursor-grab touch-none select-none items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-xl shadow-blue-900/30 ring-1 ring-white/30 transition-transform duration-200 hover:scale-105 active:cursor-grabbing active:scale-95"
                aria-label="Abrir calendario de hoy">
            <mat-icon class="!h-7 !w-7 !text-[28px] text-white" [svgIcon]="'heroicons_outline:calendar-days'"></mat-icon>
            <span *ngIf="eventos.length" class="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white ring-2 ring-white">
                {{ eventos.length }}
            </span>
        </button>

        <!-- Tarjeta expandida -->
        <div *ngIf="abierto"
             class="flex max-h-[28rem] w-80 flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/5 backdrop-blur-xl dark:border-gray-700/60 dark:bg-gray-900/95 dark:ring-white/5">

            <!-- Encabezado: arrastrable -->
            <div class="flex cursor-grab touch-none select-none items-center justify-between gap-3 bg-gradient-to-r from-sky-500 to-blue-700 px-4 py-3 text-white active:cursor-grabbing"
                 (pointerdown)="iniciarArrastre($event)">
                <div class="flex min-w-0 flex-col leading-tight">
                    <span class="text-[11px] font-semibold uppercase tracking-widest text-sky-100">Hoy</span>
                    <span class="truncate text-base font-bold capitalize">{{ hoyTexto }}</span>
                </div>
                <div class="flex items-center gap-1">
                    <a routerLink="/calendario" (click)="cerrarPorNavegacion($event)"
                       class="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
                       aria-label="Abrir calendario completo">
                        <mat-icon class="!h-5 !w-5 !text-[20px] text-white" [svgIcon]="'heroicons_outline:arrow-top-right-on-square'"></mat-icon>
                    </a>
                    <button type="button" (click)="alternar()"
                            class="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
                            aria-label="Minimizar calendario">
                        <mat-icon class="!h-5 !w-5 !text-[20px] text-white" [svgIcon]="'heroicons_outline:minus'"></mat-icon>
                    </button>
                </div>
            </div>

            <!-- Contenido -->
            <div class="flex-auto space-y-2.5 overflow-y-auto p-3">

                <!-- Cargando: esqueleto -->
                <ng-container *ngIf="cargando">
                    <div *ngFor="let i of [1, 2, 3]" class="animate-pulse rounded-2xl bg-slate-100 p-3 dark:bg-gray-800">
                        <div class="mb-2 h-3 w-14 rounded bg-slate-200 dark:bg-gray-700"></div>
                        <div class="h-4 w-4/5 rounded bg-slate-200 dark:bg-gray-700"></div>
                    </div>
                </ng-container>

                <!-- Error -->
                <div *ngIf="error && !cargando"
                     class="flex gap-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800">
                    <mat-icon class="!h-5 !w-5 shrink-0 text-amber-600" [svgIcon]="'heroicons_outline:exclamation-triangle'"></mat-icon>
                    <span>{{ error }}</span>
                </div>

                <!-- Vacío -->
                <div *ngIf="!cargando && !error && eventos.length === 0"
                     class="flex flex-col items-center gap-2 py-8 text-center">
                    <div class="flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300">
                        <mat-icon [svgIcon]="'heroicons_outline:calendar-days'"></mat-icon>
                    </div>
                    <p class="text-sm font-medium text-slate-700 dark:text-slate-200">Día libre</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">No tienes eventos programados para hoy.</p>
                </div>

                <!-- Eventos -->
                <a *ngFor="let e of eventos"
                   [attr.href]="e.enlace"
                   target="_blank"
                   rel="noopener"
                   class="group relative block overflow-hidden rounded-2xl bg-white p-3 pl-4 shadow-sm ring-1 ring-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-md dark:bg-gray-800 dark:ring-white/5">
                    <span class="absolute inset-y-0 left-0 w-1" [style.background-color]="e.color"></span>
                    <div class="mb-1 flex items-center justify-between gap-2">
                        <span class="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-600 dark:bg-gray-700 dark:text-slate-300">
                            {{ e.esTodoElDia ? 'Todo el día' : hora(e.inicio) + ' – ' + hora(e.fin) }}
                        </span>
                    </div>
                    <div class="text-sm font-semibold leading-snug text-slate-800 dark:text-slate-100">{{ e.titulo }}</div>
                    <div *ngIf="e.ubicacion" class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{{ e.ubicacion }}</div>
                </a>
            </div>

            <!-- Pie -->
            <a routerLink="/calendario" (click)="cerrarPorNavegacion($event)"
               class="border-t border-slate-200/70 px-4 py-2.5 text-center text-xs font-semibold text-sky-700 transition hover:bg-sky-50 dark:border-gray-700 dark:text-sky-300 dark:hover:bg-gray-800">
                Ver calendario completo
            </a>
        </div>
    `,
    styles: [`
        :host {
            position: fixed;
            z-index: 1000;
        }
    `],
})
export class CalendarioFlotanteComponent implements OnInit, OnDestroy {
    abierto = false;
    cargando = false;
    eventos: EventoGoogle[] = [];
    error = '';
    hoyTexto = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });

    /** Posición en píxeles desde la esquina superior izquierda de la ventana. */
    x = 0;
    y = 0;

    private arrastrando = false;
    private huboArrastre = false;
    private inicioPuntero = { x: 0, y: 0 };
    private inicioPosicion = { x: 0, y: 0 };

    constructor(
        private calendario: CalendarioService,
        private cdr: ChangeDetectorRef,
        private host: ElementRef<HTMLElement>,
    ) {}

    ngOnInit(): void {
        // Se mueve al body: así `position: fixed` es relativo a la ventana y no al layout,
        // que puede tener transform o filter y dejaría el widget atrapado en el menú.
        document.body.appendChild(this.host.nativeElement);

        const guardada = this.leerPosicion();
        if (guardada) {
            this.x = guardada.x;
            this.y = guardada.y;
        } else {
            this.x = window.innerWidth - TAM_BOTON - 24;
            this.y = window.innerHeight - TAM_BOTON - 24;
        }
        this.ajustarALaVentana();
    }

    ngOnDestroy(): void {
        this.host.nativeElement.remove();
    }

    @HostListener('window:resize')
    onResize(): void {
        this.ajustarALaVentana();
    }

    @HostListener('document:pointermove', ['$event'])
    onPointerMove(ev: PointerEvent): void {
        if (!this.arrastrando) return;
        const dx = ev.clientX - this.inicioPuntero.x;
        const dy = ev.clientY - this.inicioPuntero.y;
        if (!this.huboArrastre && Math.hypot(dx, dy) < UMBRAL_ARRASTRE) return;

        this.huboArrastre = true;
        this.x = this.inicioPosicion.x + dx;
        this.y = this.inicioPosicion.y + dy;
        this.ajustarALaVentana();
    }

    @HostListener('document:pointerup')
    @HostListener('document:pointercancel')
    onPointerUp(): void {
        if (!this.arrastrando) return;
        this.arrastrando = false;
        this.guardarPosicion();
    }

    iniciarArrastre(ev: PointerEvent): void {
        if (ev.pointerType === 'mouse' && ev.button !== 0) return;
        this.arrastrando = true;
        this.huboArrastre = false;
        this.inicioPuntero = { x: ev.clientX, y: ev.clientY };
        this.inicioPosicion = { x: this.x, y: this.y };
    }

    alternar(): void {
        // Si el usuario acaba de arrastrar, el clic que sigue al soltar no debe abrir ni cerrar nada
        if (this.huboArrastre) {
            this.huboArrastre = false;
            return;
        }
        this.abierto = !this.abierto;
        if (this.abierto) this.cargarHoy();
        this.cdr.markForCheck();
    }

    cerrarPorNavegacion(ev: Event): void {
        if (this.huboArrastre) {
            ev.preventDefault();
            this.huboArrastre = false;
            return;
        }
        this.abierto = false;
        this.cdr.markForCheck();
    }

    hora(iso: string): string {
        return horaCorta(iso);
    }

    /** Mantiene el recuadro dentro de la ventana, sea cual sea su tamaño actual. */
    private ajustarALaVentana(): void {
        const el = this.host.nativeElement;
        const ancho = el.offsetWidth || TAM_BOTON;
        const alto = el.offsetHeight || TAM_BOTON;
        const maxX = window.innerWidth - ancho - MARGEN;
        const maxY = window.innerHeight - alto - MARGEN;
        this.x = Math.min(Math.max(this.x, MARGEN), Math.max(MARGEN, maxX));
        this.y = Math.min(Math.max(this.y, MARGEN), Math.max(MARGEN, maxY));
        el.style.left = `${this.x}px`;
        el.style.top = `${this.y}px`;
    }

    private leerPosicion(): { x: number; y: number } | null {
        try {
            const raw = localStorage.getItem(CLAVE_POSICION);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    private guardarPosicion(): void {
        try {
            localStorage.setItem(CLAVE_POSICION, JSON.stringify({ x: this.x, y: this.y }));
        } catch {
            // Sin almacenamiento: la posición vuelve a la esquina al recargar
        }
    }

    private cargarHoy(): void {
        this.cargando = true;
        this.error = '';
        this.cdr.markForCheck();
        this.calendario.calendarios().subscribe({
            next: lista => {
                const ids = leerSeleccion(lista);
                if (ids.length === 0) {
                    this.eventos = [];
                    this.cargando = false;
                    this.cdr.markForCheck();
                    return;
                }
                const ahora = new Date();
                const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
                this.calendario.eventos(hoy, sumarDias(hoy, 1), ids).subscribe({
                    next: evs => {
                        this.eventos = evs.filter(e => claveDia(new Date(e.inicio)) === claveDia(hoy)).slice(0, 6);
                        this.cargando = false;
                        this.cdr.markForCheck();
                    },
                    error: (err: HttpErrorResponse) => this.mostrarError(err),
                });
            },
            error: (err: HttpErrorResponse) => this.mostrarError(err),
        });
    }

    private mostrarError(err: HttpErrorResponse): void {
        this.eventos = [];
        this.cargando = false;
        this.error = err.status === 409
            ? (err.error?.mensaje || 'Conecta tu cuenta de Google para ver tu calendario.')
            : 'No se pudo cargar el calendario.';
        this.cdr.markForCheck();
    }
}
