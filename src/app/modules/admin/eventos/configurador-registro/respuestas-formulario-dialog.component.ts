import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CampoConfig, FormularioRegistroAdminDto, FormularioRegistroService, FormularioRespuestaDetalleDto } from './formulario-registro.service';
import { IdentidadRespuesta, coincideBusqueda, construirDetalle, fechaDesdeApi, parsearRespuestas, resolverIdentidad } from './respuestas-formulario.utils';

type RespuestaVista = FormularioRespuestaDetalleDto & {
    fecha: Date;
    detalle: ReturnType<typeof construirDetalle>;
    identidad: IdentidadRespuesta;
};

/** Quiénes respondieron un formulario y qué contestó cada persona (se abre desde el listado del configurador). */
@Component({
    selector: 'respuestas-formulario-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule],
    template: `
        <div class="flex flex-col h-[85vh] max-h-[85vh] bg-white dark:bg-slate-900">

            <!-- Encabezado -->
            <div class="flex-none flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-700">
                <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center flex-shrink-0">
                    <mat-icon>fact_check</mat-icon>
                </div>
                <div class="min-w-0 flex-auto">
                    <div class="text-lg font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">Respuestas recibidas</div>
                    <div class="text-xs text-slate-500 dark:text-slate-400 truncate">{{ data.formulario.titulo }}</div>
                </div>
                <span *ngIf="!cargando && !error" class="hidden sm:inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                    {{ respuestas.length }} {{ respuestas.length === 1 ? 'persona respondió' : 'personas respondieron' }}
                </span>
                <button type="button" mat-icon-button (click)="cargar()" [disabled]="cargando" matTooltip="Actualizar" aria-label="Actualizar respuestas">
                    <mat-icon [class.animate-spin]="cargando">refresh</mat-icon>
                </button>
                <button type="button" mat-icon-button (click)="dialogRef.close()" matTooltip="Cerrar" aria-label="Cerrar">
                    <mat-icon>close</mat-icon>
                </button>
            </div>

            <!-- Cargando -->
            <div *ngIf="cargando && respuestas.length === 0" class="flex-auto flex flex-col items-center justify-center gap-3 text-slate-400">
                <div class="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-xs">Cargando respuestas…</p>
            </div>

            <!-- Error -->
            <div *ngIf="error" class="flex-auto flex flex-col items-center justify-center gap-3 p-8 text-center">
                <mat-icon class="text-rose-400 icon-size-10">error_outline</mat-icon>
                <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ error }}</p>
                <button type="button" mat-stroked-button (click)="cargar()">Reintentar</button>
            </div>

            <!-- Sin respuestas -->
            <div *ngIf="!cargando && !error && respuestas.length === 0" class="flex-auto flex flex-col items-center justify-center gap-2 p-8 text-center text-slate-400">
                <mat-icon class="icon-size-12 text-slate-300">inbox</mat-icon>
                <h4 class="text-base font-bold text-slate-600 dark:text-slate-300">Aún nadie ha respondido este formulario</h4>
                <p class="text-xs max-w-sm">Cuando alguien lo conteste aparecerá aquí con todas sus respuestas.</p>
            </div>

            <!-- Lista + detalle -->
            <div *ngIf="!error && respuestas.length > 0" class="flex-auto min-h-0 flex flex-col md:flex-row">

                <!-- Quiénes respondieron -->
                <div class="flex-none md:w-80 max-h-60 md:max-h-none flex flex-col border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700">
                    <div class="flex-none p-3 border-b border-slate-100 dark:border-slate-800">
                        <div class="relative">
                            <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 icon-size-4">search</mat-icon>
                            <input type="text" [(ngModel)]="busqueda" (ngModelChange)="filtrar()" placeholder="Buscar por nombre, correo o teléfono"
                                   class="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                        </div>
                    </div>
                    <div class="flex-auto overflow-y-auto">
                        <button type="button" *ngFor="let r of filtradas" (click)="seleccionada = r"
                                class="w-full text-left px-4 py-3 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 transition-colors"
                                [ngClass]="r === seleccionada ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'">
                            <div class="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-sm flex-shrink-0">
                                {{ r.identidad.nombre.charAt(0).toUpperCase() }}
                            </div>
                            <div class="min-w-0">
                                <div class="flex items-center gap-1.5">
                                    <span class="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{{ r.identidad.nombre }}</span>
                                    <span *ngIf="r.identidad.esEmpresa" class="flex-none px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-bold uppercase tracking-wide text-slate-500">Empresa</span>
                                </div>
                                <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate">{{ r.identidad.correo || r.identidad.telefono || 'Sin datos de contacto' }}</div>
                                <div class="text-[10px] text-slate-400">{{ r.fecha | date:'dd/MM/yyyy HH:mm' }}</div>
                            </div>
                        </button>
                        <div *ngIf="filtradas.length === 0" class="p-6 text-center text-xs text-slate-400">Nadie coincide con la búsqueda.</div>
                    </div>
                </div>

                <!-- Qué respondió -->
                <div class="flex-auto min-w-0 overflow-y-auto p-5 md:p-6">
                    <ng-container *ngIf="seleccionada as r">
                        <div class="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                            <div class="min-w-0">
                                <div class="flex items-center gap-2">
                                    <span class="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">{{ r.identidad.nombre }}</span>
                                    <span *ngIf="r.identidad.esEmpresa" class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-wide text-slate-500">Empresa</span>
                                </div>
                                <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                    <span *ngIf="r.identidad.correo" class="inline-flex items-center gap-1"><mat-icon class="icon-size-4">email</mat-icon>{{ r.identidad.correo }}</span>
                                    <span *ngIf="r.identidad.telefono" class="inline-flex items-center gap-1"><mat-icon class="icon-size-4">phone</mat-icon>{{ r.identidad.telefono }}</span>
                                    <span class="inline-flex items-center gap-1"><mat-icon class="icon-size-4">schedule</mat-icon>{{ r.fecha | date:'dd/MM/yyyy HH:mm' }}</span>
                                </div>
                            </div>
                            <span class="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold">
                                {{ r.detalle.respondidas }} de {{ r.detalle.total }} preguntas respondidas
                            </span>
                        </div>

                        <div *ngIf="r.detalle.items.length === 0" class="py-12 text-center text-sm text-slate-400">
                            Esta persona no contestó ninguna pregunta.
                        </div>

                        <div class="mt-4 space-y-3">
                            <ng-container *ngFor="let it of r.detalle.items">
                                <div *ngIf="it.tipo === 'seccion'" class="pt-3 text-[11px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 border-b border-emerald-100 dark:border-emerald-900/60 pb-1">
                                    {{ it.etiqueta }}
                                </div>

                                <div *ngIf="it.tipo === 'pregunta'" class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 px-4 py-3">
                                    <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ it.etiqueta }}</div>

                                    <div class="mt-1.5 text-sm text-slate-800 dark:text-slate-100">
                                        <p *ngIf="it.valor.tipo === 'texto'" class="whitespace-pre-line break-words">{{ it.valor.texto }}</p>

                                        <div *ngIf="it.valor.tipo === 'lista'" class="flex flex-wrap gap-1.5">
                                            <span *ngFor="let x of it.valor.items" class="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">{{ x }}</span>
                                        </div>

                                        <div *ngIf="it.valor.tipo === 'matriz'" class="divide-y divide-slate-200 dark:divide-slate-700">
                                            <div *ngFor="let f of it.valor.filas" class="flex items-center justify-between gap-4 py-1.5">
                                                <span class="text-xs text-slate-600 dark:text-slate-300">{{ f.pregunta }}</span>
                                                <span class="text-xs font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">{{ f.respuesta }}</span>
                                            </div>
                                        </div>

                                        <img *ngIf="it.valor.tipo === 'imagen'" [src]="it.valor.src" alt="Imagen enviada" class="max-h-48 rounded-lg border border-slate-200 dark:border-slate-700">

                                        <span *ngIf="it.valor.tipo === 'archivo'" class="inline-flex items-center gap-1 text-xs text-slate-500">
                                            <mat-icon class="icon-size-4">attach_file</mat-icon> Archivo adjunto
                                        </span>
                                    </div>
                                </div>
                            </ng-container>
                        </div>
                    </ng-container>
                </div>
            </div>
        </div>
    `,
})
export class RespuestasFormularioDialogComponent implements OnInit {
    private _servicio = inject(FormularioRegistroService);
    private _cdr = inject(ChangeDetectorRef);
    dialogRef = inject<MatDialogRef<RespuestasFormularioDialogComponent>>(MatDialogRef);
    data = inject<{ formulario: FormularioRegistroAdminDto }>(MAT_DIALOG_DATA);

    cargando = true;
    error: string | null = null;
    respuestas: RespuestaVista[] = [];
    filtradas: RespuestaVista[] = [];
    seleccionada: RespuestaVista | null = null;
    busqueda = '';
    private _campos: CampoConfig[] = [];

    ngOnInit(): void {
        try {
            this._campos = JSON.parse(this.data.formulario.camposConfigJson || '[]');
        } catch {
            this._campos = [];
        }
        this.cargar();
    }

    cargar(): void {
        this.cargando = true;
        this.error = null;
        this._servicio.getRespuestasPorEvento(this.data.formulario.eventoId).subscribe({
            next: datos => {
                // El API devuelve las respuestas de todos los formularios del evento: aquí solo las de este
                this.respuestas = (datos || [])
                    .filter(r => r.formularioId === this.data.formulario.id)
                    .map(r => {
                        const respuestas = parsearRespuestas(r.respuestasJson);
                        return {
                            ...r,
                            fecha: fechaDesdeApi(r.fechaRegistro),
                            detalle: construirDetalle(this._campos, respuestas),
                            identidad: resolverIdentidad(r, this._campos, respuestas),
                        };
                    });
                this.cargando = false;
                this.filtrar();
                this._cdr.markForCheck();
            },
            error: () => {
                this.cargando = false;
                this.error = 'No se pudieron cargar las respuestas. Revisa tu conexión e inténtalo de nuevo.';
                this._cdr.markForCheck();
            },
        });
    }

    filtrar(): void {
        const idActual = this.seleccionada?.id; // se conserva la persona abierta al actualizar o buscar
        this.filtradas = this.respuestas.filter(r => coincideBusqueda(
            { nombreAsistente: r.identidad.nombre, correoAsistente: r.identidad.correo, telefonoAsistente: r.identidad.telefono }, this.busqueda));
        this.seleccionada = this.filtradas.find(r => r.id === idActual) ?? this.filtradas[0] ?? null;
    }
}
