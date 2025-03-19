import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProspectosService {
  private apiUrl = `${environment.apiUrl}/Prospecto`;

  constructor(private http: HttpClient) {}

  get userInformation(): string {
    return localStorage.getItem("userInformation") ?? "";
  }

  // 🔸 Obtener todos los prospectos
  getProspectos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/getAll-prospectos`);
  }

  // 🔸 Obtener un prospecto por ID
  getProspectoById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/get-prospecto/${id}`);
  }

  // 🔸 Crear o actualizar prospecto
  saveProspecto(prospecto: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/save-prospecto`, prospecto);
  }

  // 🔸 Eliminar prospecto
  deleteProspecto(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete-prospecto/${id}`);
  }

  // 🔸 Obtener todos los seguimientos (comentarios) de un prospecto
  getSeguimientos(prospectoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/get-seguimientos/${prospectoId}`);
  }

  // 🔸 Agregar seguimiento (comentario)
  addSeguimiento(seguimiento: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/add-seguimiento`, seguimiento);
  }

  // 🔸 Eliminar seguimiento
  deleteSeguimiento(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/delete-seguimiento/${id}`);
  }
}