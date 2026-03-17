import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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

    getRecepciones(fechaInicio?: string, fechaFin?: string): Observable<any[]> {
        const params: any = {};
        if (fechaInicio) params.fechaInicio = fechaInicio;
        if (fechaFin) params.fechaFin = fechaFin;
        return this._httpClient.get<any[]>(`${this.apiUrl}/recepcion/todas`, { params });
    }

    subirArchivos(idRecepcion: number, evidencia: File, comprobante: File): Observable<any> {
        const formData = new FormData();
        if (evidencia) formData.append('evidencia', evidencia);
        if (comprobante) formData.append('comprobante', comprobante);
        return this._httpClient.post(`${this.apiUrl}/recepcion/subir-archivos/${idRecepcion}`, formData);
    }

    getArchivosRecepcion(id: number): Observable<any> {
        return this._httpClient.get<any>(`${this.apiUrl}/recepcion/${id}/archivos`);
    }

    descargarArchivo(idSolicitud: number, nombreArchivo: string): Observable<any> {
        return this._httpClient.get<any>(`${this.apiUrl}/recepcion/${idSolicitud}/descargar-archivo/${nombreArchivo}`);
    }
}
