import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QuotesService {
  private apiUrl = `${environment.apiUrl}/CotizacionProductos`;
  private apiUrlCotizacion = `${environment.apiUrl}/Cotizacion`; // Asegúrate de que esto sea correcto


  constructor(private http: HttpClient) {}

  get userInformation(): string {
    return localStorage.getItem("userInformation") ?? "";
  }

  // Obtener todas las cotizaciones
  getQuotes(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Obtener una cotización por ID
  getQuoteById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // Crear o actualizar una cotización
  saveQuote(quote: any): Observable<any> {
    return this.http.post(this.apiUrl, quote);
  }

  // Eliminar una cotización
  deleteQuote(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  buscarProducto(q: string): Observable<any> {
  return this.http.get<any>(`${this.apiUrl}/productos`, {
    params: { q }
  });
}
getEstatus(): Observable<any> {
    return this.http.get<any>(`${this.apiUrlCotizacion}/estatus`);
  }

  getHistorial(quoteId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/historial-estatus/${quoteId}`);
  }

  enviarEncuesta(dto: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/enviar-correo`, dto);
  }


}