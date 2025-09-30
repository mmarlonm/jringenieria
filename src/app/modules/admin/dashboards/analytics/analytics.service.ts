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
  constructor(private _httpClient: HttpClient) { }

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

  // Obtener datos para grafica de embudo
  getDataGraf(fechaInicio: Date, fechaFin: Date): Observable<any[]> {
    let params = new HttpParams()
      // Convertimos la fecha a string en formato 'yyyy-MM-dd'
      .set("fechaInicio", fechaInicio.toISOString().split("T")[0])
      .set("fechaFin", fechaFin.toISOString().split("T")[0]);

    return this._httpClient.get<any[]>(`${this.apiUrl}/embudo-report`, { params });
  }

  // Servicio Angular
  getProspectosIA(lat: number, lon: number, prospectosExistentes: string[]): Observable<any[]> {
    const body = {
      lat,
      lon,
      prospectosExistentes
    };

    return this._httpClient.post<any[]>(`${this.apiUrl}/prospectos`, body);
  }


  /**
   * Optimiza la ruta usando los prospectos sugeridos.
   * @param prospectos Lista completa de prospectos obtenidos desde el mapa
   */
  optimizarRuta(prospectos: any[]): Observable<any[]> {
    if (prospectos.length === 0) {
      console.warn("No hay prospectos sugeridos para optimizar.");
      return new Observable(observer => {
        observer.next([]);
        observer.complete();
      });
    }

    // Enviar al backend
    const body = prospectos.map(p => ({
      Nombre: p.nombre,
      Tipo: p.categoria || "desconocida",
      Latitud: p.lat,
      Longitud: p.lon
    }));

    console.log("Enviando prospectos a optimizar:", body);

    return this._httpClient.post<any[]>(`${this.apiUrl}/optimizar-ruta`, body);
  }

}
