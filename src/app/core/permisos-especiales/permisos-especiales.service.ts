import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { AuthUtils } from 'app/core/auth/auth.utils';
import { environment } from 'environments/environment';
import { Observable, of, tap } from 'rxjs';
import {
    ActualizarPermisoEspecial, AsignacionPermiso, PermisoDeUsuario, PermisoEspecial
} from './permisos-especiales.types';

/**
 * Permisos especiales del usuario con sesión (para mostrar u ocultar botones) y administración de asignaciones.
 * La validación real la hace el API; aquí solo se oculta lo que el usuario no puede usar.
 */
@Injectable({ providedIn: 'root' })
export class PermisosEspecialesService {
    private _http = inject(HttpClient);
    private _api = `${environment.apiUrl}/PermisosEspeciales`;
    private _codigos = signal<ReadonlySet<string>>(new Set<string>());

    /**
     * Carga los permisos del usuario actual (se llama al entrar a la aplicación).
     * Sin sesión vigente no pide nada: el API respondería 401 y el interceptor cerraría la sesión
     * (por ejemplo, en la pantalla de inicio de sesión).
     */
    cargar(): Observable<string[]> {
        const token = localStorage.getItem('accessToken');
        if (!token || AuthUtils.isTokenExpired(token)) {
            this._codigos.set(new Set<string>());
            return of([]);
        }

        return this._http.get<string[]>(`${this._api}/mis-permisos`).pipe(
            tap(codigos => this._codigos.set(new Set((codigos || []).map(c => c.toLowerCase()))))
        );
    }

    /** ¿El usuario actual tiene este permiso especial? Ejemplo: tiene('compras.documentos.revisar'). */
    tiene(codigo: string): boolean {
        return this._codigos().has(codigo.toLowerCase());
    }

    // ---- Administración (requiere la vista «Permisos especiales»)
    getCatalogo(): Observable<PermisoEspecial[]> {
        return this._http.get<PermisoEspecial[]>(`${this._api}/catalogo`);
    }

    actualizar(id: number, dto: ActualizarPermisoEspecial): Observable<PermisoEspecial> {
        return this._http.put<PermisoEspecial>(`${this._api}/${id}`, dto);
    }

    getAsignaciones(permisoId: number): Observable<AsignacionPermiso[]> {
        return this._http.get<AsignacionPermiso[]>(`${this._api}/${permisoId}/asignaciones`);
    }

    asignar(permisoId: number, usuarioId: number): Observable<AsignacionPermiso> {
        return this._http.post<AsignacionPermiso>(`${this._api}/${permisoId}/asignaciones`, { usuarioId });
    }

    quitar(asignacionId: number): Observable<{ mensaje: string }> {
        return this._http.delete<{ mensaje: string }>(`${this._api}/asignaciones/${asignacionId}`);
    }

    getPermisosDeUsuario(usuarioId: number): Observable<PermisoDeUsuario[]> {
        return this._http.get<PermisoDeUsuario[]>(`${this._api}/usuario/${usuarioId}`);
    }
}
