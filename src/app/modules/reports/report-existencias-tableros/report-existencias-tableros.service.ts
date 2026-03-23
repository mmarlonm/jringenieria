import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ReportExistenciasTablerosService {

    private apiUrl = `${environment.apiUrl}/ReportDashboard`;

    constructor(private http: HttpClient) { }

    /**
   * Obtiene el reporte consolidado de existencias por tableros (QRO, PACH, PUE).
   * @param {Date | null} fechaCorte - Fecha opcional para el cálculo de existencias.
   * @param {boolean} esMoral - Determina si consulta Persona Moral o Física.
   * @returns {Observable<ExistenciasTablerosDto[]>} Lista de productos con sus existencias.
   */
    getExistenciasTableros(
        fechaCorte: Date | null,
        esMoral: boolean
    ): Observable<ExistenciasTablerosDto[]> {

        let params = new HttpParams().set('esMoral', esMoral.toString());

        // Solo agregamos la fecha si no es nula
        if (fechaCorte) {
            // Usamos split para enviar solo la parte de la fecha (YYYY-MM-DD) y evitar líos de zona horaria
            params = params.set('fechaCorte', fechaCorte.toISOString().split('T')[0]);
        }

        return this.http.get<ExistenciasTablerosDto[]>(
            `${this.apiUrl}/existencias-tableros`,
            { params }
        );
    }

    /**
     * Envía el DTO de traspaso al endpoint de .NET
     */
    crearTraspaso(traspaso: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/crear-traspaso`, traspaso);
    }

    /**
     * Sube la evidencia (PDF) del traspaso al servidor.
     */
    subirEvidencia(file: File): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<any>(`${this.apiUrl}/subir-evidencia-traspaso`, formData);
    }
}

/**
 * Interfaz que representa la estructura de existencias de tableros.
 * Coincide con el DTO de .NET.
 */
export interface ExistenciasTablerosDto {
    marca: string;
    linea: string;
    codigoProducto: string;
    nombreProducto: string;

    // Existencias por Tablero
    tablerO_QRO: number;
    tablerO_PACH: number;
    tablerO_PUE: number;

    // Total
    totaL_TABLEROS: number;
}
