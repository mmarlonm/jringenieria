import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface Requerimiento {
  id: number;
  folio: string;
  fechaRecepcion: string;
  clienteId?: number;
  leadId?: number;
  nombreContacto: string;
  empresa: string;
  telefono?: string;
  email?: string;
  sucursal?: string;
  descripcion: string;
  estatus: string;
  naturaleza?: string;
  rutaAtencion?: string;
  viabilidad?: string;
  observacionesRiesgo?: string;
  motivoDescarte?: string;

  faltaPlano: boolean;
  faltaFotografia: boolean;
  faltaCantidad: boolean;
  faltaUbicacion: boolean;
  faltaDatosElectricos: boolean;
  faltaCapacidad: boolean;
  faltaFechaEjecucion: boolean;
  faltaCondicionesSitio: boolean;
  faltaNormativa: boolean;
  faltaEvidenciaFalla: boolean;
  faltaMarcaModelo: boolean;
  faltaVisita: boolean;
  faltaOtros: boolean;
  faltaOtrosDescripcion?: string;

  usuarioAsignadoId?: number;
  usuarioAsignadoNombre?: string;
  fechaCalificacion?: string;
  fechaRegistro: string;

  archivos?: RequerimientoArchivo[];
  seguimientos?: RequerimientoSeguimiento[];
}

export interface RequerimientoArchivo {
  id: number;
  requerimientoId: number;
  nombreArchivo: string;
  rutaArchivo: string;
  categoria?: string;
  fechaSubida: string;
}

export interface RequerimientoSeguimiento {
  id: number;
  requerimientoId: number;
  fechaContacto: string;
  medio: string;
  detalle: string;
  idResponsable: number;
  responsableNombre: string;
  fechaRegistro: string;
}

export interface RequerimientoKpi {
  tasaCalificacionCorrecta: number;
  tiempoPromedioCalificacionHoras: number;
  porcentajeDevueltos: number;
  porcentajeCompletos: number;
  totalRequerimientos: number;
}

export interface CreateRequerimientoDto {
  clienteId?: number;
  leadId?: number;
  nombreContacto: string;
  empresa: string;
  telefono?: string;
  email?: string;
  sucursal?: string;
  descripcion: string;
  usuarioAsignadoId?: number;
}

export interface UpdateRequerimientoDto {
  nombreContacto: string;
  empresa: string;
  telefono?: string;
  email?: string;
  sucursal?: string;
  descripcion: string;
  usuarioAsignadoId?: number;
}

export interface CalificarRequerimientoDto {
  estatus: string;
  naturaleza?: string;
  rutaAtencion?: string;
  viabilidad?: string;
  observacionesRiesgo?: string;
  motivoDescarte?: string;

  faltaPlano: boolean;
  faltaFotografia: boolean;
  faltaCantidad: boolean;
  faltaUbicacion: boolean;
  faltaDatosElectricos: boolean;
  faltaCapacidad: boolean;
  faltaFechaEjecucion: boolean;
  faltaCondicionesSitio: boolean;
  faltaNormativa: boolean;
  faltaEvidenciaFalla: boolean;
  faltaMarcaModelo: boolean;
  faltaVisita: boolean;
  faltaOtros: boolean;
  faltaOtrosDescripcion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RequerimientosService {
  private apiUrl = `${environment.apiUrl}/Requerimiento`;

  constructor(private http: HttpClient) {}

  getRequerimientos(): Observable<Requerimiento[]> {
    return this.http.get<Requerimiento[]>(this.apiUrl);
  }

  getRequerimiento(id: number): Observable<Requerimiento> {
    return this.http.get<Requerimiento>(`${this.apiUrl}/${id}`);
  }

  createRequerimiento(dto: CreateRequerimientoDto): Observable<Requerimiento> {
    return this.http.post<Requerimiento>(this.apiUrl, dto);
  }

  updateRequerimiento(id: number, dto: UpdateRequerimientoDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, dto);
  }

  calificarRequerimiento(id: number, dto: CalificarRequerimientoDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/calificar`, dto);
  }

  // Archivos
  getArchivos(reqId: number): Observable<RequerimientoArchivo[]> {
    return this.http.get<RequerimientoArchivo[]>(`${this.apiUrl}/${reqId}/archivos`);
  }

  subirArchivos(reqId: number, categoria: string, archivos: File[]): Observable<RequerimientoArchivo[]> {
    const formData = new FormData();
    if (categoria) {
      formData.append('categoria', categoria);
    }
    archivos.forEach(f => formData.append('archivos', f, f.name));
    return this.http.post<RequerimientoArchivo[]>(`${this.apiUrl}/${reqId}/archivos`, formData);
  }

  descargarArchivoUrl(reqId: number, archivoId: number): string {
    return `${this.apiUrl}/${reqId}/archivos/${archivoId}/descargar`;
  }

  eliminarArchivo(reqId: number, archivoId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${reqId}/archivos/${archivoId}`);
  }

  // Seguimientos
  getSeguimientos(reqId: number): Observable<RequerimientoSeguimiento[]> {
    return this.http.get<RequerimientoSeguimiento[]>(`${this.apiUrl}/${reqId}/seguimientos`);
  }

  createSeguimiento(reqId: number, medio: string, detalle: string, idResponsable: number): Observable<RequerimientoSeguimiento> {
    return this.http.post<RequerimientoSeguimiento>(`${this.apiUrl}/${reqId}/seguimientos`, {
      medio,
      detalle,
      idResponsable
    });
  }

  deleteSeguimiento(reqId: number, id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${reqId}/seguimientos/${id}`);
  }

  // Indicadores KPIs
  getIndicadores(): Observable<RequerimientoKpi> {
    return this.http.get<RequerimientoKpi>(`${this.apiUrl}/indicadores`);
  }
}
