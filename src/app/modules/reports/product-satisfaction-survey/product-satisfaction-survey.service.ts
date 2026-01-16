import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';
import { ProductSatisfactionReport } from './models/product-satisfaction-report.model';
import { ProductSatisfactionReportFilter } from './models/product-satisfaction-report-filter.dto';

@Injectable({
  providedIn: 'root'
})
export class ProductSatisfactionSurveyService {

  private readonly apiUrl = `${environment.apiUrl}/encuesta`;
  private apiUrlProyecto = `${environment.apiUrl}/Proyecto`; // Asegúrate de que esto sea correcto

  constructor(private http: HttpClient) {}

   /**
   * Obtiene el reporte de encuestas de satisfacción de productos
   * con filtros por fecha y sucursal
   */
  getReport(
    filter: ProductSatisfactionReportFilter
  ): Observable<ProductSatisfactionReport[]> {

    let params = new HttpParams()
      .set('fechaInicio', filter.fechaInicio)
      .set('fechaFin', filter.fechaFin);

    return this.http.get<ProductSatisfactionReport[]>(
      `${this.apiUrl}/report-product`,
      { params }
    );
  }

  // Obtener Unidades de Negocio
  getUnidadesDeNegocio(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrlProyecto}/unidades-negocio`);
  }
}
