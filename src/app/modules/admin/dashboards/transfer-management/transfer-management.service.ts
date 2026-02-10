import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TransferManagementService {

  private apiUrl = `${environment.apiUrl}/Traspasos`;
  private apiUrlProyecto = `${environment.apiUrl}/Proyecto`;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene el historial de traspasos con filtros opcionales
   */
  getHistorial(sucursalId?: number | null, estadoId?: number | null): Observable<any[]> {
    let params = new HttpParams();
    if (sucursalId) params = params.set('sucursalId', sucursalId.toString());
    if (estadoId) params = params.set('estadoId', estadoId.toString());

    return this.http.get<any[]>(`${this.apiUrl}/historial`, { params });
  }

  /**
   * Actualiza el estado de un traspaso (Aprobar, Rechazar, etc.)
   * @param idTraspaso ID del registro
   * @param nuevoEstadoId ID del estado (2: Completado, 3: Rechazado)
   * @param idUsuarioRecibe ID del usuario que procesa la acción
   */
  actualizarEstado(idTraspaso: number, nuevoEstadoId: number, idUsuarioRecibe: number): Observable<any> {
    const params = new HttpParams()
      .set('nuevoEstadoId', nuevoEstadoId.toString())
      .set('idUsuarioRecibe', idUsuarioRecibe.toString());

    // Se envía un body vacío {} ya que los parámetros van por Query String según el controlador
    return this.http.put<any>(`${this.apiUrl}/actualizar-estado/${idTraspaso}`, {}, { params });
  }

  /**
   * Alias específico para la recepción (si tu controlador prefiere este endpoint)
   */
  aprobarRecepcion(idTraspaso: number, idUsuarioRecibe: number, transportista?: string, guia?: string): Observable<any> {
    let params = new HttpParams().set('idUsuarioRecibe', idUsuarioRecibe.toString());
    if (transportista) params = params.set('transportista', transportista);
    if (guia) params = params.set('guia', guia);

    return this.http.put<any>(`${this.apiUrl}/aprobar-recepcion/${idTraspaso}`, {}, { params });
  }

  getPendientesDestino(idSucursalDestino: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/pendientes-destino/${idSucursalDestino}`);
  }

  getUnidadesDeNegocio(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrlProyecto}/unidades-negocio`);
  }
}