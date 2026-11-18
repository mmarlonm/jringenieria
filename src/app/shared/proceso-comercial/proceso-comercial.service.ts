import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';
import { ProcesoComercial, ProcesoTipo } from './proceso-comercial.types';

@Injectable({ providedIn: 'root' })
export class ProcesoComercialService {
  private apiUrl = `${environment.apiUrl}/ProcesoComercial`;

  constructor(private http: HttpClient) { }

  /** En que paso va un lead, requerimiento, caso de Ingenieria o cotizacion. */
  obtener(tipo: ProcesoTipo, id: number): Observable<ProcesoComercial> {
    return this.http.get<ProcesoComercial>(`${this.apiUrl}/${tipo}/${id}`);
  }
}
