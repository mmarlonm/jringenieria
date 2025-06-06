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
    }

    get notifications$(): Observable<Notification[]> {
        return this._notifications.asObservable();
    }

    /**
     * Obtiene notificaciones del backend para el día actual y las guarda en localStorage
     */
    getAll(): Observable<Notification[]> {
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
            const today = new Date().toDateString();
            const stored = JSON.parse(localStorage.getItem('notificacionesHoy') || '[]') as Notification[];

            // Unificar notificaciones por ID
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

            // Agregar notificaciones antiguas que aún están abiertas (view: true)
            const stillOpenOldNotis = stored.filter(n => {
                const notiDate = new Date(n.time).toDateString();
                return notiDate !== today && n.view;
            });

            const finalNotifications = [...merged, ...stillOpenOldNotis];

            // Guardar en localStorage y emitir
            localStorage.setItem('notificacionesHoy', JSON.stringify(finalNotifications));
            this._notifications.next(finalNotifications);

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
                this._notifications.next(parsed);
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
}