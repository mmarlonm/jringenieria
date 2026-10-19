import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { Expediente, ExpedienteDocumento, ExpedienteLista, ExpedienteTipo, MensajeApi } from './expediente.types';

/**
 * Acceso al API del expediente digital. Los métodos «Mio» usan al colaborador de la sesión (menú y perfil);
 * los demás son de RRHH y exigen el permiso especial rrhh.expedientes.revisar.
 */
@Injectable({ providedIn: 'root' })
export class ExpedienteService {
    private readonly _http = inject(HttpClient);
    private readonly _api = `${environment.apiUrl}/rrhh`;

    // ------------------------------------------------------------------ colaborador (sesión)

    obtenerMio(): Observable<Expediente> {
        return this._http.get<Expediente>(`${this._api}/mi-expediente`);
    }

    /** `form`: tipoDocumentoId, archivo y, en DC-3, descripcion y fechaVigencia (yyyy-MM-dd). */
    subirMio(form: FormData): Observable<ExpedienteDocumento> {
        return this._http.post<ExpedienteDocumento>(`${this._api}/mi-expediente/documentos`, form);
    }

    eliminarMio(documentoId: number): Observable<MensajeApi> {
        return this._http.delete<MensajeApi>(`${this._api}/mi-expediente/documentos/${documentoId}`);
    }

    descargarMio(documentoId: number): Observable<Blob> {
        return this._http.get(`${this._api}/mi-expediente/documentos/${documentoId}/archivo`, { responseType: 'blob' });
    }

    formatoMio(tipoId: number): Observable<Blob> {
        return this._http.get(`${this._api}/mi-expediente/formatos/${tipoId}`, { responseType: 'blob' });
    }

    // ------------------------------------------------------------------ RRHH

    listar(filtros: { buscar?: string; sucursalId?: number | null; filtro?: string } = {}): Observable<ExpedienteLista[]> {
        let params = new HttpParams();
        if (filtros.buscar) params = params.set('buscar', filtros.buscar);
        if (filtros.sucursalId) params = params.set('sucursalId', filtros.sucursalId);
        if (filtros.filtro) params = params.set('filtro', filtros.filtro);
        return this._http.get<ExpedienteLista[]>(`${this._api}/expedientes`, { params });
    }

    tipos(): Observable<ExpedienteTipo[]> {
        return this._http.get<ExpedienteTipo[]>(`${this._api}/expedientes/tipos`);
    }

    obtener(colaboradorId: number): Observable<Expediente> {
        return this._http.get<Expediente>(`${this._api}/expedientes/${colaboradorId}`);
    }

    /** Lo que sube RRHH nace VALIDADO. */
    subir(colaboradorId: number, form: FormData): Observable<ExpedienteDocumento> {
        return this._http.post<ExpedienteDocumento>(`${this._api}/expedientes/${colaboradorId}/documentos`, form);
    }

    eliminar(colaboradorId: number, documentoId: number): Observable<MensajeApi> {
        return this._http.delete<MensajeApi>(`${this._api}/expedientes/${colaboradorId}/documentos/${documentoId}`);
    }

    descargar(documentoId: number): Observable<Blob> {
        return this._http.get(`${this._api}/expedientes/documentos/${documentoId}/archivo`, { responseType: 'blob' });
    }

    validar(documentoId: number): Observable<MensajeApi> {
        return this._http.post<MensajeApi>(`${this._api}/expedientes/documentos/${documentoId}/validar`, {});
    }

    rechazar(documentoId: number, motivo: string): Observable<MensajeApi> {
        return this._http.post<MensajeApi>(`${this._api}/expedientes/documentos/${documentoId}/rechazar`, { motivo });
    }

    marcarNoAplica(colaboradorId: number, tipoId: number): Observable<MensajeApi> {
        return this._http.put<MensajeApi>(`${this._api}/expedientes/${colaboradorId}/tipos/${tipoId}/no-aplica`, {});
    }

    quitarNoAplica(colaboradorId: number, tipoId: number): Observable<MensajeApi> {
        return this._http.delete<MensajeApi>(`${this._api}/expedientes/${colaboradorId}/tipos/${tipoId}/no-aplica`);
    }

    subirFormato(tipoId: number, archivo: File): Observable<MensajeApi> {
        const form = new FormData();
        form.append('archivo', archivo, archivo.name);
        return this._http.put<MensajeApi>(`${this._api}/expedientes/formatos/${tipoId}`, form);
    }

    formato(tipoId: number): Observable<Blob> {
        return this._http.get(`${this._api}/expedientes/formatos/${tipoId}`, { responseType: 'blob' });
    }
}
