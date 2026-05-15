import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({
    providedIn: 'root'
})
export class PurchaseReceptionService {
    private apiUrl = `${environment.apiUrl}/SolicitudesCompra`;

    constructor(private _httpClient: HttpClient) { }

    getDetalleConsolidado(idSolicitud: number): Observable<any> {
        return this._httpClient.get<any>(`${this.apiUrl}/recepcion/detalle-consolidado/${idSolicitud}`);
    }

    getRecepcionPorId(id: number): Observable<any> {
        return this._httpClient.get<any>(`${this.apiUrl}/recepcion/${id}`);
    }

    registrarRecepcion(data: any): Observable<any> {
        return this._httpClient.post(`${this.apiUrl}/recepcion/registrar`, data);
    }

    eliminarRecepcion(id: number): Observable<any> {
        return this._httpClient.delete(`${this.apiUrl}/recepcion/${id}`);
    }

    getRecepciones(fechaInicio?: string, fechaFin?: string): Observable<any[]> {
        const params: any = {};
        if (fechaInicio) params.fechaInicio = fechaInicio;
        if (fechaFin) params.fechaFin = fechaFin;
        return this._httpClient.get<any[]>(`${this.apiUrl}/recepcion/todas`, { params });
    }

    subirArchivoRecepcion(idRecepcion: number, archivo: File, tipo: string): Observable<any> {
        const formData = new FormData();
        formData.append('archivo', archivo);
        formData.append('tipo', tipo);
        return this._httpClient.post(`${this.apiUrl}/recepcion/subir-archivo/${idRecepcion}`, formData);
    }

    getArchivosRecepcion(id: number): Observable<string[]> {
        return this._httpClient.get<any>(`${this.apiUrl}/recepcion/${id}/archivos`).pipe(
            map(res => res.data || res || [])
        );
    }

    actualizarEstatusRecepcion(idRecepcion: number, nuevoEstatus: number): Observable<any> {
        return this._httpClient.put(`${this.apiUrl}/recepcion/${idRecepcion}/estatus`, nuevoEstatus);
    }

    descargarArchivo(idSolicitud: number, nombreArchivo: string): Observable<any> {
        return this._httpClient.get<any>(`${this.apiUrl}/recepcion/${idSolicitud}/descargar-archivo/${nombreArchivo}`);
    }

    eliminarArchivo(idSolicitud: number, tipo: string, nombreArchivo: string): Observable<any> {
        return this._httpClient.delete(`${this.apiUrl}/recepcion/${idSolicitud}/archivos/${tipo}/${nombreArchivo}`);
    }

    /**
     * Busca folios en CONTPAQi
     */
    buscarFoliosContpaq(filtro: string): Observable<any[]> {
        return this._httpClient.get<any[]>(`${environment.apiUrl}/ReportDashboard/contpaq-buscar-folios?filtro=${filtro}`);
    }

    /**
     * Obtiene el detalle de un folio de CONTPAQi
     */
    getDetalleFolioContpaq(folio: string, rfc: string): Observable<any> {
        return this._httpClient.get<any>(`${environment.apiUrl}/ReportDashboard/contpaq-detalle-folio?folio=${folio}&rfc=${rfc}`);
    }
}
