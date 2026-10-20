import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';
import { ReporteFormulario } from './reporte-respuestas.types';

@Injectable({
  providedIn: 'root'
})
export class ReporteRespuestasService {
  private _http = inject(HttpClient);
  private readonly _api = `${environment.apiUrl}/FormulariosRegistro`;

  getReporte(formularioId: number, desde?: string | null, hasta?: string | null): Observable<ReporteFormulario> {
    let params = new HttpParams();

    if (desde) {
      params = params.append('desde', desde);
    }
    if (hasta) {
      params = params.append('hasta', hasta);
    }

    return this._http.get<ReporteFormulario>(`${this._api}/${formularioId}/reporte`, { params });
  }
}
