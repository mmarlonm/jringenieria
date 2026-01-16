import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from 'environments/environment';


/* ============================
   DTO PRODUCTOS
============================ */

export interface EncuestaProductosDTO {
  cotizacionProductoId: number;
  sucursal: number;

  nombre: string;
  empresa: string;
  email: string;
  telefono: string;
  cargo: string;

  servicioPersonal: number;
  recomendarProductos: number;
  ayudaProducto: number;
  comprensionNecesidades: number;
  tiempoEntrega: number;

  razonServicio: string;

  productosDeseados: string;
  comoConocio: string;
}

/* ============================
   RESPONSE
============================ */

export interface ResponseDTO {
  code: number;
  message: string;
  data: any;
}

@Injectable({
  providedIn: 'root'
})
export class SurveyProductosService {

  private apiUrl = `${environment.apiUrl}/Encuesta`;

  constructor(private http: HttpClient) {}

  // ============================
  // ENCUESTAS PRODUCTOS
  // ============================

  guardarEncuestaProducto(
    encuesta: EncuestaProductosDTO
  ): Observable<ResponseDTO> {
    return this.http.post<ResponseDTO>(
      `${this.apiUrl}/productos/guardar`,
      encuesta
    );
  }

  existeEncuestaProducto(
    cotizacionProductoId: number
  ): Observable<boolean> {
    return this.http
      .get<ResponseDTO>(
        `${this.apiUrl}/productos/existe/${cotizacionProductoId}`
      )
      .pipe(map(res => res.code === 200));
  }

  obtenerEncuestaProductoPorId(id: number): Observable<ResponseDTO> {
    return this.http.get<ResponseDTO>(
      `${this.apiUrl}/productos/${id}`
    );
  }

  obtenerTodasEncuestasProductos(): Observable<ResponseDTO> {
    return this.http.get<ResponseDTO>(
      `${this.apiUrl}/productos/todas`
    );
  }
}
