import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';
import {
    CotizacionEtapasListItemDto,
    CotizacionEtapasDetalleDto,
    CotizacionEtapasRevisionDto,
    CotizacionEtapasArchivoDto,
    CrearCasoDto,
    GuardarEtapaDto,
    CambiarEstatusDto
} from './cotizacion-etapas.models';

@Injectable({
    providedIn: 'root'
})
export class CotizacionEtapasService {
    private readonly _baseUrl = `${environment.apiUrl}/CotizacionEtapas`;

    constructor(private readonly _http: HttpClient) {}

    listar(etapa: number, incluirProcesados: boolean = false): Observable<CotizacionEtapasListItemDto[]> {
        const params = new HttpParams()
            .set('etapa', etapa.toString())
            .set('incluirProcesados', incluirProcesados.toString());
        return this._http.get<CotizacionEtapasListItemDto[]>(this._baseUrl, { params });
    }

    obtener(id: number): Observable<CotizacionEtapasDetalleDto> {
        return this._http.get<CotizacionEtapasDetalleDto>(`${this._baseUrl}/${id}`);
    }

    crear(dto: CrearCasoDto): Observable<CotizacionEtapasDetalleDto> {
        return this._http.post<CotizacionEtapasDetalleDto>(this._baseUrl, dto);
    }

    guardar(id: number, etapa: number, dto: GuardarEtapaDto): Observable<CotizacionEtapasDetalleDto> {
        return this._http.put<CotizacionEtapasDetalleDto>(`${this._baseUrl}/${id}/etapas/${etapa}`, dto);
    }

    cambiarEstatus(id: number, etapa: number, dto: CambiarEstatusDto): Observable<CotizacionEtapasDetalleDto> {
        return this._http.post<CotizacionEtapasDetalleDto>(`${this._baseUrl}/${id}/etapas/${etapa}/estatus`, dto);
    }

    iniciarRevision(id: number, etapa: number): Observable<CotizacionEtapasDetalleDto> {
        return this._http.post<CotizacionEtapasDetalleDto>(`${this._baseUrl}/${id}/etapas/${etapa}/revisiones`, {});
    }

    cancelar(id: number, motivo: string): Observable<CotizacionEtapasDetalleDto> {
        return this._http.post<CotizacionEtapasDetalleDto>(`${this._baseUrl}/${id}/cancelar`, { motivo });
    }

    archivos(id: number, etapa: number, numero: number): Observable<CotizacionEtapasArchivoDto[]> {
        return this._http.get<CotizacionEtapasArchivoDto[]>(`${this._baseUrl}/${id}/etapas/${etapa}/revisiones/${numero}/archivos`);
    }

    subirArchivos(id: number, etapa: number, numero: number, files: File[]): Observable<any> {
        const formData = new FormData();
        for (const file of files) {
            formData.append('archivos', file, file.name);
        }
        return this._http.post<any>(`${this._baseUrl}/${id}/etapas/${etapa}/revisiones/${numero}/archivos`, formData);
    }

    descargarArchivo(id: number, etapa: number, numero: number, nombre: string): Observable<Blob> {
        const encoded = encodeURIComponent(nombre);
        return this._http.get(`${this._baseUrl}/${id}/etapas/${etapa}/revisiones/${numero}/archivos/${encoded}`, {
            responseType: 'blob'
        });
    }

    eliminarArchivo(id: number, etapa: number, numero: number, nombre: string): Observable<any> {
        const encoded = encodeURIComponent(nombre);
        return this._http.delete<any>(`${this._baseUrl}/${id}/etapas/${etapa}/revisiones/${numero}/archivos/${encoded}`);
    }
}
