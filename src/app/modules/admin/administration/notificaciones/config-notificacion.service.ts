import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface ConfigNotificacionDto {
  id: number;
  contexto: string;
  usuarioId: number;
  nombreUsuario: string;
  email?: string;
  telefono?: string;
  recibeEmail: boolean;
  recibeWhatsApp: boolean;
  recibeInApp: boolean;
  puedeAprobar: boolean;
  esAdmin: boolean;
  activo: boolean;
}

export interface GuardarConfigNotificacionDto {
  id?: number;
  contexto: string;
  usuarioId: number;
  recibeEmail: boolean;
  recibeWhatsApp: boolean;
  recibeInApp: boolean;
  puedeAprobar: boolean;
  esAdmin: boolean;
  activo: boolean;
}

export interface ContextoDescripcionDto {
  clave: string;
  nombre: string;
  descripcion: string;
  tieneAprobacion: boolean;
  tieneAdmin: boolean;
}

export interface UsuarioBasico {
  usuarioId: number;
  nombreUsuario: string;
  email?: string;
  telefono?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfigNotificacionService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/config-notificacion`;

  /** Catálogo de contextos disponibles */
  obtenerCatalogo(): Observable<ContextoDescripcionDto[]> {
    return this.http.get<ContextoDescripcionDto[]>(`${this.base}/contextos`);
  }

  /** Todas las configuraciones */
  obtenerTodas(): Observable<ConfigNotificacionDto[]> {
    return this.http.get<ConfigNotificacionDto[]>(this.base);
  }

  /** Configuraciones de un contexto específico */
  obtenerPorContexto(contexto: string): Observable<ConfigNotificacionDto[]> {
    return this.http.get<ConfigNotificacionDto[]>(`${this.base}/${contexto}`);
  }

  /** Crear o actualizar (upsert por Contexto+UsuarioId) */
  guardar(dto: GuardarConfigNotificacionDto): Observable<ConfigNotificacionDto> {
    return this.http.post<ConfigNotificacionDto>(this.base, dto);
  }

  /** Eliminar por ID */
  eliminar(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.base}/${id}`);
  }
}
