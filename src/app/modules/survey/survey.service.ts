import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface EncuestaDTO {
  proyectoId: number;

  nombre: string;
  empresa: string;
  email: string;
  telefono: string;

  servicioPersonal: number;
  razonServicio: string;

  recomendarProductos: number;
  razonRecomendar: string;

  ayudaProducto: number;
  razonAyuda: string;

  comprensionNecesidades: number;
  razonComprension: string;

  tiempoEntrega: number;
  razonEntrega: string;

  frecuencia: string;
  productosDeseados: string;
  comoConocio: string;
}

export interface ResponseDTO {
  code: number;
  message: string;
  data: any;
}

@Injectable({
  providedIn: 'root'
})
export class SurveyService {
  private apiUrl = `${environment.apiUrl}/Encuesta`;

  constructor(private http: HttpClient) {}

  guardarEncuesta(encuesta: EncuestaDTO): Observable<ResponseDTO> {
    return this.http.post<ResponseDTO>(`${this.apiUrl}/guardar`, encuesta);
  }

  existeEncuesta(proyectoId: number): Observable<boolean> {
  return this.http.get<ResponseDTO>(`${this.apiUrl}/existe/${proyectoId}`)
    .pipe(map(res => res.code === 200));
}

}
