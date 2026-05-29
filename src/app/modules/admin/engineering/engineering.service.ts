import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface Solicitante {
    idSolicitante: number;
    nombreCompleto: string;
    celular?: string;
    empresa: string;
    area?: string;
    activo: boolean;
    createdDate?: string;
}

export interface SeguimientoProyecto {
    idSeguimiento: number;
    idSolicitante: number;
    nombreCompleto?: string;
    celular?: string;
    empresa?: string;
    area?: string;
    actividad: string;
    tipo?: string;
    estatusLevantamiento: number;
    estatusCotizacion: number;
    estatusAprobacion: number;
    ordenCompraFolio?: string;
    montoTotalEstimado?: number;
    idUsuarioRegistro: number;
    nombreUsuarioRegistro?: string;
    fechaRegistro?: string;
    fechaActualizacion?: string;
}

@Injectable({
    providedIn: 'root'
})
export class EngineeringService {
    private apiSolicitantes = `${environment.apiUrl}/CatalogoSolicitantes`;
    private apiSeguimiento = `${environment.apiUrl}/SeguimientoProyectos`;

    constructor(private _http: HttpClient) { }

    // ==========================================
    // 👥 CATÁLOGO DE SOLICITANTES
    // ==========================================
    getSolicitantes(): Observable<Solicitante[]> {
        return this._http.get<Solicitante[]>(this.apiSolicitantes);
    }

    getSolicitante(id: number): Observable<Solicitante> {
        return this._http.get<Solicitante>(`${this.apiSolicitantes}/${id}`);
    }

    saveSolicitante(solicitante: Partial<Solicitante>): Observable<any> {
        return this._http.post(this.apiSolicitantes, solicitante);
    }

    deleteSolicitante(id: number): Observable<any> {
        return this._http.delete(`${this.apiSolicitantes}/${id}`);
    }

    // ==========================================
    // 📊 SEGUIMIENTO DE PROYECTOS (TABLERO)
    // ==========================================
    getSeguimientos(fechaInicio?: string, fechaFin?: string): Observable<SeguimientoProyecto[]> {
        let params = new HttpParams();
        if (fechaInicio) {
            params = params.set('fechaInicio', fechaInicio);
        }
        if (fechaFin) {
            params = params.set('fechaFin', fechaFin);
        }
        return this._http.get<SeguimientoProyecto[]>(this.apiSeguimiento, { params });
    }

    getSeguimiento(id: number): Observable<SeguimientoProyecto> {
        return this._http.get<SeguimientoProyecto>(`${this.apiSeguimiento}/${id}`);
    }

    saveSeguimiento(seguimiento: any): Observable<any> {
        return this._http.post(this.apiSeguimiento, seguimiento);
    }

    deleteSeguimiento(id: number): Observable<any> {
        return this._http.delete(`${this.apiSeguimiento}/${id}`);
    }

    updateEstatusLevantamiento(id: number, estatus: number): Observable<any> {
        return this._http.put(`${this.apiSeguimiento}/${id}/estatus-levantamiento`, estatus);
    }

    updateEstatusCotizacion(id: number, estatus: number): Observable<any> {
        return this._http.put(`${this.apiSeguimiento}/${id}/estatus-cotizacion`, estatus);
    }

    updateEstatusAprobacion(id: number, estatus: number): Observable<any> {
        return this._http.put(`${this.apiSeguimiento}/${id}/estatus-aprobacion`, estatus);
    }
}
