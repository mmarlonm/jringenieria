import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import {
    AbrirOffboardingDto,
    ActualizarOffboardingDto,
    ActualizarTareaDto,
    ColaboradorBaja,
    OffboardingCatalogos,
    OffboardingDetalle,
    OffboardingResumen
} from './offboarding.types';

@Injectable({ providedIn: 'root' })
export class OffboardingService {
    private readonly _http = inject(HttpClient);
    private readonly _api = `${environment.apiUrl}/rrhh/offboarding`;

    listar(filtros: { estatus?: string; buscar?: string } = {}): Observable<OffboardingResumen[]> {
        let params = new HttpParams();
        if (filtros.estatus) params = params.set('estatus', filtros.estatus);
        if (filtros.buscar) params = params.set('buscar', filtros.buscar);
        return this._http.get<OffboardingResumen[]>(this._api, { params });
    }

    obtener(id: number): Observable<OffboardingDetalle> {
        return this._http.get<OffboardingDetalle>(`${this._api}/${id}`);
    }

    catalogos(): Observable<OffboardingCatalogos> {
        return this._http.get<OffboardingCatalogos>(`${this._api}/catalogos`);
    }

    colaboradores(buscar?: string): Observable<ColaboradorBaja[]> {
        let params = new HttpParams();
        if (buscar) params = params.set('buscar', buscar);
        return this._http.get<ColaboradorBaja[]>(`${this._api}/colaboradores`, { params });
    }

    abrir(dto: AbrirOffboardingDto): Observable<OffboardingDetalle> {
        return this._http.post<OffboardingDetalle>(this._api, dto);
    }

    actualizar(id: number, dto: ActualizarOffboardingDto): Observable<OffboardingDetalle> {
        return this._http.put<OffboardingDetalle>(`${this._api}/${id}`, dto);
    }

    actualizarTarea(tareaId: number, dto: ActualizarTareaDto): Observable<OffboardingDetalle> {
        return this._http.put<OffboardingDetalle>(`${this._api}/tareas/${tareaId}`, dto);
    }

    autorizar(id: number): Observable<OffboardingDetalle> {
        return this._http.post<OffboardingDetalle>(`${this._api}/${id}/autorizar`, {});
    }

    registrarBaja(id: number, fechaBajaImss: string): Observable<OffboardingDetalle> {
        return this._http.post<OffboardingDetalle>(`${this._api}/${id}/baja`, { fechaBajaImss });
    }

    cerrar(id: number, recontratable: string): Observable<OffboardingDetalle> {
        return this._http.post<OffboardingDetalle>(`${this._api}/${id}/cerrar`, { recontratable });
    }

    cancelar(id: number, motivo: string): Observable<OffboardingDetalle> {
        return this._http.post<OffboardingDetalle>(`${this._api}/${id}/cancelar`, { motivo });
    }
}
