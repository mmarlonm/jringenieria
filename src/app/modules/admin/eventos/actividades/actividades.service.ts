import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface ActividadStaff {
    id: number;
    personalStaffId: number;
    personalStaffNombre?: string;
    eventoId: number;
    eventoNombre?: string;
    titulo: string;
    descripcion?: string;
    fechaInicio: string;
    fechaFin: string;
    fechaRegistro?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ActividadesService {
    private _http = inject(HttpClient);
    private readonly apiBase = environment.apiUrl;

    getAll(eventoId?: number): Observable<ActividadStaff[]> {
        const query = eventoId ? `?eventoId=${eventoId}` : '';
        return this._http.get<ActividadStaff[]>(`${this.apiBase}/Actividades${query}`);
    }

    getByPersonal(personalId: number, eventoId?: number): Observable<ActividadStaff[]> {
        const query = eventoId ? `?eventoId=${eventoId}` : '';
        return this._http.get<ActividadStaff[]>(`${this.apiBase}/Actividades/personal/${personalId}${query}`);
    }

    save(actividad: any): Observable<any> {
        return this._http.post<any>(`${this.apiBase}/Actividades`, actividad);
    }

    delete(id: number): Observable<any> {
        return this._http.delete<any>(`${this.apiBase}/Actividades/${id}`);
    }

    getPublicActivitiesByToken(tokenQr: string): Observable<{ personal: any; actividades: any[] }> {
        return this._http.get<{ personal: any; actividades: any[] }>(`${this.apiBase}/Actividades/public/token/${tokenQr}`);
    }
}
