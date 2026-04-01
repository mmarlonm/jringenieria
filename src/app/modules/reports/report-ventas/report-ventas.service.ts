import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportVentasService {

  private apiUrl = `${environment.apiUrl}/ReportDashboard`;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene la información del dashboard de ventas
   * @param sucursal Concepto / sucursal (ej. Factura Pachuca)
   * @param fechaInicio Fecha inicio del rango
   * @param fechaFin Fecha fin del rango
   */
  getDashboardVentas(
    sucursal: string,
    fechaInicio: Date,
    fechaFin: Date,
    esMoral: string
  ): Observable<any> {

    const params = new HttpParams()
      .set('sucursal', sucursal)
      .set('fechaInicio', fechaInicio.toISOString())
      .set('fechaFin', fechaFin.toISOString())
      .set('esMoral', esMoral);

    return this.http.get<any>(`${this.apiUrl}/reporte-ventas`, { params });
  }

  /**
   * Genera el Reporte Ejecutivo impulsado por IA (Gemini).
   * Endpoint: api/ReportDashboard/reporte-ejecutivo-ia
   */
  generarReporteIA(
    sucursal: string,
    fechaInicio: Date,
    fechaFin: Date,
    esMoral: string
  ): Observable<Blob> {
    const params = new HttpParams()
      .set('sucursal', sucursal)
      .set('fechaInicio', fechaInicio.toISOString())
      .set('fechaFin', fechaFin.toISOString())
      .set('esMoral', esMoral);

    return this.http.post(`${this.apiUrl}/reporte-ejecutivo-ia`, {}, { 
        params, 
        responseType: 'blob' 
    });
  }
}
