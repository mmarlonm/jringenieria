import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
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

    // 🔹 Si es reporte moral (valor 2) y se seleccionó el agente 22 (ADRIAN GOMEZ), sumamos 1 al ID (sería 23)
    const agenteFinal = (esMoral === 2 && agente === 22) ? (agente + 2) : agente;

    const params = new HttpParams()
      .set('sucursal', sucursal)
      .set('agenteId', agenteFinal)
      .set('fechaInicio', fechaInicio.toISOString())
      .set('fechaFin', fechaFin.toISOString())
      .set('esMoral', esMoral);

    return this.http.get<any>(`${this.apiUrl}/reporte-ventas-agente`, { params });
  }

  /**
   * Obtiene la lista de todos los agentes válidos filtrados por sucursal
   * Ideal para poblar el <mat-select> en la vista
   */
  getAgentes(sucursal?: string): Observable<Agente[]> {
    let params = new HttpParams();
    if (sucursal && sucursal !== 'TODAS') {
      params = params.set('sucursal', sucursal);
    }

    return this.http.get<Agente[]>(`${this.apiUrl}/agentes`, { params }).pipe(
      map(agentes => agentes.map(agente => ({
        ...agente,
        nombreAgente: agente.nombreAgente === 'ADRIAN GOMEZ CHACATL' ? 'ADRIAN GOMEZ' : agente.nombreAgente
      })))
    );
  }
}
