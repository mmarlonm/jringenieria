import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment'; // Asegúrate de tener la URL base de tu API aquí

@Injectable({
  providedIn: 'root'
})
export class SurveysService {
  private apiUrl = `${environment.apiUrl}/Encuesta`;

  constructor(private http: HttpClient) { }

  // Obtener todas las encuestas
  getSurveys(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/todas`);
  }
  // 🔹 Obtener una encuesta por ID
  getSurveyById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }
}