import { Injectable, inject } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { environment } from 'environments/environment';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { UserService } from 'app/core/user/user.service';
import { take } from 'rxjs/operators';

export interface MovimientoRealTime {
    idUsuario: number | string;
    usuario: string;
    avatar?: string;
    accion: string;
    modulo: string;
    fecha: string;
    tipo: 'Navegacion' | 'Click' | 'Critico' | 'Seguridad';
}

@Injectable({
    providedIn: 'root'
})
export class SignalRService {
    private hubConnection: HubConnection | null = null;
    private _movimientoReceived = new Subject<MovimientoRealTime>();
    public movimiento$ = this._movimientoReceived.asObservable();
    
    private _userService = inject(UserService);
    private apiUrl = environment.apiUrlSignal;

    constructor() {}

    /**
     * Inicia la conexión condicionalmente si el usuario tiene el rol 'pruebas'
     */
    public startConnection(): void {
        this._userService.user$.pipe(take(1)).subscribe(user => {
            const stored = JSON.parse(localStorage.getItem('userInformation') || '{}');
            const userData = (user as any)?.['usuario'] || stored?.usuario;
            
            // Verificar rol 'pruebas' de forma flexible para evitar errores de TS
            const roles = userData?.roles || [];
            const hasRole = roles.includes('pruebas') || userData?.role === 'pruebas' || userData?.nombreRol === 'pruebas';

            if (!hasRole) {
//                 console.warn('⚠️ [SignalR] Acceso denegado: El usuario no tiene el rol "pruebas"');
                return;
            }

            if (this.hubConnection?.state === HubConnectionState.Connected) return;

            this.hubConnection = new HubConnectionBuilder()
                .withUrl(`${this.apiUrl}/navegacionHub`, {
                    accessTokenFactory: () => localStorage.getItem('accessToken') || ''
                })
                .withAutomaticReconnect()
                .configureLogging(LogLevel.Information)
                .build();

            this.hubConnection.start()
                .then(() => {
//                     console.log('🚀 [SignalR] Conectado al Hub de Navegación');
                    this.registerHandlers();
                })
                .catch(err => { });
        });
    }

    private registerHandlers(): void {
        if (!this.hubConnection) return;

        // Escuchar el evento RecibirMovimiento solicitado
        this.hubConnection.on('RecibirMovimiento', (movimiento: MovimientoRealTime) => {
            this._movimientoReceived.next(movimiento);
        });
    }

    public stopConnection(): void {
        if (this.hubConnection) {
            this.hubConnection.stop().then(() => {
//                 console.log('🛑 [SignalR] Conexión cerrada');
            });
        }
    }
}
