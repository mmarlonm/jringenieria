import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ProveedoresService {
    private apiCuestionario = `${environment.apiUrl}/ProveedoresCuestionario`;
    private apiCatalogos = `${environment.apiUrl}/CatalogoProveedoresConfig`;
    private apiUsers = `${environment.apiUrl}/Profile`;

    constructor(private _http: HttpClient) { }

    // -----------------------------------------------------------------------------------------------------
    // @ Cuestionarios
    // -----------------------------------------------------------------------------------------------------

    getCuestionarios(): Observable<any> {
        return this._http.get<any>(this.apiCuestionario);
    }

    getCuestionarioById(id: number): Observable<any> {
        return this._http.get<any>(`${this.apiCuestionario}/${id}`);
    }

    getCuestionarioByProveedor(idProveedor: number): Observable<any> {
        return this._http.get<any>(`${this.apiCuestionario}/proveedor/${idProveedor}`);
    }

    saveCuestionario(cuestionario: any): Observable<any> {
        return this._http.post<any>(this.apiCuestionario, cuestionario);
    }

    autorizarProveedor(autorizacion: any): Observable<any> {
        return this._http.post<any>(`${this.apiCuestionario}/autorizar`, autorizacion);
    }

    reenviarNotificacion(idCuestionario: number, aprobadorId?: number): Observable<any> {
        const params = aprobadorId ? `?aprobadorId=${aprobadorId}` : '';
        return this._http.post<any>(`${this.apiCuestionario}/reenviar-notificacion/${idCuestionario}${params}`, {});
    }

    deleteCuestionario(id: number): Observable<any> {
        return this._http.delete<any>(`${this.apiCuestionario}/${id}`);
    }

    aprobarCheck(idCuestionario: number, idUsuario: number): Observable<any> {
        return this._http.post<any>(`${this.apiCuestionario}/aprobar-check?idCuestionario=${idCuestionario}&idUsuario=${idUsuario}`, {});
    }

    getCuestionarioPublico(id: number): Observable<any> {
        return this._http.get<any>(`${this.apiCuestionario}/public/${id}`);
    }

    saveCuestionarioPublico(cuestionario: any): Observable<any> {
        return this._http.post<any>(`${this.apiCuestionario}/public/save`, cuestionario);
    }

    enviarInvitacionProveedor(id: number, correoOverride?: string): Observable<any> {
        const params = [];
        if (correoOverride) {
            params.push(`correo=${encodeURIComponent(correoOverride)}`);
        }
        params.push(`clientUrl=${encodeURIComponent(window.location.href)}`);
        const queryString = params.length > 0 ? `?${params.join('&')}` : '';
        return this._http.post<any>(`${this.apiCuestionario}/${id}/enviar-invitacion${queryString}`, {});
    }

    // -----------------------------------------------------------------------------------------------------
    // @ catálogos y usuarios
    // -----------------------------------------------------------------------------------------------------

    getCatalogosActivos(): Observable<any> {
        return this._http.get<any>(`${this.apiCatalogos}/activos`);
    }

    getCatalogosPorTipo(tipo: string): Observable<any> {
        return this._http.get<any>(`${this.apiCatalogos}/tipo/${tipo}`);
    }

    getUsuarios(): Observable<any[]> {
        return this._http.get<any[]>(`${this.apiUsers}/get-users`);
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Catálogo Maestro de Proveedores
    // -----------------------------------------------------------------------------------------------------

    getProveedoresMaestro(): Observable<any> {
        return this._http.get<any>(`${environment.apiUrl}/ProveedorMaestro`);
    }

    getProveedorMaestroById(id: number): Observable<any> {
        return this._http.get<any>(`${environment.apiUrl}/ProveedorMaestro/${id}`);
    }

    saveProveedorMaestro(proveedor: any): Observable<any> {
        if (proveedor.idProveedor) {
            return this._http.put<any>(`${environment.apiUrl}/ProveedorMaestro/${proveedor.idProveedor}`, proveedor);
        } else {
            return this._http.post<any>(`${environment.apiUrl}/ProveedorMaestro`, proveedor);
        }
    }

    deleteProveedorMaestro(id: number): Observable<any> {
        return this._http.delete<any>(`${environment.apiUrl}/ProveedorMaestro/${id}`);
    }

    recalcularCalificacion(id: number): Observable<any> {
        return this._http.post<any>(`${environment.apiUrl}/ProveedorMaestro/${id}/recalcular`, {});
    }

    getReporteResumen(): Observable<any> {
        return this._http.get<any>(`${environment.apiUrl}/ProveedorMaestro/reporte-resumen`);
    }

    sincronizarProveedores(): Observable<any> {
        return this._http.post<any>(`${this.apiCuestionario}/sync-contpaqi`, {});
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Gestión de Documentos
    // -----------------------------------------------------------------------------------------------------

    subirArchivoCuestionario(idCuestionario: number, archivo: File, nombreDocumento: string): Observable<any> {
        const formData = new FormData();
        formData.append('archivo', archivo);
        formData.append('nombreDocumento', nombreDocumento);
        return this._http.post<any>(`${this.apiCuestionario}/${idCuestionario}/documentos/subir`, formData);
    }

    getArchivosCuestionario(idCuestionario: number): Observable<any> {
        return this._http.get<any>(`${this.apiCuestionario}/${idCuestionario}/documentos`);
    }

    descargarArchivoCuestionario(idCuestionario: number, nombreDocumento: string): Observable<any> {
        return this._http.get<any>(`${this.apiCuestionario}/${idCuestionario}/documentos/descargar?nombreDocumento=${encodeURIComponent(nombreDocumento)}`);
    }

    eliminarArchivoCuestionario(idCuestionario: number, nombreDocumento: string): Observable<any> {
        return this._http.delete<any>(`${this.apiCuestionario}/${idCuestionario}/documentos/eliminar?nombreDocumento=${encodeURIComponent(nombreDocumento)}`);
    }
}
