import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';
import { ServiceSatisfactionReport } from './models/project-satisfaction-report.model';
import { ProjectSatisfactionReportFilter } from './models/project-satisfaction-report-filter.dto';

@Injectable({
  providedIn: 'root'
})
export class ProductSatisfactionSurveyService {

  private readonly apiUrl = `${environment.apiUrl}/encuesta`;
  private apiUrlProyecto = `${environment.apiUrl}/Proyecto`; // Asegúrate de que esto sea correcto

  constructor(private http: HttpClient) {}

   /**
   * Obtiene el reporte de encuestas de satisfacción de proyectos
   * con filtros por fecha y sucursal
   */
  getReport(
    filter: ProjectSatisfactionReportFilter
  ): Observable<ServiceSatisfactionReport[]> {

    let params = new HttpParams()
      .set('fechaInicio', filter.fechaInicio)
      .set('fechaFin', filter.fechaFin);

    return this.http.get<ServiceSatisfactionReport[]>(
      `${this.apiUrl}/report-project`,
      { params }
    );
  }

  // Obtener Unidades de Negocio
  getUnidadesDeNegocio(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrlProyecto}/unidades-negocio`);
  }
}
