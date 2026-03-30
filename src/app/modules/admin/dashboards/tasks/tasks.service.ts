import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Task, TareaComentario } from './models/tasks.model';
import { TareaActividad } from './models/task-activity.model';
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

  // Comentarios / Chat
  getComments(idTarea: number, idUsuario: number): Observable<TareaComentario[]> {
    return this.http.get<TareaComentario[]>(`${this.apiUrl}/${idTarea}/comentarios`, {
      params: { idUsuario: idUsuario.toString() }
    });
  }

  addComment(idTarea: number, idUsuario: number, mensaje: string): Observable<TareaComentario> {
    return this.http.post<TareaComentario>(`${this.apiUrl}/${idTarea}/comentarios`, { idTarea, idUsuario, mensaje });
  }

  deleteComment(idTarea: number, idComentario: number, idUsuario: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${idTarea}/comentarios/${idComentario}`, {
      params: { idUsuario: idUsuario.toString() }
    });
  }

  // ==========================================
  // ACTIVIDADES (GANTT)
  // ==========================================

  getActividades(tareaId: number): Observable<TareaActividad[]> {
    return this.http.get<TareaActividad[]>(`${this.apiUrl}/${tareaId}/actividades`);
  }

  guardarActividad(actividad: TareaActividad): Observable<any> {
    return this.http.post(`${this.apiUrl}/actividad`, actividad);
  }

  eliminarActividad(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/actividad/${id}`);
  }
}
