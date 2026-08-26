import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from 'environments/environment';
import {
    ConfigNotificacionService,
    ConfigNotificacionDto,
    GuardarConfigNotificacionDto,
    ContextoDescripcionDto
} from './config-notificacion.service';

interface UsuarioBasico {
    usuarioId: number;
    nombreUsuario: string;
    email?: string;
    telefono?: string;
}

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'ctxNombre', standalone: true, pure: true })
export class CtxNombrePipe implements PipeTransform {
    transform(clave: string, catalogo: ContextoDescripcionDto[]): string {
        return catalogo.find(c => c.clave === clave)?.nombre ?? clave;
    }
}

@Component({
    selector: 'app-notificaciones-config',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatButtonModule, MatIconModule, MatSlideToggleModule,
        MatTooltipModule, MatSnackBarModule, MatProgressSpinnerModule,
        CtxNombrePipe
    ],
    template: `
<div class="w-full min-h-screen bg-gray-50 p-4 sm:p-6 space-y-6 font-sans">
    
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between px-2">
        <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm">
                <mat-icon class="icon-size-6">notifications_active</mat-icon>
            </div>
            <div>
                <h1 class="text-2xl font-bold text-gray-900 leading-tight">Configuración de Notificaciones</h1>
                <p class="text-sm text-gray-500 font-medium">Controla qué usuarios y por qué canales reciben las notificaciones y aprobaciones.</p>
            </div>
        </div>
        <div class="mt-4 sm:mt-0 bg-white border border-gray-200 rounded-xl px-4 py-2 text-right shadow-sm">
            <span class="block text-xl font-bold text-blue-600 leading-none">{{ totalConfigs() }}</span>
            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reglas Activas</span>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        <aside class="lg:col-span-4 bg-white border border-gray-150 rounded-xl shadow-sm p-4">
            <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-2">Módulos del Sistema</p>
            <div class="space-y-1">
                <div *ngFor="let ctx of catalogo()" 
                     class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border"
                     [ngClass]="{'bg-blue-50/50 border-blue-300': contextoActivo() === ctx.clave, 'border-transparent hover:bg-gray-50': contextoActivo() !== ctx.clave}"
                     (click)="seleccionarContexto(ctx)">
                    
                    <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                         [class.bg-blue-100]="contextoActivo() === ctx.clave"
                         [class.bg-gray-100]="contextoActivo() !== ctx.clave"
                         [class.text-blue-600]="contextoActivo() === ctx.clave"
                         [class.text-gray-500]="contextoActivo() !== ctx.clave">
                        <mat-icon class="icon-size-5">{{ getContextoIcon(ctx.clave) }}</mat-icon>
                    </div>
                    
                    <div class="flex-1 min-w-0">
                        <span class="block text-sm font-semibold text-gray-800 truncate"
                              [class.text-blue-700]="contextoActivo() === ctx.clave">
                            {{ ctx.nombre }}
                        </span>
                        <span class="block text-xs text-gray-400 mt-0.5">
                            {{ contarPorContexto(ctx.clave) }} destinatario(s)
                        </span>
                    </div>
                    
                    <div class="flex flex-col gap-1 items-end flex-shrink-0">
                        <span *ngIf="ctx.tieneAprobacion" class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">Aprobar</span>
                        <span *ngIf="ctx.tieneAdmin" class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">Admin</span>
                    </div>
                </div>
            </div>
        </aside>

        <main class="lg:col-span-8 bg-white border border-gray-150 rounded-xl shadow-sm p-6 min-h-[400px]">
            
            <div *ngIf="!contextoActivo()" class="flex flex-col items-center justify-center h-[350px] text-center space-y-4">
                <div class="p-4 bg-slate-50 rounded-full text-slate-400">
                    <mat-icon class="icon-size-12">touch_app</mat-icon>
                </div>
                <h2 class="text-base font-bold text-gray-700">Selecciona un módulo</h2>
                <p class="text-sm text-gray-400 max-w-xs">Elige un módulo del panel izquierdo para ver y gestionar su configuración de destinatarios.</p>
            </div>

            <div *ngIf="contextoActivo()">
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-gray-100 pb-5 mb-5">
                    <div>
                        <div class="flex items-center gap-2">
                            <mat-icon class="text-blue-600 icon-size-6">{{ getContextoIcon(contextoActivo()!) }}</mat-icon>
                            <h2 class="text-lg font-bold text-gray-900">{{ contextoActivo()! | ctxNombre:catalogo() }}</h2>
                        </div>
                        <p class="text-xs text-gray-500 mt-1 max-w-xl">{{ contextoDesc() }}</p>
                    </div>
                    <button class="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-all text-xs font-semibold"
                            (click)="mostrarAgregarUsuario = !mostrarAgregarUsuario">
                        <mat-icon class="icon-size-4">{{ mostrarAgregarUsuario ? 'close' : 'person_add' }}</mat-icon>
                        {{ mostrarAgregarUsuario ? 'Cancelar' : 'Agregar Usuario' }}
                    </button>
                </div>

                <div *ngIf="mostrarAgregarUsuario" class="bg-gray-50/50 border border-gray-200 rounded-xl p-4 mb-6">
                    <p class="text-xs font-bold text-gray-600 mb-3">Añadir usuario a este módulo:</p>
                    <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                        <select class="flex-1 bg-white border border-gray-300 text-gray-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                [(ngModel)]="nuevoUsuarioId">
                            <option value="">— Seleccionar usuario —</option>
                            <option *ngFor="let u of usuariosDisponibles()" [value]="u.usuarioId">
                                {{ u.nombreUsuario }} {{ u.email ? '(' + u.email + ')' : '' }}
                            </option>
                        </select>
                        <button class="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5"
                                (click)="agregarUsuario()" [disabled]="!nuevoUsuarioId || guardando()">
                            <mat-spinner *ngIf="guardando()" diameter="16" color="primary"></mat-spinner>
                            <mat-icon *ngIf="!guardando()" class="icon-size-4">add</mat-icon> Confirmar
                        </button>
                    </div>
                </div>

                <div *ngIf="cargando()" class="flex flex-col items-center justify-center h-[200px] text-gray-400">
                    <mat-spinner diameter="32"></mat-spinner>
                    <p class="text-xs mt-3">Cargando destinatarios...</p>
                </div>

                <div *ngIf="!cargando() && configsActivas().length === 0" class="flex flex-col items-center justify-center h-[200px] text-center border-2 border-dashed border-gray-200 rounded-xl">
                    <mat-icon class="text-gray-300 icon-size-8 mb-2">person_off</mat-icon>
                    <p class="text-xs font-bold text-gray-500">No hay destinatarios asignados</p>
                    <p class="text-[11px] text-gray-400 mt-1">Haz clic en "Agregar Usuario" para configurar el primero.</p>
                </div>

                <div *ngIf="!cargando() && configsActivas().length > 0" class="overflow-x-auto border border-gray-150 rounded-xl">
                    <table class="w-full text-sm text-left border-collapse">
                        <thead class="bg-gray-50 border-b">
                            <tr>
                                <th class="p-3 font-bold text-gray-600 text-xs">Usuario</th>
                                <th class="p-3 text-center font-bold text-gray-600 text-xs">📧 Email</th>
                                <th class="p-3 text-center font-bold text-gray-600 text-xs">📱 WhatsApp</th>
                                <th class="p-3 text-center font-bold text-gray-600 text-xs">🔔 App</th>
                                <th *ngIf="contextoTieneAprobacion()" class="p-3 text-center font-bold text-gray-600 text-xs text-amber-700">Aprobar</th>
                                <th *ngIf="contextoTieneAdmin()" class="p-3 text-center font-bold text-gray-600 text-xs text-purple-700">Admin</th>
                                <th class="p-3 w-16"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr *ngFor="let cfg of configsActivas()" class="border-b last:border-0 hover:bg-gray-50/50 transition-colors"
                                [class.opacity-60]="!cfg.activo">
                                <td class="p-3">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">
                                            {{ cfg.nombreUsuario[0].toUpperCase() }}
                                        </div>
                                        <div>
                                            <span class="block font-semibold text-gray-800">{{ cfg.nombreUsuario }}</span>
                                            <span class="block text-[10px] text-gray-400 font-medium">{{ cfg.email ?? 'Sin correo' }}</span>
                                            <span *ngIf="cfg.telefono" class="block text-[10px] text-emerald-600 font-bold mt-0.5">🟢 {{ cfg.telefono }}</span>
                                        </div>
                                    </div>
                                </td>
                                <td class="p-3 text-center">
                                    <mat-slide-toggle [checked]="cfg.recibeEmail"
                                                      (change)="actualizarCanal(cfg, 'recibeEmail', $event.checked)"
                                                      color="primary">
                                    </mat-slide-toggle>
                                </td>
                                <td class="p-3 text-center">
                                    <mat-slide-toggle [checked]="cfg.recibeWhatsApp"
                                                      [disabled]="!cfg.telefono"
                                                      [matTooltip]="!cfg.telefono ? 'El usuario no cuenta con un teléfono registrado' : ''"
                                                      (change)="actualizarCanal(cfg, 'recibeWhatsApp', $event.checked)"
                                                      color="accent">
                                    </mat-slide-toggle>
                                </td>
                                <td class="p-3 text-center">
                                    <mat-slide-toggle [checked]="cfg.recibeInApp"
                                                      (change)="actualizarCanal(cfg, 'recibeInApp', $event.checked)"
                                                      color="warn">
                                    </mat-slide-toggle>
                                </td>
                                <td *ngIf="contextoTieneAprobacion()" class="p-3 text-center">
                                    <mat-slide-toggle [checked]="cfg.puedeAprobar"
                                                      (change)="actualizarCanal(cfg, 'puedeAprobar', $event.checked)"
                                                      color="primary">
                                    </mat-slide-toggle>
                                </td>
                                <td *ngIf="contextoTieneAdmin()" class="p-3 text-center">
                                    <mat-slide-toggle [checked]="cfg.esAdmin"
                                                      (change)="actualizarCanal(cfg, 'esAdmin', $event.checked)"
                                                      color="primary">
                                    </mat-slide-toggle>
                                </td>
                                <td class="p-3 text-center">
                                    <button class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            matTooltip="Quitar usuario"
                                            (click)="eliminar(cfg)">
                                        <mat-icon class="icon-size-5">person_remove</mat-icon>
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    </div>
</div>
    `
})
export class NotificacionesConfigComponent implements OnInit {
    private svc = inject(ConfigNotificacionService);
    private http = inject(HttpClient);
    private snack = inject(MatSnackBar);

    catalogo = signal<ContextoDescripcionDto[]>([]);
    todas = signal<ConfigNotificacionDto[]>([]);
    todosUsuarios = signal<UsuarioBasico[]>([]);
    contextoActivo = signal<string | null>(null);
    cargando = signal(false);
    guardando = signal(false);
    mostrarAgregarUsuario = false;
    nuevoUsuarioId: string = '';

    totalConfigs = computed(() => this.todas().filter(c => c.activo).length);

    configsActivas = computed(() =>
        this.todas().filter(c => c.contexto === this.contextoActivo())
    );

    contextoDescActual = computed(() =>
        this.catalogo().find(c => c.clave === this.contextoActivo())
    );

    contextoDesc = computed(() => this.contextoDescActual()?.descripcion ?? '');

    contextoTieneAprobacion = computed(() =>
        this.contextoDescActual()?.tieneAprobacion ?? false
    );

    contextoTieneAdmin = computed(() =>
        this.contextoDescActual()?.tieneAdmin ?? false
    );

    usuariosDisponibles = computed(() => {
        const yaConfigurados = new Set(this.configsActivas().map(c => c.usuarioId));
        return this.todosUsuarios().filter(u => !yaConfigurados.has(u.usuarioId));
    });

    ngOnInit(): void {
        this.cargarCatalogo();
        this.cargarTodas();
        this.cargarUsuarios();
    }

    cargarCatalogo(): void {
        this.svc.obtenerCatalogo().subscribe({
            next: cat => this.catalogo.set(cat),
            error: () => this.mostrarError('Error al cargar catálogo de contextos')
        });
    }

    cargarTodas(): void {
        this.cargando.set(true);
        this.svc.obtenerTodas().subscribe({
            next: all => { this.todas.set(all); this.cargando.set(false); },
            error: () => { this.cargando.set(false); this.mostrarError('Error al cargar configuraciones'); }
        });
    }

    cargarUsuarios(): void {
        this.http.get<any>(`${environment.apiUrl}/Tickets/usuarios-asignacion`).subscribe({
            next: res => {
                const list = res.data || [];
                this.todosUsuarios.set(list.map((u: any) => ({
                    usuarioId: u.usuarioId,
                    nombreUsuario: u.nombreUsuario,
                    email: u.email,
                    telefono: u.telefono
                })));
            },
            error: () => console.warn('No se pudieron cargar usuarios')
        });
    }

    seleccionarContexto(ctx: ContextoDescripcionDto): void {
        this.contextoActivo.set(ctx.clave);
        this.mostrarAgregarUsuario = false;
        this.nuevoUsuarioId = '';
    }

    contarPorContexto(clave: string): number {
        return this.todas().filter(c => c.contexto === clave && c.activo).length;
    }

    agregarUsuario(): void {
        if (!this.nuevoUsuarioId || !this.contextoActivo()) return;

        const usuario = this.todosUsuarios().find(u => u.usuarioId === +this.nuevoUsuarioId);
        if (!usuario) return;

        const dto: GuardarConfigNotificacionDto = {
            contexto: this.contextoActivo()!,
            usuarioId: +this.nuevoUsuarioId,
            recibeEmail: true,
            recibeWhatsApp: false,
            recibeInApp: true,
            puedeAprobar: false,
            esAdmin: false,
            activo: true
        };

        this.guardando.set(true);
        this.svc.guardar(dto).subscribe({
            next: nueva => {
                this.todas.update(all => [...all, nueva]);
                this.nuevoUsuarioId = '';
                this.mostrarAgregarUsuario = false;
                this.guardando.set(false);
                this.mostrarExito(`✅ ${usuario.nombreUsuario} agregado correctamente`);
            },
            error: () => { this.guardando.set(false); this.mostrarError('Error al agregar usuario'); }
        });
    }

    actualizarCanal(cfg: ConfigNotificacionDto, campo: keyof GuardarConfigNotificacionDto, valor: boolean): void {
        const dto: GuardarConfigNotificacionDto = {
            contexto: cfg.contexto,
            usuarioId: cfg.usuarioId,
            recibeEmail: cfg.recibeEmail,
            recibeWhatsApp: cfg.recibeWhatsApp,
            recibeInApp: cfg.recibeInApp,
            puedeAprobar: cfg.puedeAprobar,
            esAdmin: cfg.esAdmin,
            activo: cfg.activo,
            [campo]: valor
        };

        this.svc.guardar(dto).subscribe({
            next: actualizada => {
                this.todas.update(all => all.map(c => c.id === actualizada.id ? actualizada : c));
            },
            error: () => this.mostrarError('Error al actualizar configuración')
        });
    }

    eliminar(cfg: ConfigNotificacionDto): void {
        if (!confirm(`¿Quitar a ${cfg.nombreUsuario} de este módulo?`)) return;

        this.svc.eliminar(cfg.id).subscribe({
            next: () => {
                this.todas.update(all => all.filter(c => c.id !== cfg.id));
                this.mostrarExito(`🗑️ ${cfg.nombreUsuario} eliminado`);
            },
            error: () => this.mostrarError('Error al eliminar configuración')
        });
    }

    getContextoIcon(clave: string): string {
        const icons: Record<string, string> = {
            'FacturasVencimiento':          'receipt_long',
            'Tickets.Aprobacion':           'confirmation_number',
            'Tareas.AdminGlobal':           'task_alt',
            'Tareas.AdminIngenieria':       'engineering',
            'SolicitudesCompra.Aprobacion': 'shopping_cart',
            'Subcontratacion.Notificacion': 'handshake',
        };
        return icons[clave] ?? 'notifications';
    }

    private mostrarError(msg: string): void {
        this.snack.open(msg, 'Cerrar', { duration: 4000, panelClass: ['snack-error'] });
    }

    private mostrarExito(msg: string): void {
        this.snack.open(msg, 'Cerrar', { duration: 3000, panelClass: ['snack-success'] });
    }
}
