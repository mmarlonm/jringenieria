import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';
import {
    CotizacionEtapasListItemDto,
    CotizacionEtapasDetalleDto,
    CotizacionEtapasArchivoCasoDto,
    CotizacionEtapasArchivoDto,
    CrearCasoDto,
    GuardarEtapaDto,
    CambiarEstatusDto,
    AutorizacionClienteDto
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

    enviarAutorizacion(id: number, etapa: number): Observable<CotizacionEtapasDetalleDto> {
        return this._http.post<CotizacionEtapasDetalleDto>(`${this._baseUrl}/${id}/etapas/${etapa}/enviar-autorizacion`, {});
    }

    regresar(id: number, etapaDestino: number, motivo: string): Observable<CotizacionEtapasDetalleDto> {
        return this._http.post<CotizacionEtapasDetalleDto>(`${this._baseUrl}/${id}/regresar`, {
            etapaDestino,
            motivo
        });
    }

    autorizacionCliente(id: number, dto: AutorizacionClienteDto): Observable<CotizacionEtapasDetalleDto> {
        return this._http.post<CotizacionEtapasDetalleDto>(`${this._baseUrl}/${id}/autorizacion-cliente`, dto);
    }

    iniciarRevision(id: number, etapa: number): Observable<CotizacionEtapasDetalleDto> {
        return this._http.post<CotizacionEtapasDetalleDto>(`${this._baseUrl}/${id}/etapas/${etapa}/revisiones`, {});
    }

    cancelar(id: number, motivo: string): Observable<CotizacionEtapasDetalleDto> {
        return this._http.post<CotizacionEtapasDetalleDto>(`${this._baseUrl}/${id}/cancelar`, { motivo });
    }

    /** Archivos subidos en todas las etapas del caso (Seguimiento de Proyectos los muestra en su pestaña de archivos). */
    archivosDelCaso(id: number): Observable<CotizacionEtapasArchivoCasoDto[]> {
        return this._http.get<CotizacionEtapasArchivoCasoDto[]>(`${this._baseUrl}/${id}/archivos`);
    }

    /** Deja operable un caso cancelado para seguir modificándolo. */
    reactivar(id: number): Observable<CotizacionEtapasDetalleDto> {
        return this._http.post<CotizacionEtapasDetalleDto>(`${this._baseUrl}/${id}/reactivar`, {});
    }

    /** Borra un caso cancelado con todo su historial; la API no lo permite si ya pasó a Seguimiento de Proyectos. */
    eliminar(id: number): Observable<{ success: boolean }> {
        return this._http.delete<{ success: boolean }>(`${this._baseUrl}/${id}`);
    }

    archivos(id: number, etapa: number, numero: number): Observable<CotizacionEtapasArchivoDto[]> {
        return this._http.get<CotizacionEtapasArchivoDto[]>(`${this._baseUrl}/${id}/etapas/${etapa}/revisiones/${numero}/archivos`);
    }

    subirArchivos(id: number, etapa: number, numero: number, files: File[], observaciones?: string[]): Observable<any> {
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            formData.append('archivos', file, file.name);
            if (observaciones && observaciones[i] !== undefined) {
                formData.append('observaciones', observaciones[i] ?? '');
            }
        }
        return this._http.post<any>(`${this._baseUrl}/${id}/etapas/${etapa}/revisiones/${numero}/archivos`, formData);
    }

    descargarArchivo(id: number, etapa: number, numero: number, nombre: string, version?: number): Observable<Blob> {
        const encoded = encodeURIComponent(nombre);
        const url = `${this._baseUrl}/${id}/etapas/${etapa}/revisiones/${numero}/archivos/${encoded}${version ? '?version=' + version : ''}`;
        return this._http.get(url, {
            responseType: 'blob'
        });
    }

    eliminarArchivo(id: number, etapa: number, numero: number, nombre: string): Observable<any> {
        const encoded = encodeURIComponent(nombre);
        return this._http.delete<any>(`${this._baseUrl}/${id}/etapas/${etapa}/revisiones/${numero}/archivos/${encoded}`);
    }
}
