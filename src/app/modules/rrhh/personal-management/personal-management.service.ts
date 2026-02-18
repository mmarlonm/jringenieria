import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PersonalManagementService {

  private readonly _http = inject(HttpClient);
  private readonly _apiUrl = `${environment.apiUrl}/RRHH`;
  private readonly _apiUrlProfile = `${environment.apiUrl}/Profile`;

  constructor() { }

  /**
   * Nombre: getPersonalInfo
   * Descripción: Obtiene el expediente completo (Info personal, laboral y horarios).
   * Parámetros: usuarioId (number)
   * Retorna: Observable con el objeto RRHHUpdateRequestDto
   */
  getPersonalInfo(usuarioId: number): Observable<any> {
    return this._http.get<any>(`${this._apiUrl}/personal-info/${usuarioId}`);
  }

  /**
   * Nombre: upsertInfo
   * Descripción: Actualiza masivamente el expediente y los horarios del empleado.
   * Parámetros: data (any - DTO RRHHUpdateRequestDto)
   */
  upsertInfo(data: any): Observable<any> {
    return this._http.put<any>(`${this._apiUrl}/update-info`, data);
  }

  /**
 * Nombre: registrarAsistencia
 * Descripción: Envía el registro de entrada o salida incluyendo coordenadas GPS y nombre del sitio.
 * Parámetros: asistencia { usuarioId: number, tipo: string, latitud?: number, longitud?: number, ubicacionNombre?: string }
 * Retorna: Observable con el resultado del proceso y cálculo de retardo/salida.
 */
  registrarAsistencia(asistencia: {
    usuarioId: number;
    tipo: string;
    latitud?: number;
    longitud?: number;
    ubicacionNombre?: string;
  }): Observable<any> {
    // Mantenemos el POST hacia el endpoint /checador
    return this._http.post<any>(`${this._apiUrl}/checador`, asistencia);
  }

  /**
   * Nombre: getDepartamentos
   * Descripción: Obtiene el catálogo de departamentos de la base de datos.
   */
  getDepartamentos(): Observable<any[]> {
    return this._http.get<any[]>(`${this._apiUrl}/departamentos`);
  }

  /**
   * Nombre: getUsers
   * Descripción: Obtiene la lista base de usuarios desde el perfil.
   */
  getUsers(): Observable<any[]> {
    return this._http.get<any[]>(`${this._apiUrlProfile}/get-users`);
  }

  /**
   * Nombre: getHorariosUsuario
   * Descripción: Obtiene únicamente los horarios configurados.
   */
  getHorariosUsuario(usuarioId: number): Observable<any[]> {
    return this._http.get<any[]>(`${this._apiUrl}/horarios/${usuarioId}`);
  }

  /**
   * Nombre: getDailyStatus
   * Descripción: Verifica si el usuario ya tiene registros de asistencia hoy.
   */
  getDailyStatus(usuarioId: number): Observable<any> {
    return this._http.get<any>(`${this._apiUrl}/checador/status/${usuarioId}`);
  }
}