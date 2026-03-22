import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { CierreTerminal, CierreTerminalResponse } from './cierre-terminal.types';

@Injectable({
    providedIn: 'root'
})
export class CierreTerminalService {
    private _httpClient = inject(HttpClient);
    private readonly _baseUrl = `${environment.apiUrl}/CierreTerminal`;

    constructor() { }

    /**
     * Obtener todos los cierres
     */
    getAll(): Observable<CierreTerminal[]> {
        return this._httpClient.get<CierreTerminal[]>(this._baseUrl);
    }

    /**
     * Obtener un cierre por ID (con detalle anidado)
     */
    getById(id: number): Observable<CierreTerminalResponse> {
        return this._httpClient.get<CierreTerminalResponse>(`${this._baseUrl}/${id}`);
    }

    /**
     * Crear un nuevo cierre
     */
    create(cierre: CierreTerminal): Observable<number> {
        return this._httpClient.post<number>(this._baseUrl, cierre);
    }

    /**
     * Actualizar un cierre existente (solo datos)
     */
    update(id: number, cierre: CierreTerminal): Observable<any> {
        return this._httpClient.put(`${this._baseUrl}/${id}`, cierre);
    }

    /**
     * Eliminar un cierre
     */
    delete(id: number): Observable<any> {
        return this._httpClient.delete(`${this._baseUrl}/${id}`);
    }

    /**
     * Subir evidencias para un cierre específico
     */
    subirEvidencias(id: number, files: File[]): Observable<any> {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('archivos', file);
        });
        return this._httpClient.post(`${this._baseUrl}/SubirEvidencias/${id}`, formData);
    }

    /**
     * Descargar evidencia (Llamada al API)
     */
    descargarEvidencia(id: number, nombreArchivo: string): Observable<any> {
        return this._httpClient.get<any>(`${this._baseUrl}/DescargarEvidencia?id=${id}&nombreArchivo=${nombreArchivo}`);
    }

    /**
     * Descargar evidencia (Helper para la URL, mantenido por compatibilidad si se usa directamente)
     */
    getEvidenciaUrl(id: number, nombreArchivo: string): string {
        // Updated to use the specific DescargarEvidencia endpoint with query parameters
        return `${this._baseUrl}/DescargarEvidencia?id=${id}&nombreArchivo=${nombreArchivo}`;
    }
}
