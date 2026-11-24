import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';
import { TipoCotizacionSgc } from 'app/modules/admin/dashboards/quotes-products/quotes-products.types';

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

  cantidades?: string | null;
  ubicacionExacta?: string | null;
  marcaModelo?: string | null;

  usuarioAsignadoId?: number;
  usuarioAsignadoNombre?: string;
  usuarioCreadorId?: number;
  usuarioCreadorNombre?: string;
  solicitanteId?: number;
  solicitanteNombre?: string;
  tipoProyecto?: string;
  titulo?: string;
  seguimientoProyectoId?: number;
  fechaAprobacion?: string;
  fechaCalificacion?: string;
  fechaRegistro: string;

  archivos?: RequerimientoArchivo[];
  seguimientos?: RequerimientoSeguimiento[];

  /** Cotización a la que se convirtió; `null` (o ausente en respuestas viejas) si aún no. Contrato v1.1 §4. */
  cotizacionVinculada?: CotizacionVinculada | null;
}

export interface CoincidenciaFolio {
  cotizacionProductosId: number;
  unidadDeNegocioId?: number | null;
  unidadDeNegocioNombre?: string | null;
  folioContpaq?: string | null;
  nombreCliente?: string | null;
  rfc?: string | null;
  total?: number | null;
  fecha?: string | null;
  tieneCapaSgc: boolean;
  yaVinculadaARequerimiento: boolean;
  requerimientoFolio?: string | null;
}

export interface BuscarFolioRespuesta {
  folio: string;
  coincidencias: CoincidenciaFolio[];
}

export interface CotizacionVinculada {
  cotizacionProductosId: number;
  folioSgc: string;
  /** Folio de CONTPAQ de la cotización sincronizada (§4 contrato v2.0). */
  folioContpaq?: string | null;
  tipo: TipoCotizacionSgc;
  etapa: string;
}

/** Contrato v2.0 §3: vincula el requerimiento a una cotización sincronizada existente. */
export interface ConvertirRequerimientoDto {
  requerimientoId: number;
  tipo: TipoCotizacionSgc;
  cotizacionProductosId: number;
}

export interface ConvertirRequerimientoResultado {
  cotizacionProductosId: number;
  folioSgc: string;
  folioContpaq?: string | null;
  tipo: TipoCotizacionSgc;
  etapa: string;
  requerimientoId: number;
  requerimientoFolio: string;
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

export interface DistribucionTipoRequerimiento {
  tipo: string;
  cantidad: number;
  porcentaje: number;
}

export interface RequerimientoKpi {
  tasaCalificacionCorrecta: number;
  tiempoPromedioCalificacionHoras: number;
  porcentajeDevueltos: number;
  porcentajeCompletos: number;
  totalRequerimientos: number;
  distribucionPorTipo: DistribucionTipoRequerimiento[];
}

export const TIPOS_PROYECTO: string[] = [
  'Construcción e instalación',
  'Ingeniería',
  'Mantenimiento',
  'Instalación',
  'Estudios y Pruebas',
  'Gestiones y trámites',
  'Proyectos llave en mano'
];

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
  fechaRecepcion?: string;
  solicitanteId?: number;
  tipoProyecto?: string;
  titulo?: string;
}

export interface UpdateRequerimientoDto {
  nombreContacto: string;
  empresa: string;
  telefono?: string;
  email?: string;
  sucursal?: string;
  descripcion: string;
  usuarioAsignadoId?: number;
  fechaRecepcion?: string;
  solicitanteId?: number;
  tipoProyecto?: string;
  titulo?: string;
}

export interface AprobarRequerimientoDatos {
  /** Opcional al capturar el requerimiento; Ingeniería lo exige para abrir el caso, así que viaja aquí si faltaba. */
  solicitanteId?: number;
  tipoProyecto?: string;
  titulo?: string;
}

export interface AprobarRequerimientoResultadoDto {
  idSeguimiento?: number | null;
  folio: string;
  estatus: string;
  destino?: 'cotizacion' | 'ingenieria';
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

  cantidades?: string | null;
  ubicacionExacta?: string | null;
  marcaModelo?: string | null;
}

export interface GuardarBorradorDto {
  naturaleza?: string | null;
  rutaAtencion?: string | null;
  viabilidad?: string | null;
  observacionesRiesgo?: string | null;
  motivoDescarte?: string | null;

  faltaPlano?: boolean;
  faltaFotografia?: boolean;
  faltaCantidad?: boolean;
  faltaUbicacion?: boolean;
  faltaDatosElectricos?: boolean;
  faltaCapacidad?: boolean;
  faltaFechaEjecucion?: boolean;
  faltaCondicionesSitio?: boolean;
  faltaNormativa?: boolean;
  faltaEvidenciaFalla?: boolean;
  faltaMarcaModelo?: boolean;
  faltaVisita?: boolean;
  faltaOtros?: boolean;
  faltaOtrosDescripcion?: string | null;

  cantidades?: string | null;
  ubicacionExacta?: string | null;
  marcaModelo?: string | null;

  tipoProyecto?: string | null;
  titulo?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class RequerimientosService {
  private apiUrl = `${environment.apiUrl}/Requerimiento`;

  constructor(private http: HttpClient) { }

  /** Id del usuario con sesión iniciada. */
  usuarioActualId(): number | null {
    try {
      const info = JSON.parse(localStorage.getItem('userInformation') || '{}');
      return info?.usuario?.usuarioId || info?.usuario?.id || null;
    } catch {
      return null;
    }
  }

  /** Califica el responsable asignado; si el requerimiento no tiene responsable, cualquiera. */
  puedeCalificar(req: Requerimiento): boolean {
    return !req.usuarioAsignadoId || req.usuarioAsignadoId === this.usuarioActualId();
  }

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

  guardarBorrador(id: number, dto: GuardarBorradorDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/borrador`, dto);
  }

  /** Tipo de proyecto y titulo se capturan al aprobar (ya no en el requerimiento); si no se mandan, el API usa los guardados. */
  aprobarRequerimiento(id: number, datos?: AprobarRequerimientoDatos): Observable<AprobarRequerimientoResultadoDto> {
    return this.http.post<AprobarRequerimientoResultadoDto>(`${this.apiUrl}/${id}/aprobar`, datos ?? {});
  }

  // Buscar folio de CONTPAQ entre las cotizaciones sincronizadas (contrato v2.0 §2).
  buscarFolioContpaq(folio: string): Observable<BuscarFolioRespuesta> {
    return this.http.get<BuscarFolioRespuesta>(
      `${environment.apiUrl}/CotizacionProductos/buscar-folio`,
      { params: { folio } }
    );
  }

  // Convertir = vincular requerimiento a la cotización sincronizada elegida (contrato v2.0 §3).
  convertirACotizacion(dto: ConvertirRequerimientoDto): Observable<ConvertirRequerimientoResultado> {
    return this.http.post<ConvertirRequerimientoResultado>(`${environment.apiUrl}/CotizacionProductos/convertir-desde-requerimiento`, dto);
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

  /** Descarga con la sesión: una navegación directa a la URL no lleva el token y el API (que exige sesión) respondería 401. */
  descargarArchivo(reqId: number, archivoId: number): Observable<Blob> {
    return this.http.get(this.descargarArchivoUrl(reqId, archivoId), { responseType: 'blob' });
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
