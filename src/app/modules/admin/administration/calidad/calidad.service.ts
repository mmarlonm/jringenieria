import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';

export interface ParetoItem {
    categoria: string;
    frecuencia: number;
    porcentaje: number;
    porcentajeAcumulado: number;
}

export interface ParetoResultado {
    items: ParetoItem[];
    totalFrecuencia: number;
}

export interface HerramientaCalidad {
    id?: number;
    crmReferenciaId?: number;
    tipoHerramienta: 'Pareto' | 'Ishikawa' | 'MapaMental' | 'SCAMPER';
    titulo: string;
    datosJson: string;
    fechaCreacion?: string;
}

@Injectable({
    providedIn: 'root'
})
export class CalidadService {
    private _http = inject(HttpClient);
    private _apiUrl = `${environment.apiUrl}/calidad`;

    getParetoIncidentes(): Observable<ParetoResultado> {
        return this._http.get<ParetoResultado>(`${this._apiUrl}/pareto-incidentes`);
    }

    guardarHerramienta(herramienta: any): Observable<any> {
        return this._http.post<any>(`${this._apiUrl}/herramienta`, herramienta);
    }

    getHerramientasPorTipo(tipo: string): Observable<any[]> {
        return this._http.get<any[]>(`${this._apiUrl}/herramienta/${tipo}`);
    }

    convertirEnTarea(tarea: { titulo: string; comentarios: string; proyectoId?: number; prioridad?: string; rolArea?: string }): Observable<any> {
        return this._http.post<any>(`${this._apiUrl}/convertir-en-tarea`, tarea);
    }

    eliminarHerramienta(tipo: string, titulo: string): Observable<any> {
        return this._http.delete<any>(`${this._apiUrl}/herramienta/${tipo}/${encodeURIComponent(titulo)}`);
    }

    getSpcControl(): Observable<any> {
        return this._http.get<any>(`${this._apiUrl}/spc-control`);
    }
}

