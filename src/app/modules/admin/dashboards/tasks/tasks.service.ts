import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Task } from './models/tasks.model';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  public apiUrl = `${environment.apiUrl}/Tareas`;
  private apiUrlAuth = `${environment.apiUrl}/Auth`;

  constructor(private http: HttpClient) { }

  // Obtener todas las tareas
  getTasks(userId: number): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.apiUrl}/mis-tareas`, {
      params: { userId: userId.toString() }
    });
  }


  // Crear nueva tarea
  createTask(task: Task): Observable<any> {
    return this.http.post(this.apiUrl, task);
  }

  // Actualizar tarea
  updateTask(id: number, task: Task): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, task);
  }

  // Eliminar tarea
  deleteTask(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Obtener una tarea por ID (opcional)
  getTaskById(id: number): Observable<Task> {
    return this.http.get<Task>(`${this.apiUrl}/${id}`);
  }

  uploadFile(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/SubirArchivoTarea`, formData);
  }

  getFiles(tareaId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ObtenerArchivosTarea/${tareaId}`);
  }

  downloadFile(tareaId: number, categoria: string, nombreArchivo: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/DescargarArchivoTarea`, {
      params: {
        tareaId: tareaId.toString(),
        categoria: categoria,
        nombreArchivo: nombreArchivo
      }
    });
  }

  removeFile(tareaId: number, categoria: string, nombreArchivo: string): Observable<any> {
    const encodedCat = encodeURIComponent(categoria);
    const encodedFile = encodeURIComponent(nombreArchivo);
    return this.http.delete(`${this.apiUrl}/EliminarArchivoTarea/${tareaId}/${encodedCat}/${encodedFile}`, { responseType: 'text' });
  }

  getToken(tareaId: number, categoria: string, nombreArchivo: string): Observable<any> {

    // 1. Define los parámetros de consulta
    let params = new HttpParams()
      .set('tareaId', tareaId)
      .set('categoria', categoria)
      .set('nombreArchivo', nombreArchivo);

    // 2. Construye la URL base del endpoint
    // Suponiendo que tu endpoint está en: [Route("api/onlyoffice")] y [HttpGet("token")]
    const url = `${this.apiUrlAuth}/tarea/token`;

    // 3. Envía la solicitud con los parámetros
    return this.http.get<any>(url, { params: params });
  }
}
