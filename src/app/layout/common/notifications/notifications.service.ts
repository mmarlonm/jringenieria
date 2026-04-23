import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Notification } from 'app/layout/common/notifications/notifications.types';
import { environment } from 'environments/environment';
import { map, Observable, ReplaySubject, switchMap, take, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
    private apiUrl = `${environment.apiUrl}/Notificacion`;
    private _notifications: ReplaySubject<Notification[]> = new ReplaySubject<Notification[]>(1);
    private readonly STORAGE_KEY = 'notificacionesHoy';

    constructor(private _httpClient: HttpClient) {
        this._loadFromLocalStorage();
        this._initializeWithCurrentUser();
    }

    private _initializeWithCurrentUser(): void {
        const storedData = JSON.parse(localStorage.getItem('userInformation') || '{}');
        const userId = storedData?.usuario?.id;
        if (userId) {
            this.getPendingNotifications(userId).subscribe();
        }
    }

    get notifications$(): Observable<Notification[]> {
        return this._notifications.asObservable();
    }

    /**
     * Obtiene notificaciones pendientes del nuevo endpoint de Tareas
     */
    getPendingNotifications(userId: number): Observable<Notification[]> {
        return this._httpClient.get<any[]>(`${environment.apiUrl}/Tareas/mis-notificaciones-pendientes/${userId}`).pipe(
            map((data) =>
                data.map((item: any) => ({
                    id: item.id.toString(),
                    icon: item.tipo === 'Chat' ? 'heroicons_outline:chat-bubble-left-right' : 'heroicons_outline:clipboard-list',
                    title: item.titulo || 'Nueva Notificación',
                    description: item.mensaje,
                    time: new Date(item.fechaAccion || item.fecha || new Date()).toISOString(),
                    read: false,
                    view: true,
                    link: `/dashboards/tasks?id=${item.referenciaId}`,
                    useRouter: true,
                    // Guardamos la referenciaId para uso interno si es necesario
                    referenciaId: item.referenciaId,
                    tipo: item.tipo
                } as Notification))
            ),
            tap((fetchedNotifications) => {
                const stored = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]') as Notification[];

                // Unificar con locales (ej. las que vienen de SignalR y aún no están en DB)
                const localOnly = stored.filter(s => s.view && !fetchedNotifications.some(f => f.id === s.id));
                const finalNotifications = [...fetchedNotifications, ...localOnly];

                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(finalNotifications));
                this._notifications.next(finalNotifications.filter(n => n.view));
            })
        );
    }

    /**
     * Marca todas las notificaciones de una referencia específica como leídas (API + Local)
     */
    markReadByReferenciaId(referenciaId: number, tipo: string = 'Chat'): void {
        this.notifications$.pipe(take(1)).subscribe(notifications => {
            const matches = notifications.filter(n => 
                (n.referenciaId === referenciaId && n.tipo === tipo && !n.read) ||
                (n.id.startsWith(`chat-${referenciaId}-`) && !n.read)
            );

            if (matches.length === 0) return;

            // 1. Marcar en el servidor las que tengan ID numérico
            matches.forEach(n => {
                if (!isNaN(Number(n.id))) {
                    this._httpClient.put(`${environment.apiUrl}/Tareas/marcar-notificacion-leida/${n.id}`, {}).subscribe();
                }
            });

            // 2. Actualizar estado local
            const matchesIds = new Set(matches.map(m => m.id));
            const updated = notifications.map(n => 
                matchesIds.has(n.id) ? { ...n, read: true } : n
            );

            this._notifications.next(updated.filter(n => n.view));
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
        });
    }

    /**
     * Marca una notificación como leída en el servidor
     */
    markAsReadApi(id: string): Observable<any> {
        // Si el ID es numérico (viniendo de la DB), llamamos al endpoint
        if (!isNaN(Number(id))) {
            return this._httpClient.put(`${environment.apiUrl}/Tareas/marcar-notificacion-leida/${id}`, {}).pipe(
                switchMap(() => this.update(id, { read: true }))
            );
        }
        // Si es un ID local (ej. chat-...), solo actualizamos localmente
        return this.update(id, { read: true });
    }

    /**
     * Obtiene notificaciones del backend para el día actual y las guarda en localStorage
     */
    getAll(): Observable<Notification[]> {
        // Mantenemos este para compatibilidad si se usa en otro lado, pero podrías unificarlo
        return this._httpClient.get<any[]>(`${this.apiUrl}/hoy`).pipe(
        map((data) =>
            data.map((item: any) => ({
                id: `noti-${item.prospectoId}`,
                icon: 'heroicons_outline:calendar',
                description: item.mensaje,
                title: `Fecha de acción: ${new Date(item.fechaAccion).toLocaleDateString()}`,
                time: new Date(item.fechaAccion).toISOString(),
                read: false,
                view: true,
            } as Notification))
        ),
        map((fetchedNotifications) => {
            const stored = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]') as Notification[];

            // 1. Unificar notificaciones por ID (Prioridad server para contenido, local para estado)
            const merged = fetchedNotifications.map(newNoti => {
                const existing = stored.find(s => s.id === newNoti.id);
                return existing
                    ? {
                        ...newNoti,
                        read: existing.read,
                        view: existing.view,
                    }
                    : newNoti;
            });

            // 2. Mantener todas las notificaciones locales que NO están en el servidor 
            // (ej. chat, notificaciones manuales) siempre que sigan siendo visibles
            const localOnly = stored.filter(s => s.view && !fetchedNotifications.some(f => f.id === s.id));

            const finalNotifications = [...merged, ...localOnly];

            // Guardar en localStorage y emitir
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(finalNotifications));
            this._notifications.next(finalNotifications.filter(n => n.view));

            return finalNotifications;
        })
    );
}

    /**
     * Marca todas como leídas y actualiza localStorage (sin llamar a la API)
     */
    markAllAsRead(): Observable<boolean> {
        return this.notifications$.pipe(
            take(1),
            map((notifications) => {
                const updated = notifications.map(n => ({ ...n, read: true }));
                this._notifications.next(updated);
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
                return true;
            })
        );
    }

    /**
     * Elimina visualmente una notificación (view = false) y actualiza localStorage (sin llamar a la API)
     */
    delete(id: string): Observable<boolean> {
        return this.notifications$.pipe(
            take(1),
            map((notifications) => {
                const updated = notifications.map(n => 
                    n.id === id ? { ...n, view: false } : n
                );
                this._notifications.next(updated.filter(n => n.view)); // Filtra las que aún están visibles
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
                return true;
            })
        );
    }

    /**
     * Carga notificaciones desde localStorage al iniciar
     */
    private _loadFromLocalStorage(): void {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as Notification[];
                // Emitimos solo las que son visibles
                this._notifications.next(parsed.filter(n => n.view));
            } catch (e) {
                console.warn('Error al cargar notificaciones del localStorage:', e);
                this._notifications.next([]);
            }
        } else {
            this._notifications.next([]);
        }
    }

    update(id: string, changes: Partial<Notification>): Observable<Notification> {
    return this.notifications$.pipe(
        take(1),
        map((notifications) => {
            const updated = notifications.map(n =>
                n.id === id ? { ...n, ...changes } : n
            );
            const updatedNotification = updated.find(n => n.id === id)!;

            this._notifications.next(updated);
            localStorage.setItem('notificacionesHoy', JSON.stringify(updated));

            return updatedNotification;
        })
    );
}

    /**
     * Agrega una nueva notificación manualmente (usado por SignalR)
     */
    pushNotification(notification: Notification): void {
        this.notifications$.pipe(take(1)).subscribe(notifications => {
            // Evitar duplicados por ID
            if (notifications.some(n => n.id === notification.id)) return;
            
            const updated = [notification, ...notifications];
            this._notifications.next(updated);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
        });
    }

    /**
     * Marca como leídas todas las notificaciones que comiencen con el prefijo dado
     */
    markReadByPrefix(prefix: string): void {
        this.notifications$.pipe(take(1)).subscribe(notifications => {
            const hasMatches = notifications.some(n => n.id.startsWith(prefix) && !n.read);
            if (!hasMatches) return;

            const updated = notifications.map(n => 
                n.id.startsWith(prefix) ? { ...n, read: true } : n
            );
            
            this._notifications.next(updated.filter(n => n.view));
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
        });
    }

    /**
     * Elimina visualmente todas las notificaciones que comiencen con el prefijo dado
     */
    deleteByPrefix(prefix: string): void {
        this.notifications$.pipe(take(1)).subscribe(notifications => {
            const hasMatches = notifications.some(n => n.id.startsWith(prefix));
            if (!hasMatches) return;

            const updated = notifications.map(n => 
                n.id.startsWith(prefix) ? { ...n, view: false, read: true } : n
            );
            
            this._notifications.next(updated.filter(n => n.view));
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
        });
    }
}