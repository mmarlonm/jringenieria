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
   * Fase 3: Procesar el envío de un traspaso (Almacén Origen)
   */
  procesarEnvio(idTraspaso: number, payload: { transportista: string, guiaRastreo: string, urlEvidenciaEnvio: string }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/procesar-envio/${idTraspaso}`, payload);
  }

  /**
   * Fase 4: Aprobar la recepción de un traspaso (Almacén Destino)
   */
  aprobarRecepcion(idTraspaso: number, payload: { idUsuarioRecibe: number, conDiferencias: boolean, observaciones: string, urlEvidenciaRecepcion: string, folioContpaqi: string }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/aprobar-recepcion/${idTraspaso}`, payload);
  }

  /**
   * Sube la evidencia (PDF/Imagen) del traspaso al servidor.
   * @param idTraspaso ID del traspaso
   * @param tipoEvidencia "Envio" | "Recepcion"
   * @param archivo El archivo físico
   */
  subirEvidencia(idTraspaso: number, tipoEvidencia: 'Envio' | 'Recepcion', archivo: File): Observable<any> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('tipoEvidencia', tipoEvidencia);

    return this.http.post<any>(`${this.apiUrl}/${idTraspaso}/subir-evidencia`, formData);
  }


  /**
   * Descarga un archivo de evidencia dado su ruta relativa
   */
  descargarEvidencia(rutaRelativa: string): Observable<any> {
    const params = new HttpParams().set('rutaRelativa', rutaRelativa);
    return this.http.get<any>(`${this.apiUrl}/descargar-evidencia`, { params });
  }

  getPendientesDestino(idSucursalDestino: number): Observable<any[]> {

    return this.http.get<any[]>(`${this.apiUrl}/pendientes-destino/${idSucursalDestino}`);
  }

  getUnidadesDeNegocio(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrlProyecto}/unidades-negocio`);
  }
}