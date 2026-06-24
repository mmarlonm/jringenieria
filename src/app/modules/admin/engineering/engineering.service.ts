import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface Solicitante {
    idSolicitante: number;
    nombreCompleto: string;
    celular?: string;
    empresa: string;
    area?: string;
    activo: boolean;
    createdDate?: string;
}

export interface SeguimientoProyecto {
    idSeguimiento: number;
    idSolicitante: number;
    nombreCompleto?: string;
    celular?: string;
    empresa?: string;
    area?: string;
    actividad: string;
    tipo?: string;
    estatusLevantamiento: number;
    estatusCotizacion: number;
    estatusAprobacion: number;
    ordenCompraFolio?: string;
    montoTotalEstimado?: number;
    quienRealizoLevantamiento?: string;
    quienCotizo?: string;
    idUsuarioRegistro: number;
    nombreUsuarioRegistro?: string;
    fechaRegistro?: string;
    fechaActualizacion?: string;
}

export interface SeguimientoEjecucion {
    idEjecucion: number;
    idSeguimiento: number;
    utilidadEsperada?: number;
    disponibilidadRecursos?: string;
    fechaInicioProyecto?: string;
    fechaFinProyecto?: string;
    riesgoTecnico?: string;
    nivelPrioridad?: string;
    contratoFolio?: string;
    fianzaFolio?: string;
    ordenCompraFolio?: string;
    ordenCompraArchivo?: string;
    estatusAst: number;
    estatusProgramaGantt: number;
    estatusImssSua: number;
    estatusAdquisicionMateriales: number;
    estatusConstruccionEntrega: number;
    estatusReporte: number;
    fechaActualizacion?: string;
    actividad?: string;
    nombreSolicitante?: string;
    empresa?: string;
    avanceGantt?: number;
}

export interface SeguimientoEjecucionActividadMaestra {
    id?: number;
    idSeguimiento: number;
    nombre: string;
    responsableId?: number;
    responsablesIds?: string;
    nombreResponsable?: string;
    area?: string;
    progreso: number;
    fechaInicio: string | Date;
    fechaFin: string | Date;
    predecesoraId?: number;
    prioridad?: string;
    estatus: number;
    color?: string;
    orden?: number;
    expanded?: boolean; // Frontend only
    actividades?: SeguimientoEjecucionSubactividad[];
}

export interface SeguimientoEjecucionSubactividad {
    id?: number;
    actividadMaestraId: number;
    nombre: string;
    responsableId?: number;
    responsablesIds?: string;
    nombreResponsable?: string;
    area?: string;
    progreso: number;
    fechaInicio: string | Date;
    fechaFin: string | Date;
    predecesoraId?: number;
    prioridad?: string;
    estatus: number;
    color?: string;
    orden?: number;
}

@Injectable({
    providedIn: 'root'
})
export class EngineeringService {
    private apiSolicitantes = `${environment.apiUrl}/CatalogoSolicitantes`;
    private apiSeguimiento = `${environment.apiUrl}/SeguimientoProyectos`;
    private apiSeguimientoEjecucion = `${environment.apiUrl}/SeguimientoEjecucion`;

    constructor(private _http: HttpClient) { }

    // ==========================================
    // 👥 CATÁLOGO DE SOLICITANTES
    // ==========================================
    getSolicitantes(): Observable<Solicitante[]> {
        return this._http.get<Solicitante[]>(this.apiSolicitantes);
    }

    getSolicitante(id: number): Observable<Solicitante> {
        return this._http.get<Solicitante>(`${this.apiSolicitantes}/${id}`);
    }

    saveSolicitante(solicitante: Partial<Solicitante>): Observable<any> {
        return this._http.post(this.apiSolicitantes, solicitante);
    }

    deleteSolicitante(id: number): Observable<any> {
        return this._http.delete(`${this.apiSolicitantes}/${id}`);
    }

    // ==========================================
    // 📊 SEGUIMIENTO DE PROYECTOS (TABLERO)
    // ==========================================
    getSeguimientos(fechaInicio?: string, fechaFin?: string): Observable<SeguimientoProyecto[]> {
        let params = new HttpParams();
        if (fechaInicio) {
            params = params.set('fechaInicio', fechaInicio);
        }
        if (fechaFin) {
            params = params.set('fechaFin', fechaFin);
        }
        return this._http.get<SeguimientoProyecto[]>(this.apiSeguimiento, { params });
    }

    getSeguimiento(id: number): Observable<SeguimientoProyecto> {
        return this._http.get<SeguimientoProyecto>(`${this.apiSeguimiento}/${id}`);
    }

    saveSeguimiento(seguimiento: any): Observable<any> {
        return this._http.post(this.apiSeguimiento, seguimiento);
    }

    deleteSeguimiento(id: number): Observable<any> {
        return this._http.delete(`${this.apiSeguimiento}/${id}`);
    }

    updateEstatusLevantamiento(id: number, estatus: number): Observable<any> {
        return this._http.put(`${this.apiSeguimiento}/${id}/estatus-levantamiento`, estatus);
    }

    updateEstatusCotizacion(id: number, estatus: number): Observable<any> {
        return this._http.put(`${this.apiSeguimiento}/${id}/estatus-cotizacion`, estatus);
    }

    updateEstatusAprobacion(id: number, estatus: number): Observable<any> {
        return this._http.put(`${this.apiSeguimiento}/${id}/estatus-aprobacion`, estatus);
    }

    // ==========================================
    // 🛠️ CONTROL DE EJECUCIÓN
    // ==========================================
    getSeguimientosEjecucion(fechaInicio?: string, fechaFin?: string): Observable<SeguimientoEjecucion[]> {
        let params = new HttpParams();
        if (fechaInicio) {
            params = params.set('fechaInicio', fechaInicio);
        }
        if (fechaFin) {
            params = params.set('fechaFin', fechaFin);
        }
        return this._http.get<SeguimientoEjecucion[]>(this.apiSeguimientoEjecucion, { params });
    }

    saveSeguimientoEjecucion(ejecucion: any): Observable<any> {
        return this._http.post(this.apiSeguimientoEjecucion, ejecucion);
    }

    updateEstatusEjecucionRapido(idSeguimiento: number, campo: string, estatus: number): Observable<any> {
        return this._http.put(`${this.apiSeguimientoEjecucion}/${idSeguimiento}/estatus/${campo}`, estatus);
    }

    // ==========================================
    // 📁 ARCHIVOS DE CONTROL DE EJECUCIÓN
    // ==========================================
    getArchivosEjecucion(idSeguimiento: number): Observable<any[]> {
        return this._http.get<any[]>(`${this.apiSeguimientoEjecucion}/${idSeguimiento}/archivos`);
    }

    subirArchivoEjecucion(idSeguimiento: number, archivo: File, tipo: string): Observable<any> {
        const formData = new FormData();
        formData.append('archivo', archivo);
        formData.append('tipo', tipo);
        return this._http.post(`${this.apiSeguimientoEjecucion}/${idSeguimiento}/archivos`, formData);
    }

    descargarArchivoEjecucion(idSeguimiento: number, tipo: string, nombreArchivo: string): Observable<any> {
        const encodedFile = encodeURIComponent(nombreArchivo);
        return this._http.get<any>(`${this.apiSeguimientoEjecucion}/${idSeguimiento}/archivos/${tipo}/${encodedFile}`);
    }

    eliminarArchivoEjecucion(idSeguimiento: number, tipo: string, nombreArchivo: string): Observable<any> {
        const encodedFile = encodeURIComponent(nombreArchivo);
        return this._http.delete(`${this.apiSeguimientoEjecucion}/${idSeguimiento}/archivos/${tipo}/${encodedFile}`);
    }

    // ==========================================
    // 📁 ARCHIVO DE ORDEN DE COMPRA (OC)
    // ==========================================
    subirArchivoOC(idSeguimiento: number, archivo: File): Observable<any> {
        const formData = new FormData();
        formData.append('archivo', archivo);
        return this._http.post(`${this.apiSeguimientoEjecucion}/${idSeguimiento}/archivo-oc`, formData);
    }

    descargarArchivoOC(idSeguimiento: number): Observable<any> {
        return this._http.get<any>(`${this.apiSeguimientoEjecucion}/${idSeguimiento}/archivo-oc`);
    }

    eliminarArchivoOC(idSeguimiento: number): Observable<any> {
        return this._http.delete(`${this.apiSeguimientoEjecucion}/${idSeguimiento}/archivo-oc`);
    }

    // ==========================================
    // 📊 GESTION DE GANTT (ACTIVIDADES MAESTRAS Y SUBACTIVIDADES)
    // ==========================================
    getGanttTareas(idSeguimiento: number): Observable<SeguimientoEjecucionActividadMaestra[]> {
        return this._http.get<SeguimientoEjecucionActividadMaestra[]>(`${this.apiSeguimientoEjecucion}/${idSeguimiento}/gantt/tareas`);
    }

    saveGanttMaestra(tarea: any): Observable<any> {
        return this._http.post(`${this.apiSeguimientoEjecucion}/gantt/maestra`, tarea);
    }

    deleteGanttMaestra(id: number): Observable<any> {
        return this._http.delete(`${this.apiSeguimientoEjecucion}/gantt/maestra/${id}`);
    }

    saveGanttSubactividad(actividad: any): Observable<any> {
        return this._http.post(`${this.apiSeguimientoEjecucion}/gantt/subactividad`, actividad);
    }

    deleteGanttSubactividad(id: number): Observable<any> {
        return this._http.delete(`${this.apiSeguimientoEjecucion}/gantt/subactividad/${id}`);
    }

    getGanttGeneral(): Observable<any[]> {
        return this._http.get<any[]>(`${this.apiSeguimientoEjecucion}/gantt/general`);
    }

    reordenarGantt(items: any[]): Observable<any> {
        return this._http.post(`${this.apiSeguimientoEjecucion}/gantt/reordenar`, items);
    }
}
