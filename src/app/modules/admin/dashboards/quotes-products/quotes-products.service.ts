import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'environments/environment';
import {
  CatalogosSgc,
  GuardarCotizacionSgc,
  RespuestaObtenerSgc,
  ResumenSgc,
  ExistenciaMaterial
} from './quotes-products.types';
import { ContpaqiMaterialDto } from 'app/modules/admin/administration/solicitudes-compra/models/solicitud-compra.types';
import { agruparExistencias } from 'app/shared/materiales/existencias.utils';

@Injectable({
  providedIn: 'root'
})
export class QuotesService {
  private apiUrl = `${environment.apiUrl}/CotizacionProductos`;
  private apiUrlCotizacion = `${environment.apiUrl}/Cotizacion`; // Asegúrate de que esto sea correcto


  constructor(private http: HttpClient) { }

  get userInformation(): string {
    return localStorage.getItem("userInformation") ?? "";
  }

  // Obtener todas las cotizaciones con paginación y filtro de fecha
  getQuotes(page: number = 1, size: number = 10, fecha?: string): Observable<any> {
    let params: any = { page, size };
    if (fecha) {
      params.fecha = fecha;
    }
    return this.http.get<any>(this.apiUrl, { params });
  }

  // Obtener una cotización por ID
  getQuoteById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // Crear o actualizar una cotización
  saveQuote(quote: any): Observable<any> {
    return this.http.post(this.apiUrl, quote);
  }

  // Eliminar una cotización
  deleteQuote(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  buscarProducto(q: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/productos`, {
      params: { q }
    });
  }
  getEstatus(): Observable<any> {
    return this.http.get<any>(`${this.apiUrlCotizacion}/estatus`);
  }

  getHistorial(quoteId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/historial-estatus/${quoteId}`);
  }

  enviarEncuesta(dto: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/enviar-correo`, dto);
  }

  cambiarEstatus(cotizacionProductosId: number, estatus: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/cambiar-estatus`, { cotizacionProductosId, estatus });
  }

  // --- Métodos SGC (SGC-PRO-COM-03) ---

  catalogosSgc(): Observable<CatalogosSgc> {
    return this.http.get<CatalogosSgc>(`${this.apiUrl}/sgc/catalogos`);
  }

  guardarSgc(dto: GuardarCotizacionSgc): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/sgc`, dto);
  }

  obtenerSgc(id: number): Observable<RespuestaObtenerSgc> {
    return this.http.get<RespuestaObtenerSgc>(`${this.apiUrl}/${id}/sgc`);
  }

  resumenSgc(ids: number[]): Observable<ResumenSgc[]> {
    if (!ids || ids.length === 0) {
      return of([]);
    }
    const params = new HttpParams().set('ids', ids.join(','));
    return this.http.get<ResumenSgc[]>(`${this.apiUrl}/sgc-resumen`, { params });
  }

  buscarExistencia(busqueda: string): Observable<ExistenciaMaterial[]> {
    const params = new HttpParams().set('busqueda', busqueda);
    return this.http.get<any>(`${this.apiUrl}/materiales/existencia`, { params }).pipe(
      map(res => agruparExistencias(res))
    );
  }

  importarPorFolio(folio: string): Observable<ContpaqiMaterialDto[]> {
    const params = new HttpParams().set('folio', folio);
    return this.http.get<ContpaqiMaterialDto[]>(`${this.apiUrl}/materiales/importar`, { params });
  }
}