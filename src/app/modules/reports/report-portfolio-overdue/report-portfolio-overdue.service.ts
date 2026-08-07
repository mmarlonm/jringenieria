import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportPortfolioOverdueService {

  private apiUrl = `${environment.apiUrl}/ReportDashboard`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene la información del dashboard de ventas
   * @param sucursal Concepto / sucursal (ej. Factura Pachuca)
   * @param fechaInicio Fecha inicio del rango
   * @param fechaFin Fecha fin del rango
   */
  getDashboardReport(
    sucursal: string | null,
    fechaInicio: Date,
    fechaFin: Date,
    esMoral: boolean
  ): Observable<any> {

    let params = new HttpParams()
      .set('fechaInicio', fechaInicio.toISOString())
      .set('fechaFin', fechaFin.toISOString())
      .set('esMoral', esMoral.toString());

    if (sucursal) {
      params = params.set('sucursal', sucursal);
    }

    return this.http.get<any>(`${this.apiUrl}/cartera-vencida`, { params });
  }
}
