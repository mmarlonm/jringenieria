import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiUrl = `${environment.apiUrl}/Profile`;

  constructor(private http: HttpClient) {}

  get userInformation(): string {
    return localStorage.getItem("userInformation") ?? "";
  }

  // 🔸 Obtener todos los prospectos
  getProfile(id : number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/me/${id}`);
  }
}