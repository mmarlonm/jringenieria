import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, take } from 'rxjs';
import Swal from 'sweetalert2';
import { RolService } from '../roles.service';
import {
    ModoAsignacion, ModuloRol, PedidoMasivo, PermisoCatalogo, VistaRol, construirModulos, construirPedidoMasivo,
    permisosParaAsignacionMasiva, tienePermisosPropios
} from '../roles-permisos.utils';

/** Da o quita los permisos de un módulo a varios roles a la vez. */
@Component({
    selector: 'roles-asignacion-masiva-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatProgressSpinnerModule, MatSelectModule, MatTooltipModule],
    template: `
        <div class="flex flex-col w-full max-h-[90vh] overflow-hidden bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300">

            <!-- Encabezado -->
            <div class="flex-none flex items-center justify-between border-b px-6 py-4 bg-slate-50 dark:bg-slate-900">
                <div class="min-w-0">
                    <div class="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <mat-icon class="text-primary icon-size-5" svgIcon="heroicons_outline:users"></mat-icon>
                        <span class="truncate">Asignar permisos a varios roles</span>
                    </div>
                    <div class="mt-0.5 ml-7 text-xs text-slate-500">Elige un módulo y los permisos, y aplícalos a todos los roles que marques de una vez.</div>
                </div>
                <button mat-icon-button type="button" (click)="cerrar()" class="text-slate-400 hover:text-slate-600" aria-label="Cerrar">
                    <mat-icon>close</mat-icon>
                </button>
            </div>

            <div *ngIf="cargando" class="flex-auto flex flex-col items-center justify-center gap-3 p-16 text-slate-400">
                <mat-spinner [diameter]="32"></mat-spinner>
                <span class="text-sm">Cargando módulos y roles…</span>
            </div>

            <div *ngIf="error" class="flex-auto flex flex-col items-center justify-center gap-3 p-12 text-center">
                <mat-icon class="icon-size-8 text-red-400" svgIcon="heroicons_outline:exclamation-triangle"></mat-icon>
                <p class="text-sm font-medium text-red-600">{{ error }}</p>
                <button mat-stroked-button type="button" (click)="cargar()">Reintentar</button>
            </div>

            <!-- Contenido -->
            <div *ngIf="!cargando && !error" class="flex-auto min-h-0 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 content-start">

                <!-- 1. Qué permisos -->
                <div class="flex flex-col gap-4">
                    <h3 class="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span class="w-6 h-6 rounded-full bg-primary text-on-primary text-xs flex items-center justify-center">1</span>
                        ¿Qué permisos?
                    </h3>

                    <div class="inline-flex self-start rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-900">
                        <button type="button" (click)="cambiarModo('agregar')" class="px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                                [ngClass]="modo === 'agregar' ? 'bg-white dark:bg-slate-800 shadow text-emerald-700' : 'text-slate-500'">Agregar permisos</button>
                        <button type="button" (click)="cambiarModo('quitar')" class="px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                                [ngClass]="modo === 'quitar' ? 'bg-white dark:bg-slate-800 shadow text-red-600' : 'text-slate-500'">Quitar permisos</button>
                    </div>

                    <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                        <mat-label>Módulo</mat-label>
                        <mat-select [ngModel]="moduloId" (ngModelChange)="elegirModulo($event)">
                            <mat-option *ngFor="let m of modulos" [value]="m.id">{{ m.titulo }} ({{ m.vistas.length }})</mat-option>
                        </mat-select>
                    </mat-form-field>

                    <ng-container *ngIf="moduloActual as m">
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Vistas ({{ vistasElegidas.length }} de {{ m.vistas.length }})</span>
                                <span class="text-xs">
                                    <button type="button" class="text-primary font-semibold hover:underline" (click)="marcarVistas(true)">Todas</button>
                                    <span class="text-slate-300 mx-1">·</span>
                                    <button type="button" class="text-primary font-semibold hover:underline" (click)="marcarVistas(false)">Ninguna</button>
                                </span>
                            </div>
                            <div class="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                                <label *ngFor="let v of m.vistas" class="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <mat-checkbox color="primary" [checked]="vistasMarcadas.has(v.id)" (change)="alternarVista(v)"></mat-checkbox>
                                    <div class="min-w-0 flex-auto">
                                        <div class="text-sm font-medium truncate">{{ v.titulo }}</div>
                                        <div *ngIf="v.grupo" class="text-[11px] text-slate-400 truncate">{{ v.grupo }}</div>
                                    </div>
                                    <span *ngIf="tienePropios(v)" class="shrink-0 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold"
                                          matTooltip="Esta vista tiene permisos propios; aquí solo se puede dar o quitar «Ver».">Solo «Ver»</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-xs font-bold uppercase tracking-wider text-slate-500">{{ modo === 'agregar' ? 'Permisos a dar' : 'Permisos a quitar' }}</span>
                                <span class="text-xs">
                                    <button type="button" class="text-primary font-semibold hover:underline" (click)="soloVer()">Solo ver</button>
                                    <span class="text-slate-300 mx-1">·</span>
                                    <button type="button" class="text-primary font-semibold hover:underline" (click)="marcarPermisos(true)">Todos</button>
                                    <span class="text-slate-300 mx-1">·</span>
                                    <button type="button" class="text-primary font-semibold hover:underline" (click)="marcarPermisos(false)">Ninguno</button>
                                </span>
                            </div>

                            <label *ngIf="modo === 'quitar'" class="flex items-center gap-2 mb-3 text-sm font-medium text-red-600 cursor-pointer">
                                <mat-checkbox color="warn" [(ngModel)]="quitarTodo"></mat-checkbox>
                                Quitar todo el acceso a estas vistas
                            </label>

                            <div class="flex flex-wrap gap-1.5" [class.opacity-40]="quitarTodo" [class.pointer-events-none]="quitarTodo">
                                <button *ngFor="let p of permisosOfrecidos" type="button" (click)="alternarPermiso(p)" [attr.aria-pressed]="permisosMarcados.has(p.permisoId)"
                                        class="px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors"
                                        [ngClass]="permisosMarcados.has(p.permisoId)
                                            ? (modo === 'agregar' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-red-600 border-red-600 text-white')
                                            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500 hover:border-primary hover:text-primary'">
                                    {{ p.descripcionPermiso }}
                                </button>
                            </div>
                        </div>
                    </ng-container>
                </div>

                <!-- 2. A qué roles -->
                <div class="flex flex-col gap-4">
                    <h3 class="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span class="w-6 h-6 rounded-full bg-primary text-on-primary text-xs flex items-center justify-center">2</span>
                        ¿A qué roles?
                        <span class="ml-auto px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold normal-case tracking-normal">{{ rolesMarcados.size }} de {{ roles.length }}</span>
                    </h3>

                    <div class="relative">
                        <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 icon-size-5 text-slate-400" svgIcon="heroicons_outline:magnifying-glass"></mat-icon>
                        <input type="text" [(ngModel)]="busquedaRoles" placeholder="Buscar rol…" autocomplete="off"
                               class="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                    </div>

                    <div class="flex items-center justify-between text-xs">
                        <span class="text-slate-500">{{ rolesFiltrados.length }} {{ rolesFiltrados.length === 1 ? 'rol' : 'roles' }}</span>
                        <span>
                            <button type="button" class="text-primary font-semibold hover:underline" (click)="marcarRoles(true)">Marcar todos</button>
                            <span class="text-slate-300 mx-1">·</span>
                            <button type="button" class="text-primary font-semibold hover:underline" (click)="marcarRoles(false)">Ninguno</button>
                        </span>
                    </div>

                    <div class="max-h-[26rem] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                        <label *ngFor="let r of rolesFiltrados" class="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                               [ngClass]="rolesMarcados.has(r.rolId) ? 'bg-primary/5' : ''">
                            <mat-checkbox color="primary" [checked]="rolesMarcados.has(r.rolId)" (change)="alternarRol(r.rolId)"></mat-checkbox>
                            <mat-icon class="icon-size-4 text-slate-400" svgIcon="heroicons_outline:user-group"></mat-icon>
                            <span class="min-w-0 flex-auto text-sm font-medium truncate">{{ r.nombreRol }}</span>
                            <span class="shrink-0 text-xs text-slate-400">{{ (r.vistas?.length || 0) }} {{ (r.vistas?.length || 0) === 1 ? 'vista' : 'vistas' }}</span>
                        </label>
                        <div *ngIf="rolesFiltrados.length === 0" class="p-6 text-center text-sm text-slate-400">Ningún rol coincide.</div>
                    </div>
                </div>
            </div>

            <!-- Resumen y acciones -->
            <div class="flex-none flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4 bg-slate-50 dark:bg-slate-900">
                <p class="min-w-0 flex-1 text-sm" [ngClass]="puedeAplicar ? 'text-slate-700 dark:text-slate-200 font-medium' : 'text-slate-400'">{{ resumen }}</p>
                <div class="flex items-center gap-2">
                    <button mat-button type="button" (click)="cerrar()" [disabled]="guardando">Cancelar</button>
                    <button mat-flat-button type="button" [color]="modo === 'quitar' ? 'warn' : 'primary'" (click)="aplicar()" [disabled]="!puedeAplicar">
                        {{ guardando ? 'Aplicando…' : (modo === 'agregar' ? 'Dar permisos' : 'Quitar permisos') }}
                    </button>
                </div>
            </div>
        </div>
    `,
})
export class RolesAsignacionMasivaDialogComponent implements OnInit {
    private _rolService = inject(RolService);
    private _cdr = inject(ChangeDetectorRef);
    private _dialogRef = inject<MatDialogRef<RolesAsignacionMasivaDialogComponent>>(MatDialogRef);

    cargando = true;
    error: string | null = null;
    guardando = false;

    modulos: ModuloRol[] = [];
    catalogo: PermisoCatalogo[] = [];
    roles: any[] = [];

    modo: ModoAsignacion = 'agregar';
    moduloId: string | null = null;
    vistasMarcadas = new Set<string>();
    permisosMarcados = new Set<number>();
    quitarTodo = false;
    rolesMarcados = new Set<number>();
    busquedaRoles = '';

    ngOnInit(): void {
        this.cargar();
    }

    cargar(): void {
        this.cargando = true;
        this.error = null;
        forkJoin({
            menu: this._rolService.getNavigation(),
            catalogo: this._rolService.getCatalogoPermisos(),
            roles: this._rolService.roles$.pipe(take(1)),
        }).subscribe({
            next: ({ menu, catalogo, roles }) => {
                this.modulos = construirModulos((menu as any)?.default || (menu as any) || []);
                this.catalogo = catalogo;
                this.roles = (roles ?? []).filter(r => r.rolId !== 0);
                this.cargando = false;
                if (this.modulos.length > 0) this.elegirModulo(this.modulos[0].id);
                this._cdr.markForCheck();
            },
            error: () => {
                this.cargando = false;
                this.error = 'No se pudieron cargar los módulos o los roles. Revisa tu conexión e inténtalo de nuevo.';
                this._cdr.markForCheck();
            },
        });
    }

    // ------------------------------------------------------------------ lo que se muestra

    get moduloActual(): ModuloRol | undefined {
        return this.modulos.find(m => m.id === this.moduloId);
    }

    get vistasElegidas(): VistaRol[] {
        return (this.moduloActual?.vistas ?? []).filter(v => this.vistasMarcadas.has(v.id));
    }

    get permisosOfrecidos(): PermisoCatalogo[] {
        return permisosParaAsignacionMasiva(this.moduloActual?.vistas ?? [], this.catalogo);
    }

    get rolesFiltrados(): any[] {
        const q = this.sinAcentos(this.busquedaRoles);
        return q ? this.roles.filter(r => this.sinAcentos(r.nombreRol || '').includes(q)) : this.roles;
    }

    get pedido(): PedidoMasivo {
        return construirPedidoMasivo(this.modo, [...this.rolesMarcados], this.vistasElegidas, [...this.permisosMarcados], this.quitarTodo, this.catalogo);
    }

    get puedeAplicar(): boolean {
        const p = this.pedido;
        return !this.guardando && p.rolIds.length > 0 && p.vistas.length > 0;
    }

    get resumen(): string {
        const p = this.pedido;
        const modulo = this.moduloActual?.titulo ?? '';
        if (this.rolesMarcados.size === 0) return 'Marca al menos un rol.';
        if (this.vistasElegidas.length === 0) return 'Marca al menos una vista.';
        if (p.vistas.length === 0) return 'Elige al menos un permiso.';

        const vistas = `${p.vistas.length} ${p.vistas.length === 1 ? 'vista' : 'vistas'} de «${modulo}»`;
        const roles = `${p.rolIds.length} ${p.rolIds.length === 1 ? 'rol' : 'roles'}`;
        if (this.modo === 'quitar' && this.quitarTodo) return `Se quitará todo el acceso a ${vistas} en ${roles}.`;

        const nombres = this.catalogo.filter(c => this.permisosMarcados.has(c.permisoId)).map(c => c.descripcionPermiso).join(', ');
        return `Se ${this.modo === 'agregar' ? 'darán' : 'quitarán'} los permisos ${nombres} en ${vistas} a ${roles}.`;
    }

    tienePropios(v: VistaRol): boolean {
        return tienePermisosPropios(v.id);
    }

    // ------------------------------------------------------------------ cambios

    cambiarModo(modo: ModoAsignacion): void {
        this.modo = modo;
        this.quitarTodo = false;
    }

    elegirModulo(id: string): void {
        this.moduloId = id;
        this.vistasMarcadas = new Set(this.moduloActual?.vistas.map(v => v.id) ?? []);
        this.permisosMarcados = new Set(this.permisosOfrecidos.filter(p => p.permisoId === 1).map(p => p.permisoId));
    }

    marcarVistas(todas: boolean): void {
        this.vistasMarcadas = new Set(todas ? (this.moduloActual?.vistas.map(v => v.id) ?? []) : []);
    }

    alternarVista(v: VistaRol): void {
        const nuevo = new Set(this.vistasMarcadas);
        if (!nuevo.delete(v.id)) nuevo.add(v.id);
        this.vistasMarcadas = nuevo;
    }

    alternarPermiso(p: PermisoCatalogo): void {
        const nuevo = new Set(this.permisosMarcados);
        if (!nuevo.delete(p.permisoId)) nuevo.add(p.permisoId);
        this.permisosMarcados = nuevo;
    }

    soloVer(): void {
        this.permisosMarcados = new Set(this.permisosOfrecidos.filter(p => p.permisoId === 1).map(p => p.permisoId));
    }

    marcarPermisos(todos: boolean): void {
        this.permisosMarcados = new Set(todos ? this.permisosOfrecidos.map(p => p.permisoId) : []);
    }

    alternarRol(rolId: number): void {
        const nuevo = new Set(this.rolesMarcados);
        if (!nuevo.delete(rolId)) nuevo.add(rolId);
        this.rolesMarcados = nuevo;
    }

    /** Marca o desmarca los roles que se están viendo (respeta la búsqueda). */
    marcarRoles(todos: boolean): void {
        const nuevo = new Set(this.rolesMarcados);
        for (const r of this.rolesFiltrados) {
            if (todos) nuevo.add(r.rolId);
            else nuevo.delete(r.rolId);
        }
        this.rolesMarcados = nuevo;
    }

    // ------------------------------------------------------------------ aplicar

    async aplicar(): Promise<void> {
        if (!this.puedeAplicar) return;

        if (this.modo === 'quitar') {
            const confirmacion = await Swal.fire({
                icon: 'warning',
                title: '¿Quitar permisos?',
                text: this.resumen,
                showCancelButton: true,
                confirmButtonText: 'Sí, quitar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#dc2626',
            });
            if (!confirmacion.isConfirmed) return;
        }

        this.guardando = true;
        this._rolService.asignarMasivo(this.pedido).subscribe({
            next: (r) => {
                this.guardando = false;
                const hecho = this.modo === 'agregar'
                    ? (r.permisosAgregados > 0 ? `${r.permisosAgregados} permisos dados en ${r.roles} roles.` : 'Los roles ya tenían esos permisos: no hubo cambios.')
                    : (r.permisosQuitados > 0 ? `${r.permisosQuitados} permisos quitados en ${r.roles} roles.` : 'Los roles no tenían esos permisos: no hubo cambios.');
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: hecho, showConfirmButton: false, timer: 3500 });
                this._dialogRef.close(true);
            },
            error: (err) => {
                this.guardando = false;
                const mensaje = err?.error?.mensaje || (typeof err?.error === 'string' && err.error) || (err?.status === 403 ? 'No tienes permiso para esta acción.' : 'Inténtalo de nuevo.');
                Swal.fire('No se pudo aplicar', mensaje, 'error');
                this._cdr.markForCheck();
            },
        });
    }

    cerrar(): void {
        this._dialogRef.close(false);
    }

    private sinAcentos(t: string): string {
        return (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    }
}
