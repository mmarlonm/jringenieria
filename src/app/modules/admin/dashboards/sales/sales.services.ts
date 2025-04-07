import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SalesService {
  private apiUrl = `${environment.apiUrl}/Venta`;

  constructor(private http: HttpClient) {}

  // 🔹 Obtener todas las ventas
  getVentas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}`);
  }

  // 🔹 Obtener una venta por ID
  getVentaById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // 🔹 Crear nueva venta
  createVenta(venta: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/save-venta`, venta);
  }

  // 🔹 Actualizar venta
  updateVenta(id: number, venta: any): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, venta);
  }

  // 🔹 Eliminar venta
  deleteVenta(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // 🔹 Obtener formas de pago
  getFormasDePago(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/formas-de-pago`);
  }
}