import { Component, OnInit, OnDestroy, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ActivitySignalRService, ActivityLog } from 'app/core/signalr/activity-signalr.service';
import { UsersService } from 'app/modules/admin/security/users/users.service';
import { Subject, takeUntil, map } from 'rxjs';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-activity-monitor',
    standalone: true,
    imports: [CommonModule, MatIconModule, MatButtonModule],
    templateUrl: './activity-monitor.component.html',
    styleUrls: ['./activity-monitor.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: [
        trigger('listAnimation', [
            transition('* <=> *', [
                query(':enter', [
                    style({ opacity: 0, transform: 'translateY(-20px)' }),
                    stagger('50ms', animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })))
                ], { optional: true })
            ])
        ])
    ]
})
export class ActivityMonitorComponent implements OnInit, OnDestroy {
    private _activityService = inject(ActivitySignalRService);
    private _usersService = inject(UsersService);
    private _router = inject(Router);
    private _unsubscribeAll = new Subject<void>();
    private _usersMap = new Map<any, any>();

    constructor() {
        this._usersService.getUsers().subscribe(users => {
            users.forEach(u => {
                // Guardar por ID (Máxima precisión)
                if (u.usuarioId) this._usersMap.set(Number(u.usuarioId), u);
                
                // Guardar por Nombre (Respaldo)
                const name = u.nombreUsuario || u.nombre;
                if (name) this._usersMap.set(name.toLowerCase(), u);
            });
            // Cargar historial una vez que tenemos los usuarios
            this.loadInitialHistory();
        });
    }

    /**
     * Redirección directa al módulo
     */
    goToModule(url: string): void {
        if (!url) return;
        const cleanUrl = url.split('?')[0];
        this._router.navigateByUrl(cleanUrl);
    }
    
    public activities: ActivityLog[] = [];
    public stats = {
        total: 0,
        clicks: 0,
        navigation: 0,
        security: 0,
        errors: 0
    };

    ngOnInit(): void {
        // Suscribirse a nuevos eventos en tiempo real
        this._activityService.movimientos$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((movimiento: ActivityLog) => {
                // 🔍 RESOLVER IDENTIDAD ANTES DE AÑADIR
                const resolvedMov = this.resolveUserInfo(movimiento);
                this.activities.unshift(resolvedMov);
                
                if (this.activities.length > 100) this.activities.pop();
                this.updateStats(resolvedMov);
            });
    }

    private loadInitialHistory(): void {
        this._activityService.getRecentLogs().subscribe(response => {
            if (response.success && response.data) {
                this.activities = response.data.map(log => this.resolveUserInfo(log));
                this.stats = { total: 0, clicks: 0, navigation: 0, security: 0, errors: 0 };
                this.activities.forEach(a => this.updateStats(a));
            }
        });
    }

    private resolveUserInfo(activity: any): ActivityLog {
        // 1. Normalizar fecha
        let processedDate = activity.fecha;
        if (typeof activity.fecha === 'string' && activity.fecha.includes(':') && !activity.fecha.includes('-') && !activity.fecha.includes('T')) {
            const today = new Date();
            const [hours, minutes, seconds] = activity.fecha.split(':').map(Number);
            today.setHours(hours || 0, minutes || 0, seconds || 0);
            processedDate = today.toISOString();
        }

        // 2. Normalizar ID (Soporta idUsuario e IdUsuario)
        const id = activity.idUsuario || activity.IdUsuario || 0;
        const nombreRecibido = activity.nombreUsuario || activity.NombreUsuario || activity.usuario || 'Usuario';

        // 3. Búsqueda en Mapa Maestro
        let user = this._usersMap.get(Number(id));
        
        // 4. Búsqueda por Nombre (Respaldo)
        if (!user && nombreRecibido !== 'Usuario') {
            user = this._usersMap.get(nombreRecibido.toLowerCase());
        }
        
        // 5. Búsqueda en Sesión Actual (Garantiza que el usuario vea su propia actividad)
        const storedData = JSON.parse(localStorage.getItem('userInformation') || '{}');
        const currentUser = storedData?.usuario || storedData;
        const currentId = currentUser?.usuarioId || currentUser?.id || currentUser?.Id;

        if (!user && (Number(id) === Number(currentId) || nombreRecibido === currentUser?.nombreUsuario)) {
            user = currentUser;
        }

        // 6. Construir objeto final garantizando el nombre
        return {
            ...activity,
            idUsuario: Number(id),
            nombreUsuario: user?.nombreUsuario || user?.nombre || nombreRecibido,
            avatar: user?.avatar || activity.avatar,
            fecha: processedDate
        };
    }

    ngOnDestroy(): void {
        // La conexión se mantiene global para seguir rastreando
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    private updateStats(activity: ActivityLog): void {
        this.stats.total++;
        if (activity.accion === 'Acceso') {
            this.stats.navigation++;
        } else {
            this.stats.clicks++;
        }
    }

    getIconName(tipo: string): string {
        switch (tipo) {
            case 'Navegacion': return 'heroicons_outline:eye';
            case 'Click': return 'heroicons_outline:cursor-arrow-rays';
            case 'Error': return 'heroicons_outline:bug-report';
            case 'Security': return 'heroicons_outline:shield-check';
            case 'Critical': return 'heroicons_outline:exclamation-triangle';
            default: return 'heroicons_outline:information-circle';
        }
    }

    getUserInitials(name: string): string {
        if (!name) return '??';
        const parts = name.split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    }

    getUserColor(name: string): string {
        if (!name) return '#cbd5e1';
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
        return colors[Math.abs(hash) % colors.length];
    }

    /**
     * Devuelve un nombre de módulo amigable basado en la URL si el original es genérico
     */
    getFriendlyModule(activity: ActivityLog): string {
        const url = activity.urlPath?.toLowerCase() || '';
        const moduloOriginal = activity.modulo || '';

        // Si el módulo es genérico o vacío, intentar resolver por URL
        if (!moduloOriginal || moduloOriginal.includes('JR') || moduloOriginal === 'Sistema') {
            if (url.includes('compras') || url.includes('solicitud')) return 'Compras';
            if (url.includes('seguridad') || url.includes('roles')) return 'Seguridad';
            if (url.includes('usuarios')) return 'Usuarios';
            if (url.includes('monitor')) return 'Monitor Actividad';
            if (url.includes('proyecto')) return 'Proyectos';
            if (url.includes('perfil')) return 'Mi Perfil';
            if (url.includes('inventario')) return 'Inventario';
            if (url.includes('tablero')) return 'Tablero Dashboard';
        }

        return moduloOriginal;
    }

    trackByFn(index: number, item: ActivityLog): string {
        return (item.idLog || index).toString() + item.fecha;
    }

    clearFeed(): void {
        Swal.fire({
            title: '¿Limpiar historial?',
            text: 'Se eliminarán los registros de navegación de los últimos 30 días en el servidor.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, limpiar',
            cancelButtonText: 'Cancelar',
            background: '#0f172a',
            color: '#f1f5f9'
        }).then((result) => {
            if (result.isConfirmed) {
                this._activityService.clearHistoryServer(30).subscribe({
                    next: (res) => {
                        this.activities = [];
                        this.stats = { total: 0, clicks: 0, navigation: 0, security: 0, errors: 0 };
                        Swal.fire({
                            title: '¡Limpiado!',
                            text: res.message || 'El historial se ha limpiado correctamente.',
                            icon: 'success',
                            background: '#0f172a',
                            color: '#f1f5f9'
                        });
                    },
                    error: () => {
                        Swal.fire('Error', 'No se pudo limpiar el historial en el servidor.', 'error');
                    }
                });
            }
        });
    }
}
