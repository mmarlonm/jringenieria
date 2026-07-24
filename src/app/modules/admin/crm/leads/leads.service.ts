import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface Lead {
  id: number;
  nombreContacto: string;
  empresa: string;
  telefono: string;
  email: string;
  fuenteLead: string;
  necesidadInicial: string;
  sucursalQueRecibe: string;
  estatus: string;
  motivoDescarte?: string;
  tipoCliente?: string;
  tipoNecesidad?: string;
  zonaAtencion?: string;
  nivelPrioridad?: string;
  potencialPreliminar?: string;
  idUsuarioAsignado: number;
  usuarioAsignadoNombre?: string;
  fechaRegistro: string;
  fechaCalificacion?: string;
  fechaActualizacion?: string;
}

export interface LeadArchivo {
  id: number;
  leadId: number;
  nombreArchivo: string;
  rutaArchivo: string;
  categoria: string;
  fechaSubida: string;
}

export interface CreateLeadDto {
  nombreContacto: string;
  empresa: string;
  telefono: string;
  email: string;
  fuenteLead: string;
  necesidadInicial: string;
  sucursalQueRecibe: string;
  idUsuarioAsignado: number;
}

export interface UpdateLeadDto {
  nombreContacto: string;
  empresa: string;
  telefono: string;
  email: string;
  fuenteLead: string;
  necesidadInicial: string;
  sucursalQueRecibe: string;
  idUsuarioAsignado: number;
}

export interface ConvertLeadDto {
  tipoCliente: string;
  tipoNecesidad: string;
  zonaAtencion: string;
  nivelPrioridad: string;
  potencialPreliminar: string;
}

export interface DiscardLeadDto {
  motivoDescarte: string;
}

@Injectable({
  providedIn: 'root'
})
export class LeadsService {
  private apiUrl = `${environment.apiUrl}/Leads`;

  constructor(private http: HttpClient) {}

  getLeads(): Observable<Lead[]> {
    return this.http.get<Lead[]>(this.apiUrl);
  }

  getLeadById(id: number): Observable<Lead> {
    return this.http.get<Lead>(`${this.apiUrl}/${id}`);
  }

  createLead(dto: CreateLeadDto): Observable<Lead> {
    return this.http.post<Lead>(this.apiUrl, dto);
  }

  updateLead(id: number, dto: UpdateLeadDto): Observable<Lead> {
    return this.http.put<Lead>(`${this.apiUrl}/${id}`, dto);
  }

  convertLead(id: number, dto: ConvertLeadDto): Observable<Lead> {
    return this.http.post<Lead>(`${this.apiUrl}/${id}/convert`, dto);
  }

  discardLead(id: number, dto: DiscardLeadDto): Observable<Lead> {
    return this.http.post<Lead>(`${this.apiUrl}/${id}/discard`, dto);
  }

  deleteLead(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  // --- Archivos ---
  getArchivosLead(leadId: number): Observable<LeadArchivo[]> {
    return this.http.get<LeadArchivo[]>(`${this.apiUrl}/${leadId}/archivos`);
  }

  subirArchivosLead(leadId: number, categoria: string, archivos: File[]): Observable<LeadArchivo[]> {
    const formData = new FormData();
    formData.append('categoria', categoria);
    archivos.forEach(f => formData.append('archivos', f, f.name));
    return this.http.post<LeadArchivo[]>(`${this.apiUrl}/${leadId}/archivos`, formData);
  }

  descargarArchivoLead(leadId: number, archivoId: number): string {
    return `${this.apiUrl}/${leadId}/archivos/${archivoId}/descargar`;
  }

  eliminarArchivoLead(leadId: number, archivoId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${leadId}/archivos/${archivoId}`);
  }

  // Get active system users to populate assignment dropdowns
  getUsuarios(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/Usuario`);
  }
}
