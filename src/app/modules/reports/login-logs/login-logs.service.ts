import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment'; // Asegúrate de tener la URL base de tu API aquí

@Injectable({
  providedIn: 'root'
})
export class LoginLogsService {
  private apiUrl = `${environment.apiUrl}/Chat`; // Asegúrate de que esto sea correcto

  constructor(private http: HttpClient) { }

  getLogs(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/historial-login`);
  }
}