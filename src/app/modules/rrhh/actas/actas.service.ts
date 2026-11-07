import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import {
    ActaDetalle,
    ActaResumen,
    ActasCatalogos,
    ActualizarActaDto,
    AplicarSancionDto,
    ColaboradorActa,
    CrearActaDto
} from './actas.types';

@Injectable({ providedIn: 'root' })
export class ActasService {
    private readonly _http = inject(HttpClient);
    private readonly _api = `${environment.apiUrl}/rrhh/actas`;

    listar(filtros: { estatus?: string; alerta?: string; buscar?: string } = {}): Observable<ActaResumen[]> {
        let params = new HttpParams();
        if (filtros.estatus) params = params.set('estatus', filtros.estatus);
        if (filtros.alerta) params = params.set('alerta', filtros.alerta);
        if (filtros.buscar) params = params.set('buscar', filtros.buscar);
        return this._http.get<ActaResumen[]>(this._api, { params });
    }

    obtener(id: number): Observable<ActaDetalle> {
        return this._http.get<ActaDetalle>(`${this._api}/${id}`);
    }

    alertas(): Observable<ActaResumen[]> {
        return this._http.get<ActaResumen[]>(`${this._api}/alertas`);
    }

    catalogos(): Observable<ActasCatalogos> {
        return this._http.get<ActasCatalogos>(`${this._api}/catalogos`);
    }

    colaboradores(buscar?: string): Observable<ColaboradorActa[]> {
        let params = new HttpParams();
        if (buscar) params = params.set('buscar', buscar);
        return this._http.get<ColaboradorActa[]>(`${this._api}/colaboradores`, { params });
    }

    crear(dto: CrearActaDto): Observable<ActaDetalle> {
        return this._http.post<ActaDetalle>(this._api, dto);
    }

    actualizar(id: number, dto: ActualizarActaDto): Observable<ActaDetalle> {
        return this._http.put<ActaDetalle>(`${this._api}/${id}`, dto);
    }

    citar(id: number, fechaCitatorio: string): Observable<ActaDetalle> {
        return this._http.post<ActaDetalle>(`${this._api}/${id}/citar`, { fechaCitatorio });
    }

    registrarAudiencia(id: number, noComparecio: boolean, descargos: string | null): Observable<ActaDetalle> {
        return this._http.post<ActaDetalle>(`${this._api}/${id}/audiencia`, { noComparecio, descargos });
    }

    aplicarSancion(id: number, dto: AplicarSancionDto): Observable<ActaDetalle> {
        return this._http.post<ActaDetalle>(`${this._api}/${id}/sancion`, dto);
    }

    registrarFirma(id: number, resultado: string): Observable<ActaDetalle> {
        return this._http.post<ActaDetalle>(`${this._api}/${id}/firma`, { resultado });
    }

    cerrar(id: number): Observable<ActaDetalle> {
        return this._http.post<ActaDetalle>(`${this._api}/${id}/cerrar`, {});
    }

    anular(id: number, motivo: string): Observable<ActaDetalle> {
        return this._http.post<ActaDetalle>(`${this._api}/${id}/anular`, { motivo });
    }
}
