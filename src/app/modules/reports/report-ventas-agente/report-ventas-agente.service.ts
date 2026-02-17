import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';


// 🔹 Interfaz para el catálogo de agentes
export interface Agente {
  agenteId: number;
  nombreAgente: string;
}
@Injectable({
  providedIn: 'root'
})
export class ReportVentasAgenteService {

  private apiUrl = `${environment.apiUrl}/ReportDashboard`;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene la información del dashboard de ventas
   * @param sucursal Concepto / sucursal (ej. Factura Pachuca)
   * @param fechaInicio Fecha inicio del rango
   * @param fechaFin Fecha fin del rango
   */
  getDashboardVentasAgente(
    sucursal: string,
    agente: number,
    fechaInicio: Date,
    fechaFin: Date,
    esMoral: number
  ): Observable<any> {

    const params = new HttpParams()
      .set('sucursal', sucursal)
      .set('agenteId', agente)
      .set('fechaInicio', fechaInicio.toISOString())
      .set('fechaFin', fechaFin.toISOString())
      .set('esMoral', esMoral);

    return this.http.get<any>(`${this.apiUrl}/reporte-ventas-agente`, { params });
  }

  /**
   * Obtiene la lista de todos los agentes válidos
   * Ideal para poblar el <mat-select> en la vista
   */
  getAgentes(): Observable<Agente[]> {
    return this.http.get<Agente[]>(`${this.apiUrl}/agentes`);
  }
}
