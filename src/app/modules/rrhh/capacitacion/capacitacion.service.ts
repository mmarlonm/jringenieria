import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import {
    ActualizarCapacitacionDto,
    ActualizarParticipanteDto,
    AgregarParticipanteDto,
    CambiarEstatusCapacitacionDto,
    CapacitacionDetalle,
    CapacitacionParticipante,
    CapacitacionResumen,
    CrearCapacitacionDto,
    RegistrarEficaciaDto
} from './capacitacion.types';

@Injectable({ providedIn: 'root' })
export class CapacitacionService {
    private readonly _http = inject(HttpClient);
    private readonly _api = `${environment.apiUrl}/rrhh/capacitacion`;

    listar(filtros: {
        estatus?: string;
        competencia?: string;
        semaforo?: string;
        buscar?: string;
    } = {}): Observable<CapacitacionResumen[]> {
        let params = new HttpParams();
        if (filtros.estatus) params = params.set('estatus', filtros.estatus);
        if (filtros.competencia) params = params.set('competencia', filtros.competencia);
        if (filtros.semaforo) params = params.set('semaforo', filtros.semaforo);
        if (filtros.buscar) params = params.set('buscar', filtros.buscar);

        return this._http.get<CapacitacionResumen[]>(this._api, { params });
    }

    obtener(id: number): Observable<CapacitacionDetalle> {
        return this._http.get<CapacitacionDetalle>(`${this._api}/${id}`);
    }

    crear(dto: CrearCapacitacionDto): Observable<CapacitacionDetalle> {
        return this._http.post<CapacitacionDetalle>(this._api, dto);
    }

    actualizar(id: number, dto: ActualizarCapacitacionDto): Observable<CapacitacionDetalle> {
        return this._http.put<CapacitacionDetalle>(`${this._api}/${id}`, dto);
    }

    cambiarEstatus(id: number, dto: CambiarEstatusCapacitacionDto): Observable<CapacitacionDetalle> {
        return this._http.post<CapacitacionDetalle>(`${this._api}/${id}/estatus`, dto);
    }

    registrarEficacia(id: number, dto: RegistrarEficaciaDto): Observable<CapacitacionDetalle> {
        return this._http.post<CapacitacionDetalle>(`${this._api}/${id}/eficacia`, dto);
    }

    agregarParticipante(capacitacionId: number, dto: AgregarParticipanteDto): Observable<CapacitacionParticipante> {
        return this._http.post<CapacitacionParticipante>(`${this._api}/${capacitacionId}/participantes`, dto);
    }

    actualizarParticipante(participanteId: number, dto: ActualizarParticipanteDto): Observable<CapacitacionParticipante> {
        return this._http.put<CapacitacionParticipante>(`${this._api}/participantes/${participanteId}`, dto);
    }

    eliminarParticipante(participanteId: number): Observable<void> {
        return this._http.delete<void>(`${this._api}/participantes/${participanteId}`);
    }
}
