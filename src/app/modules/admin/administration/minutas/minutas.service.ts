import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';
import { Minuta, MinutaCatalogos, MinutaPreviewResponse } from './minutas.types';

@Injectable({
    providedIn: 'root'
})
export class MinutasService {
    private _http = inject(HttpClient);
    private _apiUrl = `${environment.apiUrl}/Minutas`;

    listar(sucursalId?: number | null, buscar?: string): Observable<Minuta[]> {
        let params = new HttpParams();
        if (sucursalId !== undefined && sucursalId !== null && sucursalId > 0) {
            params = params.set('sucursalId', sucursalId.toString());
        }
        if (buscar && buscar.trim().length > 0) {
            params = params.set('buscar', buscar.trim());
        }

        return this._http.get<Minuta[]>(this._apiUrl, { params });
    }

    obtenerCatalogos(): Observable<MinutaCatalogos> {
        return this._http.get<MinutaCatalogos>(`${this._apiUrl}/catalogos`);
    }

    obtenerPorId(id: number): Observable<Minuta> {
        return this._http.get<Minuta>(`${this._apiUrl}/${id}`);
    }

    crear(formData: FormData): Observable<Minuta> {
        return this._http.post<Minuta>(this._apiUrl, formData);
    }

    actualizar(id: number, formData: FormData): Observable<Minuta> {
        return this._http.put<Minuta>(`${this._apiUrl}/${id}`, formData);
    }

    eliminar(id: number): Observable<any> {
        return this._http.delete(`${this._apiUrl}/${id}`);
    }

    preview(id: number): Observable<MinutaPreviewResponse> {
        return this._http.get<MinutaPreviewResponse>(`${this._apiUrl}/${id}/preview`);
    }

    descargar(id: number): Observable<Blob> {
        return this._http.get(`${this._apiUrl}/${id}/descargar`, {
            responseType: 'blob'
        });
    }

    getTokenOnlyOffice(id: number, mode: string = 'view', usuario?: string): Observable<any> {
        let params = new HttpParams().set('mode', mode);
        if (usuario) params = params.set('usuario', usuario);
        return this._http.get<any>(`${this._apiUrl}/${id}/token`, { params });
    }
}
