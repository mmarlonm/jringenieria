import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TicketsService {
  private apiUrl = `${environment.apiUrl}/Tickets`;

  constructor(private http: HttpClient) { }

  // Obtener listado de tickets con filtros
  listar(tipoId?: number, estatusId?: number, prioridadId?: number, responsableId?: number,
         fechaDesde?: Date, fechaHasta?: Date): Observable<any> {
    let params = new HttpParams();

    if (tipoId) params = params.set('tipoId', tipoId.toString());
    if (estatusId) params = params.set('estatusId', estatusId.toString());
    if (prioridadId) params = params.set('prioridadId', prioridadId.toString());
    if (responsableId) params = params.set('responsableId', responsableId.toString());
    if (fechaDesde) params = params.set('fechaDesde', fechaDesde.toISOString());
    if (fechaHasta) params = params.set('fechaHasta', fechaHasta.toISOString());

    return this.http.get<any>(`${this.apiUrl}`, { params });
  }

  // Obtener un ticket por ID
  obtener(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // Crear nuevo ticket
  crear(dto: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, dto);
  }

  // Guardar estimación
  guardarEstimacion(id: number, dto: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/estimacion`, dto);
  }

  // Aprobar o rechazar ticket
  aprobarRechazar(id: number, dto: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/aprobacion`, dto);
  }

  // Agregar comentario
  agregarComentario(id: number, dto: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/comentarios`, dto);
  }

  // Subir archivo
  subirArchivo(id: number, archivo: File): Observable<any> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<any>(`${this.apiUrl}/${id}/archivos`, formData);
  }

  // Eliminar archivo
  eliminarArchivo(archivoId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/archivos/${archivoId}`);
  }

  // Obtener catálogos (tipos, estatus, prioridades)
  obtenerCatalogos(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/catalogos`);
  }

  // Obtener aprobadores
  obtenerAprobadores(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/aprobadores`);
  }

  // Obtener usuarios para asignación
  obtenerUsuariosAsignacion(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/usuarios-asignacion`);
  }
}
