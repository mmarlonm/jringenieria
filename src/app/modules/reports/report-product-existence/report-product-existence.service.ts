import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportProductExistenceService {

  private apiUrl = `${environment.apiUrl}/ReportDashboard`;

  constructor(private http: HttpClient) { }

  /**
 * Obtiene el reporte consolidado de existencias por sucursal (QRO, PACH, PUE).
 * @param {Date | null} fechaCorte - Fecha opcional para el cálculo de existencias.
 * @param {boolean} esMoral - Determina si consulta Persona Moral o Física.
 * @returns {Observable<ExistenciaSucursalDto[]>} Lista de productos con sus existencias.
 */
  getExistenciasPorSucursal(
    fechaCorte: Date | null,
    esMoral: boolean
  ): Observable<ExistenciaSucursalDto[]> {

    let params = new HttpParams().set('esMoral', esMoral.toString());

    // Solo agregamos la fecha si no es nula
    if (fechaCorte) {
      // Usamos split para enviar solo la parte de la fecha (YYYY-MM-DD) y evitar líos de zona horaria
      params = params.set('fechaCorte', fechaCorte.toISOString().split('T')[0]);
    }

    return this.http.get<ExistenciaSucursalDto[]>(
      `${this.apiUrl}/existencias-productos`,
      { params }
    );
  }

  /**
   * Envía el DTO de traspaso al endpoint de .NET
   * @param traspaso Objeto con la información del movimiento y sus detalles
   * @returns Observable con la respuesta del servidor (success, id, message)
   */
  crearTraspaso(traspaso: TraspasoDto): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/crear-traspaso`, traspaso);
  }

  /**
   * Sube la evidencia (PDF) del traspaso al servidor.
   * @param file Archivo PDF a subir.
   * @returns Observable con la URL de la evidencia.
   */
  subirEvidencia(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    // Siguiendo el patrón de otros servicios de la app para subida de archivos
    return this.http.post<any>(`${this.apiUrl}/subir-evidencia-traspaso`, formData);
  }
}
/**
 * Interfaz que representa la estructura de existencias por sucursal.
 * Coincide con el DTO de .NET y la salida del SP.
 */
export interface ExistenciaSucursalDto {
  codigoProducto: string;
  nombreProducto: string;

  // Mapeo directo de los alias del SQL
  qro: number;   // Viene como QRO
  pach: number;  // Viene como PACH
  pue: number;   // Viene como PUE
  total: number; // Viene como TOTAL
}


export interface TraspasoDetalleDto {
  codigoProducto: string;
  cantidadEnviada: number;
  nombreProducto: string;
}

export interface TraspasoDto {
  idAlmacenOrigen: number;
  almacenOrigenNombre: string;
  idAlmacenDestino: number;
  almacenDestinoNombre: string;
  idUsuarioEnvia: number;
  idUsuarioDestino: number;
  observaciones?: string;
  detalles: TraspasoDetalleDto[];

  // 🔹 NUEVOS CAMPOS (SOP ALMACENES)
  guiaRastreo?: string;
  transportista?: string;
  tipoEnvio: string;      // "PAQUETERIA" | "INTERNO"
  destinoFinal: string;   // "SUCURSAL" | "CLIENTE"
  datosLogistica: string;
  urlEvidenciaEnvio: string;
}
