import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';
import { FormularioReporteResumenDto, ReporteEncuestaDetalleDto } from './reporte-encuesta.types';

@Injectable({
    providedIn: 'root'
})
export class ReporteEncuestaService {
    private _http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/EncuestaReporte`;

    obtenerFormularios(tipo: 'producto' | 'servicio'): Observable<FormularioReporteResumenDto[]> {
        const plural = tipo === 'producto' ? 'productos' : 'servicios';
        return this._http.get<FormularioReporteResumenDto[]>(`${this.baseUrl}/${plural}/formularios`);
    }

    obtenerReporte(
        tipo: 'producto' | 'servicio',
        formularioId: number,
        desde?: string | null,
        hasta?: string | null
    ): Observable<ReporteEncuestaDetalleDto> {
        const plural = tipo === 'producto' ? 'productos' : 'servicios';
        let params = new HttpParams();
        if (desde && desde.trim()) {
            params = params.set('desde', desde.trim());
        }
        if (hasta && hasta.trim()) {
            params = params.set('hasta', hasta.trim());
        }
        return this._http.get<ReporteEncuestaDetalleDto>(`${this.baseUrl}/${plural}/formularios/${formularioId}`, { params });
    }
}

