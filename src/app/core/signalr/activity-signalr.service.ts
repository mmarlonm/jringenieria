import { Injectable, inject } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { environment } from 'environments/environment';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

export interface ActivityLog {
    idLog?: number;
    fecha: string;
    idUsuario: number;
    nombreUsuario: string;
    modulo: string;
    accion: string;
    componente?: string;
    urlPath?: string;
    dispositivo?: string;
    avatar?: string; // Lo inyectamos en el front
}

@Injectable({
    providedIn: 'root'
})
export class ActivitySignalRService {
    private hubConnection: HubConnection | null = null;
    private _movimientos = new Subject<ActivityLog>();
    public movimientos$ = this._movimientos.asObservable();
    
    private _connectionStatus = new BehaviorSubject<boolean>(false);
    public connectionStatus$ = this._connectionStatus.asObservable();

    private apiUrl = environment.apiUrlSignal;
    private apiRestUrl = `${environment.apiUrl}/LogsNavegacion`;
    private _messageQueue: Omit<ActivityLog, 'fecha'>[] = [];
    private _httpClient = inject(HttpClient);

    constructor() {}

    /**
     * Inicia la conexión con el Hub de Navegación si el usuario tiene el rol requerido.
     */
    public startConnection(): void {
        if (this.hubConnection?.state === HubConnectionState.Connected) return;

        const token = localStorage.getItem('accessToken');
        if (!token) return;

        // Construir la conexión
        // Según requerimiento: ${apiUrl}/navegacionHub
        this.hubConnection = new HubConnectionBuilder()
            .withUrl(`${this.apiUrl}/navegacionHub`, {
                accessTokenFactory: () => token
            })
            .withAutomaticReconnect()
            .configureLogging(LogLevel.None)
            .build();

        // Registrar manejadores
        this.hubConnection.on('RecibirMovimiento', (movimiento: ActivityLog) => {
            this._movimientos.next(movimiento);
        });

        // Iniciar conexión
        this.hubConnection
            .start()
            .then(() => {
//                 console.log('✅ [ActivitySignalR] Conectado a /navegacionHub');
                this._connectionStatus.next(true);
                
                // Enviar mensajes encolados
                if (this._messageQueue.length > 0) {
                    // console.log(`📤 [ActivitySignalR] Enviando ${this._messageQueue.length} mensajes encolados...`);
                    while (this._messageQueue.length > 0) {
                        const queuedLog = this._messageQueue.shift();
                        if (queuedLog) this.sendLog(queuedLog);
                    }
                }
            })
            .catch(err => {
                // console.error('❌ [ActivitySignalR] Error al conectar:', err);
                this._connectionStatus.next(false);
            });

        this.hubConnection.onclose(() => this._connectionStatus.next(false));
    }

    /**
     * Envía un log de actividad al servidor mediante la API REST.
     */
    public sendLog(log: Omit<ActivityLog, 'fecha'>): void {
        const token = localStorage.getItem('accessToken');
        const body = {
            ...log,
            Usuario: log.nombreUsuario,
            IdUsuario: log.idUsuario,
            Accion: log.accion,
            Modulo: log.modulo
        };

        this._httpClient.post(`${this.apiRestUrl}/registrar`, body, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).subscribe({
            next: () => { },
            error: (err) => { }
        });
    }

    /**
     * Limpia el historial de navegación en el servidor.
     */
    public clearHistoryServer(dias: number = 30): Observable<any> {
        const token = localStorage.getItem('accessToken');
        const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
        return this._httpClient.delete(`${this.apiRestUrl}/limpiar`, {
            headers,
            params: { dias: dias.toString() }
        });
    }

    /**
     * Obtiene los logs recientes desde la API.
     */
    public getRecentLogs(top: number = 50): Observable<any> {
        const token = localStorage.getItem('accessToken');
        const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
        return this._httpClient.get<any>(`${this.apiRestUrl}/recientes`, {
            headers,
            params: { top: top.toString() }
        });
    }

    /**
     * Detiene la conexión.
     */
    public stopConnection(): void {
        if (this.hubConnection) {
            this.hubConnection.stop()
                .then(() => {
//                     console.log('📡 [ActivitySignalR] Conexión cerrada.');
                    this.hubConnection = null;
                    this._connectionStatus.next(false);
                })
                .catch(err => { });
        }
    }
}
