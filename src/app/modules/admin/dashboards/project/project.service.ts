import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment'; // Asegúrate de tener la URL base de tu API aquí

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = `${environment.apiUrl}/Proyecto`; // Asegúrate de que esto sea correcto

  constructor(private http: HttpClient) { }

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

  uploadFile(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/SubirArchivo`, formData);
  }

  getFiles(projectId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ObtenerArchivos/${projectId}`);
  }

  downloadFile(proyectoId: number, categoria: string, nombreArchivo: string): Observable<Blob> {
    const url = `${this.apiUrl}/DescargarArchivo/${proyectoId}/${categoria}/${nombreArchivo}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  removeFile(proyectoId: number, categoria: string, nombreArchivo: string): Observable<any> {
    const encodedFileName = encodeURIComponent(nombreArchivo); // Manejo de caracteres especiales
    const url = `${this.apiUrl}/EliminarArchivo/${proyectoId}/${categoria}/${encodedFileName}`;
    return this.http.delete<any>(url);
  }


  getHistorial(projectId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/historial-estatus/${projectId}`);
  }
}