import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment'; // Asegúrate de tener la URL base de tu API aquí

@Injectable({
  providedIn: 'root'
})
export class QuotesService {
    private apiUrl = `${environment.apiUrl}/Cotizacion`; // Asegúrate de que esto sea correcto

  constructor(private http: HttpClient) {}

  get userInformation(): string {
    return localStorage.getItem("userInformation") ?? "";
  }

  // Obtener todos los proyectos
  getQuotes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/cotizaciones`);
  }

  // Crear un nuevo proyecto
  createQuote(quote: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/guardar-cotizacion`, quote);
  }

  // Actualizar un proyecto existente
  updateQuote(quote: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/guardar-cotizacion`, quote);
  }

  // Eliminar un proyecto
  deleteQuote(quoteId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/eliminar-cotizacion/${quoteId}`);
  }

  getQuoteById(quoteId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/cotizacion/${quoteId}`);
  }

  getEstatus(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/estatus`);
  }
}