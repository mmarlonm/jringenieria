import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment'; // Asegúrate de tener la URL base de tu API aquí

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
    private apiUrl = `${environment.apiUrl}/Producto`; // Asegúrate de que esto sea correcto

  constructor(private http: HttpClient) {}

  // Obtener todos los proyectos
  getProduct(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/getAll-productos`);
  }

  // Crear un nuevo proyecto
  createProduct(project: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/save-producto`, project);
  }

  // Actualizar un proyecto existente
  updateProduct(project: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/save-producto`, project);
  }

  // Eliminar un proyecto
  deleteProduct(projectId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/delete-producto/${projectId}`);
  }

  getProductById(projectId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/get-producto/${projectId}`);
  }

  // Método para enviar el archivo Excel al servidor
  uploadExcel(file: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/upload-excel`, file);
  }
}