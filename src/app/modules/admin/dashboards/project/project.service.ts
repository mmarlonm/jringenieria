import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment'; // Asegúrate de tener la URL base de tu API aquí

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = `${environment.apiUrl}/Proyecto`; // Asegúrate de que esto sea correcto
  private apiUrlCotizacion = `${environment.apiUrl}/Cotizacion`; // Asegúrate de que esto sea correcto
  private apiUrlAuth = `${environment.apiUrl}/Auth`;
  private apiUrlNotificaciones = `${environment.apiUrl}/Notificacion`;

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

  downloadFileCotizacion(proyectoId: number, categoria: string, nombreArchivo: string): Observable<Blob> {
    const url = `${this.apiUrlCotizacion}/DescargarArchivoCotizacion/${proyectoId}/${categoria}/${nombreArchivo}`;
    return this.http.get(url, { responseType: 'blob' });
  }


  getToken(proyectoId: number, categoria: string, nombreArchivo: string): Observable<any> {

    // 1. Define los parámetros de consulta
    let params = new HttpParams()
      .set('proyectoId', proyectoId)
      .set('categoria', categoria)
      .set('nombreArchivo', nombreArchivo);

    // 2. Construye la URL base del endpoint
    // Suponiendo que tu endpoint está en: [Route("api/onlyoffice")] y [HttpGet("token")]
    const url = `${this.apiUrlAuth}/token`;

    // 3. Envía la solicitud con los parámetros
    return this.http.get<any>(url, { params: params });
  }

  removeFile(proyectoId: number, categoria: string, nombreArchivo: string): Observable<any> {
    const encodedFileName = encodeURIComponent(nombreArchivo); // Manejo de caracteres especiales
    const url = `${this.apiUrl}/EliminarArchivo/${proyectoId}/${categoria}/${encodedFileName}`;
    return this.http.delete<any>(url);
  }


  getHistorial(projectId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/historial-estatus/${projectId}`);
  }

  getArchivoHistorial(archivoProjectId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/getArchivoHistorial/${archivoProjectId}`);
  }

  enviarEncuesta(dto: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/enviar-correo`, dto);
  }

  enviarNotificacion(dto: any): Observable<any> {
    return this.http.post(`${this.apiUrlNotificaciones}/enviar-notificacion-miembro`, dto);
  }

  enviarNotificacionTarea(dto: any): Observable<any> {
    return this.http.post(`${this.apiUrlNotificaciones}/enviar-notificacion-tareas`, dto);
  }
}