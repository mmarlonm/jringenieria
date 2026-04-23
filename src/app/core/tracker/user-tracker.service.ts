import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from 'environments/environment';
import { Subject } from 'rxjs';
import { bufferTime, filter } from 'rxjs/operators';
import { AuthService } from 'app/core/auth/auth.service';

export interface LogNavegacionDto {
    IdUsuario: number;
    Modulo: string;
    Accion: string;
    Componente?: string;
    UrlPath?: string;
    Dispositivo?: string;
}

@Injectable({
    providedIn: 'root'
})
export class UserTrackerService {
    private _httpClient = inject(HttpClient);
    private _authService = inject(AuthService);
    
    private apiRestUrl = `${environment.apiUrl}/LogsNavegacion/registrar`;
    private _eventBuffer = new Subject<LogNavegacionDto>();

    constructor() {
        this.initBuffer();
    }

    private initBuffer(): void {
        this._eventBuffer.pipe(
            bufferTime(10000),
            filter(events => events.length > 0)
        ).subscribe(events => {
            this.sendBatch(events);
        });
    }

    /**
     * Registra un evento adaptado al DTO de C#
     */
    public registrarEvento(modulo: string, accion: string, componente?: string, urlPath?: string): void {
        // Estrategia de búsqueda profunda del ID
        const userInfo = JSON.parse(localStorage.getItem('userInformation') || '{}');
        const user = userInfo?.usuario || userInfo;
        const storedId = localStorage.getItem('usuarioId') || localStorage.getItem('id');
        
        const idUsuario = user?.usuarioId || user?.id || user?.Id || storedId || 0;
        
        if (!idUsuario || idUsuario === '0' || idUsuario === 0) {
            console.warn('⚠️ [Tracker] No se pudo determinar el ID del usuario. Ignorando evento.');
            return;
        }

        const dispositivo = /Mobi|Android/i.test(navigator.userAgent) ? "Móvil" : "Escritorio";

        const dto: LogNavegacionDto = {
            IdUsuario: Number(idUsuario),
            Modulo: modulo,
            Accion: accion,
            Componente: componente || 'General',
            UrlPath: urlPath || window.location.pathname,
            Dispositivo: dispositivo
        };

        this._eventBuffer.next(dto);
    }

    private sendBatch(events: LogNavegacionDto[]): void {
        const token = this._authService.accessToken || localStorage.getItem('accessToken');
        if (!token) return;

        const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
        
        // Enviar uno por uno para coincidir con la firma del controlador [FromBody] LogNavegacionDto
        events.forEach(event => {
            this._httpClient.post(this.apiRestUrl, event, { headers }).subscribe({
                next: () => { },
                error: (err) => { }
            });
        });
    }
}
