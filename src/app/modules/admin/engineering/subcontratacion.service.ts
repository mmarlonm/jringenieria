import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface SubcontratistaEmpresa {
    idSubcontratista: number;
    nombreEmpresa: string;
    activa: boolean;
    fechaRegistro?: string;
}

export interface SubcontratistaPersonal {
    idPersonal: number;
    idSubcontratista: number;
    nombre: string;
    correo?: string;
    numero?: string;
    activo: boolean;
    fechaRegistro?: string;
    empresa?: SubcontratistaEmpresa;
}

export interface ActividadMiembro {
    id?: number;
    tipoActividad: string; // 'MAESTRA' o 'SUBACTIVIDAD'
    idActividad: number;
    origen: string; // 'JR' o 'SUBCONTRATADO'
    idMiembro: number;
}

@Injectable({
    providedIn: 'root'
})
export class SubcontratacionService {
    private _apiUrl = `${environment.apiUrl}/subcontratacion`;

    constructor(private _http: HttpClient) {}

    // Empresas
    getEmpresas(): Observable<SubcontratistaEmpresa[]> {
        return this._http.get<SubcontratistaEmpresa[]>(`${this._apiUrl}/empresas`);
    }

    guardarEmpresa(empresa: SubcontratistaEmpresa): Observable<SubcontratistaEmpresa> {
        return this._http.post<SubcontratistaEmpresa>(`${this._apiUrl}/empresas`, empresa);
    }

    eliminarEmpresa(id: number): Observable<boolean> {
        return this._http.delete<boolean>(`${this._apiUrl}/empresas/${id}`);
    }

    // Personal
    getPersonal(): Observable<SubcontratistaPersonal[]> {
        return this._http.get<SubcontratistaPersonal[]>(`${this._apiUrl}/personal`);
    }

    guardarPersonal(personal: SubcontratistaPersonal): Observable<SubcontratistaPersonal> {
        return this._http.post<SubcontratistaPersonal>(`${this._apiUrl}/personal`, personal);
    }

    eliminarPersonal(id: number): Observable<boolean> {
        return this._http.delete<boolean>(`${this._apiUrl}/personal/${id}`);
    }

    // Equipos Disponibles
    getEquiposDisponibles(): Observable<{ jr: any[], subcontratado: any[] }> {
        return this._http.get<{ jr: any[], subcontratado: any[] }>(`${this._apiUrl}/equipos-disponibles`);
    }

    // Equipo asignado a una actividad
    getActividadEquipo(tipoActividad: string, idActividad: number): Observable<ActividadMiembro[]> {
        return this._http.get<ActividadMiembro[]>(`${this._apiUrl}/actividad-equipo/${tipoActividad}/${idActividad}`);
    }

    guardarActividadEquipo(payload: { tipoActividad: string, idActividad: number, miembros: { origen: string, idMiembro: number }[] }): Observable<boolean> {
        return this._http.post<boolean>(`${this._apiUrl}/actividad-equipo`, payload);
    }
}
