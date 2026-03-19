import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import * as signalR from '@microsoft/signalr';
import { NotificationsService } from 'app/layout/common/notifications/notifications.service';
import { Notification } from 'app/layout/common/notifications/notifications.types';
import { environment } from 'environments/environment';

@Injectable({
    providedIn: 'root'
})
export class NotificacionesChatService {
    private _hubConnection: signalR.HubConnection | null = null;
    private hubUrl: string;

    constructor(
        private _snackBar: MatSnackBar,
        private _router: Router,
        private _notificationsService: NotificationsService
    ) {
        // Usar apiUrlSignal para evitar el /api que suele causar 404 en hubs de .NET
        this.hubUrl = environment.apiUrlSignal + '/chatHub';
    }

    /**
     * Inicializa la conexión a SignalR y se une al canal del usuario
     */
    startConnection(): void {
        const storedData = JSON.parse(localStorage.getItem('userInformation') || '{}');
        const userId = storedData?.usuario?.id;

        if (!userId) {
            console.warn('[NotificacionesChatService] No se encontró ID de usuario para SignalR');
            return;
        }

        // Evitar múltiples conexiones
        if (this._hubConnection?.state === signalR.HubConnectionState.Connected) return;

        this._hubConnection = new signalR.HubConnectionBuilder()
            .withUrl(this.hubUrl, {
                accessTokenFactory: () => localStorage.getItem('accessToken') || ''
            })
            .withAutomaticReconnect()
            .build();

        this._hubConnection.start()
            .then(() => {
                console.log('📡 [NotificacionesChatService] Conectado a /chatHub');
                
                // Unirse al grupo personal (Notificaciones directas)
                // Usamos el nuevo método UnirseAGrupo del backend
                this._hubConnection?.invoke('UnirseAGrupo', "Usuario_" + userId)
                    .catch(err => console.error('[NotificacionesChatService] Error en UnirseAGrupo:', err));

                // Escuchar notificaciones de nuevos mensajes en tareas
                this._hubConnection?.on('NuevaNotificacionChat', (data: { idTarea: number, titulo: string, mensaje: string, fecha: Date }) => {
                    this._handleNewNotification(data);
                });
            })
            .catch(err => console.error('[NotificacionesChatService] Error al conectar SignalR:', err));
    }

    /**
     * Procesa la notificación entrante: Muestra Toast e inyecta en el menú de Fuse
     */
    private _handleNewNotification(data: { idTarea: number, titulo: string, mensaje: string, fecha: Date }): void {
        const { idTarea, titulo, mensaje, fecha } = data;

        // 1. Mostrar Toast Silencioso (MatSnackBar)
        const snackBarRef = this._snackBar.open(`${titulo} - ${mensaje}`, 'Ver', {
            duration: 8000,
            horizontalPosition: 'right',
            verticalPosition: 'bottom',
            panelClass: ['chat-notification-snackbar']
        });

        // Al hacer clic en el botón "Ver" del Toast, redirigir a la tarea
        snackBarRef.onAction().subscribe(() => {
            this._router.navigate(['/dashboards/tasks'], { queryParams: { id: idTarea } });
        });

        // 2. Integrar con el sistema de notificaciones de Fuse (Campanita)
        const fuseNotification: Notification = {
            id: `chat-${idTarea}-${new Date(fecha).getTime()}`,
            icon: 'heroicons_outline:chat-bubble-left-right',
            title: titulo,
            description: mensaje,
            time: new Date(fecha).toISOString(),
            read: false,
            view: true,
            link: `/dashboards/tasks?id=${idTarea}`,
            useRouter: true
        };

        this._notificationsService.pushNotification(fuseNotification);
    }

    /**
     * Detiene la conexión
     */
    stopConnection(): void {
        if (this._hubConnection) {
            this._hubConnection.stop().then(() => {
                this._hubConnection = null;
            });
        }
    }
}
