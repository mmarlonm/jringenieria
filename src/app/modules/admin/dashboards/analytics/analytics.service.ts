import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, tap } from "rxjs";
import { environment } from "environments/environment"; // Asegúrate de tener la URL base de tu API aquí

@Injectable({ providedIn: "root" })
export class AnalyticsService {
  private _data: BehaviorSubject<any> = new BehaviorSubject(null);
  private apiUrl = `${environment.apiUrl}/Analitica`; // Asegúrate de que esto sea correcto

  /**
   * Constructor
   */
  constructor(private _httpClient: HttpClient) {}

  // -----------------------------------------------------------------------------------------------------
  // @ Accessors
  // -----------------------------------------------------------------------------------------------------

  /**
   * Getter for data
   */
  get data$(): Observable<any> {
    return this._data.asObservable();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Get data
   */
  getData(): Observable<any> {
    return this._httpClient.get("api/dashboards/project").pipe(
      tap((response: any) => {
        this._data.next(response);
      })
    );
  }

  // Obtener todos los proyectos
  getAnalitica(): Observable<any[]> {
    return this._httpClient.get<any[]>(`${this.apiUrl}/resumen-estatus`);
  }

  // Obtener ubicaciones de prospectos o clientes
  getMapa(tipo: string): Observable<any[]> {
    const params = new HttpParams().set("tipo", tipo);
    return this._httpClient.get<any[]>(`${this.apiUrl}/mapa`, { params });
  }
}
