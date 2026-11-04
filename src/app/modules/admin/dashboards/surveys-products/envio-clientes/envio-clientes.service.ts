import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';
import {
    DestinatarioClienteDto,
    EnvioEncuestaResultadoDto,
    EnvioEncuestaSolicitud,
    EstadoClientes,
} from './envio-clientes.types';

@Injectable({
    providedIn: 'root',
})
export class EnvioClientesService {
    private readonly _http = inject(HttpClient);
    private readonly _baseUrl = `${environment.apiUrl}/EncuestaEnvio`;

    obtenerDestinatarios(estado: EstadoClientes = 'activos'): Observable<DestinatarioClienteDto[]> {
        const params = new HttpParams().set('estado', estado);
        return this._http.get<DestinatarioClienteDto[]>(`${this._baseUrl}/destinatarios`, { params });
    }

    enviar(
        formularioId: number,
        clienteIds: number[],
        correosLibres: string[] = []
    ): Observable<EnvioEncuestaResultadoDto> {
        const payload: EnvioEncuestaSolicitud = {
            clienteIds,
            correosLibres,
        };
        return this._http.post<EnvioEncuestaResultadoDto>(
            `${this._baseUrl}/formularios/${formularioId}/enviar`,
            payload
        );
    }
}

