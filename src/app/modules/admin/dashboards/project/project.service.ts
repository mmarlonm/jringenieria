import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment'; // Asegúrate de tener la URL base de tu API aquí

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
    private apiUrl = `${environment.apiUrl}/Proyecto`; // Asegúrate de que esto sea correcto

  constructor(private http: HttpClient) {}

  // Obtener todos los proyectos
  getProjects(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/proyectos`);
  }

  // Obtener Unidades de Negocio
  getUnidadesDeNegocio(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/unidades-negocio`);
  }

  // Obtener Categorías
  getCategorias(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/categorias`);
  }

  // Crear un nuevo proyecto
  createProject(project: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/guardar-proyecto`, project);
  }

  // Actualizar un proyecto existente
  updateProject(project: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/guardar-proyecto`, project);
  }

  // Eliminar un proyecto
  deleteProject(projectId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/eliminar-proyecto/${projectId}`);
  }

  getProjectById(projectId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/proyecto/${projectId}`);
  }

  getEstatus(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/estatus`);
  }
}