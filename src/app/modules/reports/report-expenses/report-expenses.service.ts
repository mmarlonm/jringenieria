import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface ChartItem {
  etiqueta: string;
  valor: number;
}

export interface DashboardReportResponse {
  kpis: {
    totalGastos: number;
    proporcionGastosVentas: number;
  };
  graficaTiempo: ChartItem[];
  graficaArea: ChartItem[];
  graficaConcepto: ChartItem[];
  graficaTipo: ChartItem[];
}

@Injectable({
  providedIn: 'root'
})
export class ReportExpensesService {

  private apiUrl = `${environment.apiUrl}/Gastos`;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene la estructura de gráficas y KPIs con filtros aplicados
   */
  getDashboardData(
    unidadId: number,
    anio: number,
    meses: number[] = [],
    areas: string[] = [],
    conceptos: string[] = []
  ): Observable<DashboardReportResponse> {
    let params = new HttpParams()
      .set('anio', anio.toString());

    if (meses.length > 0) params = params.set('meses', meses.join(','));
    if (areas.length > 0) params = params.set('areas', areas.join(','));
    if (conceptos.length > 0) params = params.set('conceptos', conceptos.join(','));

    return this.http.get<DashboardReportResponse>(`${this.apiUrl}/Dashboard/${unidadId}`, { params });
  }
}