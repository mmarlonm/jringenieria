import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Task } from './models/tasks.model';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private apiUrl = `${environment.apiUrl}/Tareas`;

  constructor(private http: HttpClient) {}

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
    return this.http.post<any>(`${this.apiUrl}/SubirArchivoTarea`,formData);
  }

  getFiles(tareaId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ObtenerArchivosTarea/${tareaId}`);
  }

  downloadFile(tareaId: number, categoria: string, nombreArchivo: string): Observable<Blob> {
    const url = `${this.apiUrl}/DescargarArchivoTarea/${tareaId}/${categoria}/${nombreArchivo}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  removeFile(tareaId: number, categoria: string, nombreArchivo: string): Observable<Blob> {
    const url = `${this.apiUrl}/EliminarArchivoTarea/${tareaId}/${categoria}/${nombreArchivo}`;
    return this.http.delete(url, { responseType: 'blob' });
  }
}
