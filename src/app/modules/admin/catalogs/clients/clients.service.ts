import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment'; // Asegúrate de tener la URL base de tu API aquí

@Injectable({
  providedIn: 'root'
})
export class ClientsService {
    private apiUrl = `${environment.apiUrl}/Cliente`; // Asegúrate de que esto sea correcto

  constructor(private http: HttpClient) {}

  // Obtener todos los proyectos
  getClient(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/getAll-cliente`);
  }

  // Crear un nuevo proyecto
  createClient(project: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/save-cliente`, project);
  }

  // Actualizar un proyecto existente
  updateClient(project: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/save-cliente`, project);
  }

  // Eliminar un proyecto
  deleteClient(projectId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/delete-cliente/${projectId}`);
  }

  getClientById(projectId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/get-cliente/${projectId}`);
  }
}