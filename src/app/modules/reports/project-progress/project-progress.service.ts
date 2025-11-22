import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment'; // Asegúrate de tener la URL base de tu API aquí

@Injectable({
  providedIn: 'root'
})
export class ProjectProgressService {
  private apiUrl = `${environment.apiUrl}/Proyecto`; // Asegúrate de que esto sea correcto

  constructor(private http: HttpClient) { }

  getProjectById(projectId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/report/avances/${projectId}`);
  }
}