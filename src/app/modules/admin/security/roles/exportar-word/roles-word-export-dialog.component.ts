import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { catchError, forkJoin, of, take } from 'rxjs';
import Swal from 'sweetalert2';

import { defaultNavigation } from 'app/mock-api/common/navigation/data';
import { FuseNavigationItem } from '@fuse/components/navigation';
import { RolService } from '../roles.service';
import { ModuloRol, PermisoCatalogo, Seleccion, construirModulos } from '../roles-permisos.utils';
import { RolesWordExportService } from '../roles-word-export.service';

export interface DialogDataRolesWord {
    rolSeleccionadoId?: number | null;
    seleccionActual?: Seleccion | null;
}

@Component({
    selector: 'roles-word-export-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatCheckboxModule,
        MatFormFieldModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatRadioModule,
        MatSelectModule,
        MatTooltipModule,
    ],
    template: `
        <div class="flex flex-col w-full max-h-[90vh] overflow-hidden bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300">

            <!-- Encabezado -->
            <div class="flex-none flex items-center justify-between border-b px-6 py-4 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <div class="min-w-0">
                    <div class="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <div class="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                            <mat-icon class="icon-size-5" svgIcon="heroicons_outline:arrow-down-tray"></mat-icon>
                        </div>
                        <span class="truncate">Descargar Autorizaciones y Permisos en Word</span>
                    </div>
                    <div class="mt-0.5 ml-10 text-xs text-slate-500 dark:text-slate-400">
                        Genera un documento editable en Microsoft Word (.docx) con derechos de acceso y privilegios por módulo.
                    </div>
                </div>
                <button mat-icon-button type="button" (click)="cerrar()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Cerrar">
                    <mat-icon svgIcon="heroicons_outline:x-mark"></mat-icon>
                </button>
            </div>

            <!-- Estado de carga -->
            <div *ngIf="cargando" class="flex-auto flex flex-col items-center justify-center gap-3 p-12 text-slate-400">
                <mat-spinner [diameter]="32"></mat-spinner>
                <span class="text-xs font-medium">Cargando información de módulos y roles…</span>
            </div>

            <!-- Error de carga -->
            <div *ngIf="error && !cargando" class="flex-auto flex flex-col items-center justify-center gap-3 p-8 text-center">
                <mat-icon class="icon-size-8 text-red-500" svgIcon="heroicons_outline:exclamation-triangle"></mat-icon>
                <p class="text-sm font-medium text-red-600 dark:text-red-400">{{ error }}</p>
                <button mat-stroked-button type="button" (click)="cargarDatos()">Reintentar</button>
            </div>

            <!-- Formulario de Configuración -->
            <div *ngIf="!cargando && !error" class="flex-auto min-h-0 overflow-y-auto p-6 flex flex-col gap-5">

                <!-- 1. Alcance del Reporte -->
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        1. Tipo de Documento
                    </label>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label class="flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all"
                               [ngClass]="tipoReporte === 'rol-individual' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-slate-800 dark:text-slate-100 shadow-2xs' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40 text-slate-600 dark:text-slate-400'">
                            <input type="radio" name="tipoReporte" value="rol-individual" [(ngModel)]="tipoReporte" class="mt-0.5 text-blue-600 focus:ring-blue-500">
                            <div class="min-w-0">
                                <div class="text-xs font-bold">Cédula por Rol Individual</div>
                                <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    Detalle completo de autorizaciones, vistas y privilegios de un rol específico.
                                </div>
                            </div>
                        </label>

                        <label class="flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all"
                               [ngClass]="tipoReporte === 'matriz-general' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-slate-800 dark:text-slate-100 shadow-2xs' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40 text-slate-600 dark:text-slate-400'">
                            <input type="radio" name="tipoReporte" value="matriz-general" [(ngModel)]="tipoReporte" class="mt-0.5 text-blue-600 focus:ring-blue-500">
                            <div class="min-w-0">
                                <div class="text-xs font-bold">Matriz General (Todos los Roles)</div>
                                <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    Consolidado institucional con el resumen y catálogo de todos los roles registrados.
                                </div>
                            </div>
                        </label>
                    </div>
                </div>

                <!-- 2. Selección de Rol (Solo si es individual) -->
                <div *ngIf="tipoReporte === 'rol-individual'">
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        2. Rol a Evaluar
                    </label>
                    <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                        <mat-label>Selecciona el rol</mat-label>
                        <mat-select [(ngModel)]="rolIdSeleccionado">
                            <mat-option *ngFor="let r of roles" [value]="r.rolId">
                                {{ r.nombreRol || 'Rol sin nombre' }} (ID #{{ r.rolId }})
                            </mat-option>
                        </mat-select>
                    </mat-form-field>
                </div>

                <!-- 3. Filtro por Módulo -->
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        {{ tipoReporte === 'rol-individual' ? '3' : '2' }}. Filtro por Módulo
                    </label>
                    <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                        <mat-label>Módulo</mat-label>
                        <mat-select [(ngModel)]="moduloIdSeleccionado">
                            <mat-option [value]="null">Todos los módulos (Reporte Integral)</mat-option>
                            <mat-option *ngFor="let m of modulos" [value]="m.id">
                                {{ m.titulo }} ({{ m.vistas.length }} vistas)
                            </mat-option>
                        </mat-select>
                    </mat-form-field>
                </div>

                <!-- 4. Opciones Adicionales -->
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        {{ tipoReporte === 'rol-individual' ? '4' : '3' }}. Opciones del Documento
                    </label>
                    <div class="flex flex-col gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                        <mat-checkbox color="primary" [(ngModel)]="soloConAcceso">
                            <span class="text-xs font-medium text-slate-700 dark:text-slate-300">
                                Mostrar únicamente vistas y pantallas con permisos asignados (Recomendado)
                            </span>
                        </mat-checkbox>
                        <mat-checkbox color="primary" [(ngModel)]="incluirFirmas">
                            <span class="text-xs font-medium text-slate-700 dark:text-slate-300">
                                Incluir bloque de firmas de validación y control interno SGC
                            </span>
                        </mat-checkbox>
                    </div>
                </div>

            </div>

            <!-- Pie / Acciones -->
            <div class="flex-none flex items-center justify-between border-t px-6 py-4 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <span class="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span class="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                    Formato: Documento Microsoft Word (.docx)
                </span>
                <div class="flex items-center gap-2">
                    <button mat-button type="button" (click)="cerrar()" [disabled]="descargando">
                        Cancelar
                    </button>
                    <button mat-flat-button color="primary" type="button" (click)="descargarWord()" [disabled]="cargando || descargando || !puedeDescargar"
                            class="!rounded-xl !px-5 font-bold shadow-xs">
                        <mat-icon *ngIf="!descargando" class="icon-size-4 mr-1.5" svgIcon="heroicons_outline:arrow-down-tray"></mat-icon>
                        <mat-spinner *ngIf="descargando" [diameter]="18" class="mr-2 inline-block"></mat-spinner>
                        <span>{{ descargando ? 'Generando Word…' : 'Descargar Word' }}</span>
                    </button>
                </div>
            </div>

        </div>
    `
})
export class RolesWordExportDialogComponent implements OnInit {

    tipoReporte: 'rol-individual' | 'matriz-general' = 'rol-individual';
    rolIdSeleccionado: number | null = null;
    moduloIdSeleccionado: string | null = null;
    soloConAcceso = true;
    incluirFirmas = true;

    roles: any[] = [];
    modulos: ModuloRol[] = [];
    catalogo: PermisoCatalogo[] = [];

    cargando = true;
    descargando = false;
    error: string | null = null;

    constructor(
        public dialogRef: MatDialogRef<RolesWordExportDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: DialogDataRolesWord,
        private _rolService: RolService,
        private _rolesWordExportService: RolesWordExportService,
        private _cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.cargarDatos();
    }

    cargarDatos(): void {
        this.cargando = true;
        this.error = null;

        forkJoin({
            roles: this._rolService.roles$.pipe(take(1)),
            catalogo: this._rolService.getCatalogoPermisos().pipe(take(1)),
            nav: this._rolService.getNavigation().pipe(
                take(1),
                catchError(() => of(defaultNavigation))
            )
        }).subscribe({
            next: ({ roles, catalogo, nav }) => {
                this.roles = (roles ?? []).filter((r) => r.rolId !== 0);
                this.catalogo = catalogo ?? [];
                const rawNav: any = nav;
                const navigationData: FuseNavigationItem[] = Array.isArray(rawNav)
                    ? rawNav
                    : (rawNav?.default || defaultNavigation);
                this.modulos = construirModulos(navigationData);

                if (this.data?.rolSeleccionadoId && this.roles.some((r) => r.rolId === Number(this.data.rolSeleccionadoId))) {
                    this.rolIdSeleccionado = Number(this.data.rolSeleccionadoId);
                } else if (this.roles.length > 0) {
                    this.rolIdSeleccionado = this.roles[0].rolId;
                }

                this.cargando = false;
                this._cdr.markForCheck();
            },
            error: (err) => {
                console.error('[RolesWordExportDialog] Error al cargar datos:', err);
                this.error = 'No se pudieron cargar los datos necesarios para generar el documento Word.';
                this.cargando = false;
                this._cdr.markForCheck();
            }
        });
    }

    get puedeDescargar(): boolean {
        if (this.tipoReporte === 'rol-individual') {
            return this.rolIdSeleccionado !== null;
        }
        return this.roles.length > 0;
    }

    async descargarWord(): Promise<void> {
        if (!this.puedeDescargar) return;

        this.descargando = true;
        this._cdr.markForCheck();

        try {
            if (this.tipoReporte === 'rol-individual') {
                const rol = this.roles.find((r) => r.rolId === this.rolIdSeleccionado);
                if (!rol) {
                    throw new Error('Rol no encontrado');
                }

                const seleccionOverride = (this.data?.rolSeleccionadoId === this.rolIdSeleccionado && this.data?.seleccionActual)
                    ? this.data.seleccionActual
                    : undefined;

                await this._rolesWordExportService.exportarRolWord(
                    rol,
                    this.modulos,
                    this.catalogo,
                    {
                        soloConAcceso: this.soloConAcceso,
                        moduloId: this.moduloIdSeleccionado,
                        seleccionOverride,
                        incluirFirmas: this.incluirFirmas
                    }
                );
            } else {
                await this._rolesWordExportService.exportarMatrizTodosRolesWord(
                    this.roles,
                    this.modulos,
                    this.catalogo,
                    {
                        soloConAcceso: this.soloConAcceso,
                        moduloId: this.moduloIdSeleccionado,
                        incluirFirmas: this.incluirFirmas
                    }
                );
            }

            this.descargando = false;
            this.dialogRef.close();

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Documento Word (.docx) descargado exitosamente',
                showConfirmButton: false,
                timer: 3000
            });
        } catch (err) {
            console.error('Error generando documento Word:', err);
            this.descargando = false;
            this._cdr.markForCheck();
            Swal.fire('Error', 'Ocurrió un error al generar el documento Word.', 'error');
        }
    }

    cerrar(): void {
        this.dialogRef.close();
    }
}

