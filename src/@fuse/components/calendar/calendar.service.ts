import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private apiUrl = `${environment.apiUrl}/Tareas`;

  constructor(private http: HttpClient) {}

  // Obtener todas las tareas
  getTasks(userId: number): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/mis-tareas`, {
    params: { userId: userId.toString() }
  });
}

}
