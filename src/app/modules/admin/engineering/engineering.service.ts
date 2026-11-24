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
    tituloProyecto?: string;
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
    fechaLevantamiento?: string;
    fechaCotizacion?: string;
    fechaAprobacion?: string;
    motivoRechazo?: string;
    sucursalId?: number | null;
    tieneSolicitudesCompra?: boolean;
    totalSolicitudesCompra?: number;
}

export interface SeguimientoEjecucion {
    idEjecucion: number;
    idSeguimiento: number;
    utilidadEsperada?: number;
    utilidadReal?: number;
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
    tituloProyecto?: string;
    tipo?: string;               // Tipo de proyecto
    montoTotalEstimado?: number; // Total cotizado del proyecto
    actividadDetenida?: string;  // Nombre de actividad con estatus=4 (Detenida)
    hayActividadDetenida?: boolean; // true si hay al menos una actividad detenida
    tieneSolicitudesCompra?: boolean;
    totalSolicitudesCompra?: number;
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
    equipoEspecial?: string;
    razonDetenido?: string;
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
    equipoEspecial?: string;
    razonDetenido?: string;
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
    getSeguimientos(fechaInicio?: string, fechaFin?: string, usuarioId?: number): Observable<SeguimientoProyecto[]> {
        let params = new HttpParams();
        if (fechaInicio) {
            params = params.set('fechaInicio', fechaInicio);
        }
        if (fechaFin) {
            params = params.set('fechaFin', fechaFin);
        }
        if (usuarioId) {
            params = params.set('usuarioId', usuarioId.toString());
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
    getSeguimientosEjecucion(fechaInicio?: string, fechaFin?: string, usuarioId?: number): Observable<SeguimientoEjecucion[]> {
        let params = new HttpParams();
        if (fechaInicio) {
            params = params.set('fechaInicio', fechaInicio);
        }
        if (fechaFin) {
            params = params.set('fechaFin', fechaFin);
        }
        if (usuarioId) {
            params = params.set('usuarioId', usuarioId.toString());
        }
        return this._http.get<SeguimientoEjecucion[]>(this.apiSeguimientoEjecucion, { params });
    }

    getSeguimientoEjecucionById(id: number): Observable<SeguimientoEjecucion> {
        return this._http.get<SeguimientoEjecucion>(`${this.apiSeguimientoEjecucion}/${id}`);
    }

    getListadoSeleccionProyectos(usuarioId?: number): Observable<any[]> {
        let params = new HttpParams();
        if (usuarioId) {
            params = params.set('usuarioId', usuarioId.toString());
        }
        return this._http.get<any[]>(`${this.apiSeguimiento}/listado-seleccion`, { params });
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

    subirMultiplesArchivosEjecucion(idSeguimiento: number, archivos: File[] | FileList, tipo: string): Observable<any> {
        const formData = new FormData();
        const fileArray = Array.from(archivos);
        fileArray.forEach(file => {
            formData.append('archivos', file);
        });
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

    // ==========================================
    // 📁 APARTADOS/CATEGORÍAS DE ARCHIVOS PERSONALIZABLES
    // ==========================================
    getApartadosEjecucion(idSeguimiento: number): Observable<any[]> {
        return this._http.get<any[]>(`${this.apiSeguimientoEjecucion}/${idSeguimiento}/apartados`);
    }

    sincronizarApartadosEjecucion(idSeguimiento: number, apartados: any[]): Observable<any[]> {
        return this._http.post<any[]>(`${this.apiSeguimientoEjecucion}/${idSeguimiento}/apartados`, apartados);
    }

    eliminarApartadoEjecucion(idSeguimiento: number, idApartado: number): Observable<any> {
        return this._http.delete<any>(`${this.apiSeguimientoEjecucion}/${idSeguimiento}/apartados/${idApartado}`);
    }

    getToken(idSeguimiento: number, tipo: string, nombreArchivo: string): Observable<any> {
        let params = new HttpParams()
            .set('idSeguimiento', idSeguimiento)
            .set('tipo', tipo)
            .set('nombreArchivo', nombreArchivo);
        return this._http.get<any>(`${this.apiSeguimientoEjecucion}/token`, { params });
    }

    // ==========================================
    // 💰 FINANZAS Y SOLICITUDES DE COMPRA DE PROYECTO
    // ==========================================
    getSolicitudesCompraProyecto(idSeguimiento: number): Observable<any[]> {
        return this._http.get<any[]>(`${environment.apiUrl}/SolicitudesCompra/proyecto/${idSeguimiento}`);
    }

    getGastosPersonal(idSeguimiento: number): Observable<any> {
        return this._http.get<any>(`${environment.apiUrl}/SeguimientoEjecucion/${idSeguimiento}/gastos-personal`);
    }

    getViaticosProyecto(idSeguimiento: number): Observable<any> {
        return this._http.get<any>(`${environment.apiUrl}/SeguimientoEjecucion/${idSeguimiento}/viaticos`);
    }

    // ==========================================
    // 📦 SALIDAS DE ALMACÉN (SP_CRM_ObtenerSalidaAlmacenPorFolio)
    // ==========================================
    getSalidasAlmacen(idSeguimiento: number): Observable<SalidaAlmacen[]> {
        return this._http.get<SalidaAlmacen[]>(`${this.apiSeguimientoEjecucion}/salidas-almacen/${idSeguimiento}`);
    }

    buscarSalidaAlmacen(folio: string): Observable<SalidaAlmacen> {
        return this._http.get<SalidaAlmacen>(`${this.apiSeguimientoEjecucion}/salida-almacen/buscar/${encodeURIComponent(folio)}`);
    }

    guardarSalidaAlmacen(idSeguimiento: number, folio: string, idUsuarioRegistro?: number): Observable<SalidaAlmacen[]> {
        return this._http.post<SalidaAlmacen[]>(`${this.apiSeguimientoEjecucion}/salidas-almacen`, {
            idSeguimiento,
            folio,
            idUsuarioRegistro
        });
    }

    eliminarSalidaAlmacen(id: number): Observable<SalidaAlmacen[]> {
        return this._http.delete<SalidaAlmacen[]>(`${this.apiSeguimientoEjecucion}/salidas-almacen/${id}`);
    }

    // ==========================================
    // 🧱 MATERIALES, SERVICIOS Y TRAZABILIDAD
    // ==========================================
    getMaterialesTrazabilidad(idSeguimiento: number): Observable<ResumenTrazabilidadProyecto> {
        return this._http.get<ResumenTrazabilidadProyecto>(`${this.apiSeguimientoEjecucion}/materiales-trazabilidad/${idSeguimiento}`);
    }

    guardarMaterial(data: GuardarSeguimientoMaterial): Observable<ResumenTrazabilidadProyecto> {
        return this._http.post<ResumenTrazabilidadProyecto>(`${this.apiSeguimientoEjecucion}/materiales`, data);
    }

    eliminarMaterial(id: number): Observable<ResumenTrazabilidadProyecto> {
        return this._http.delete<ResumenTrazabilidadProyecto>(`${this.apiSeguimientoEjecucion}/materiales/${id}`);
    }

    // --- Contrato v1.1: responsable de compra, estatus por producto, Excel, proveedor y observaciones ---
    asignarResponsableCompra(idSeguimiento: number, usuarioId: number | null): Observable<ResponsableCompraRespuesta> {
        return this._http.put<ResponsableCompraRespuesta>(`${this.apiSeguimientoEjecucion}/${idSeguimiento}/responsable-compra`, { usuarioId });
    }

    cambiarEstatusMaterial(idMaterial: number, estatus: MaterialEstatus, comentario?: string | null): Observable<SeguimientoMaterial> {
        return this._http.put<SeguimientoMaterial>(`${this.apiSeguimientoEjecucion}/materiales/${idMaterial}/estatus`, {
            estatus,
            comentario: comentario ?? null
        });
    }

    cambiarEstatusMasivo(idSeguimiento: number, idsMaterial: number[], estatus: MaterialEstatus, comentario?: string | null): Observable<ResumenEstatusMasivo> {
        return this._http.put<ResumenEstatusMasivo>(`${this.apiSeguimientoEjecucion}/${idSeguimiento}/materiales/estatus-masivo`, {
            idsMaterial,
            estatus,
            comentario: comentario ?? null
        });
    }

    getHistorialEstatusMaterial(idMaterial: number): Observable<EstatusHistorialItem[]> {
        return this._http.get<EstatusHistorialItem[]>(`${this.apiSeguimientoEjecucion}/materiales/${idMaterial}/estatus-historial`);
    }

    /** No guarda nada: lee el Excel ya subido a la carpeta «Materiales» y devuelve lo que se importaría. */
    previsualizarExcelMateriales(idSeguimiento: number, nombreArchivo: string): Observable<VistaPreviaExcelMateriales> {
        const params = new HttpParams().set('nombreArchivo', nombreArchivo);
        return this._http.get<VistaPreviaExcelMateriales>(`${this.apiSeguimientoEjecucion}/${idSeguimiento}/materiales/excel/previsualizar`, { params });
    }

    importarExcelMateriales(idSeguimiento: number, nombreArchivo: string): Observable<ImportacionExcelRespuesta> {
        return this._http.post<ImportacionExcelRespuesta>(`${this.apiSeguimientoEjecucion}/${idSeguimiento}/materiales/excel/importar`, { nombreArchivo });
    }

    /** Catálogo ligero (sin datos bancarios). No usar `GET ProveedorMaestro` desde esta pantalla. */
    getProveedoresMateriales(q?: string | null, limite?: number): Observable<ProveedorLigero[]> {
        let params = new HttpParams();
        if (q) {
            params = params.set('q', q);
        }
        if (limite) {
            params = params.set('limite', limite.toString());
        }
        return this._http.get<ProveedorLigero[]>(`${this.apiSeguimientoEjecucion}/materiales/proveedores`, { params });
    }

    guardarCompraMaterial(idMaterial: number, datos: GuardarCompraMaterial): Observable<SeguimientoMaterial> {
        return this._http.put<SeguimientoMaterial>(`${this.apiSeguimientoEjecucion}/materiales/${idMaterial}/compra`, datos);
    }

    buscarProductosCatalogo(filtro: string): Observable<any[]> {
        return this._http.get<any[]>(`${environment.apiUrl}/SolicitudesCompra/buscar-productos?filtro=${encodeURIComponent(filtro)}`);
    }
}

export interface SalidaAlmacen {
    id?: number;
    idSeguimiento: number;
    folio: string;
    fechaRegistro?: string;
    serieFolio?: string;
    fecha?: string;
    razonSocial?: string;
    rfc?: string;
    codigoConcepto?: string;
    nombreConcepto?: string;
    referencia?: string;
    observaciones?: string;
    total?: number;
    estatus?: string;
    detalleRaw?: any[];
}

/** Estatus funcional de cada producto (contrato v1.1 §1). Solo `EnProceso` cuenta como «por comprar». */
export type MaterialEstatus = 'EnProceso' | 'Listo' | 'PendienteRecoleccion' | 'Anulado' | 'Recolectado';

export const MATERIAL_ESTATUS: ReadonlyArray<{ codigo: MaterialEstatus; etiqueta: string; cuentaComoPorComprar: boolean }> = [
    { codigo: 'EnProceso', etiqueta: 'En proceso', cuentaComoPorComprar: true },
    { codigo: 'Listo', etiqueta: 'Listo', cuentaComoPorComprar: false },
    { codigo: 'PendienteRecoleccion', etiqueta: 'Pendiente de recolección', cuentaComoPorComprar: false },
    { codigo: 'Anulado', etiqueta: 'Anulado', cuentaComoPorComprar: false },
    { codigo: 'Recolectado', etiqueta: 'Recolectado', cuentaComoPorComprar: false }
];

export interface SeguimientoMaterial {
    idMaterial: number;
    idSeguimiento: number;
    tipoItem: number; // 1: Material, 2: Servicio / Renta (el 1 ya no significa «CONTPAQ»)
    productoId?: number;
    codigoProducto?: string;
    descripcion: string;
    unidadMedida?: string;
    cantidadCotizada: number;
    precioUnitarioCotizado: number;
    importeCotizado: number;
    /** Observaciones del producto (en pantalla se llama «Observaciones»). */
    notas?: string | null;
    fechaRegistro?: string;
    idUsuarioRegistro?: number;

    // Contrato v1.1
    marca?: string | null;
    seccion?: string | null;
    proveedorId?: number | null;
    /** Nombre comercial del proveedor, o su razón social si no tiene. */
    proveedorNombre?: string | null;
    estatus: MaterialEstatus;
    fechaEstatus?: string | null;
    archivoOrigen?: string | null;

    // Trazabilidad dinámica
    cantidadComprada: number;
    costoTotalComprado: number;
    precioUnitarioPromedioCompra: number;

    cantidadSurtida: number;
    costoTotalSurtido: number;
    costoUnitarioPromedioSurtido: number;

    cantidadPendienteSurtir: number;
    variacionImporte: number;
    semaforo: string; // 'Por Comprar' | 'En Proceso' | 'En Almacén' | 'Surtido Completo' | 'Sobrecosto'

    comprasRelacionadas?: MaterialDetalleCompra[];
    salidasRelacionadas?: MaterialDetalleSalida[];
    expanded?: boolean; // Frontend UI helper
}

export interface MaterialDetalleCompra {
    idSolicitud: number;
    folioOC?: string;
    fechaSolicitud?: string;
    proveedor?: string;
    cantidad: number;
    costoUnitario: number;
    importeTotal: number;
    estatus?: string;
}

export interface MaterialDetalleSalida {
    folioSalida: string;
    fechaSalida?: string;
    cantidad: number;
    costoUnitario: number;
    importeTotal: number;
    almacen?: string;
}

export interface ResponsableCompra {
    usuarioId: number;
    nombre: string;
}

export interface ConteoPorEstatus {
    total: number;
    enProceso: number;
    listo: number;
    pendienteRecoleccion: number;
    anulado: number;
    recolectado: number;
}

export interface ResumenTrazabilidadProyecto {
    idSeguimiento: number;
    responsableCompra: ResponsableCompra | null;
    conteoPorEstatus: ConteoPorEstatus;
    totalCotizado: number;
    totalComprado: number;
    totalSurtidoAlmacen: number;
    diferenciaPresupuesto: number;
    itemsCompletos: number;
    itemsEnProceso: number;
    itemsPendientes: number;
    materiales: SeguimientoMaterial[];
}

export interface GuardarSeguimientoMaterial {
    idMaterial?: number;
    idSeguimiento: number;
    tipoItem: number;
    productoId?: number;
    codigoProducto?: string;
    descripcion: string;
    unidadMedida?: string;
    cantidadCotizada: number;
    precioUnitarioCotizado: number;
    importeCotizado?: number;
    notas?: string;
    /** `null`/ausente = sin cambio; cadena vacía = limpiar (contrato §6.2). */
    marca?: string | null;
    seccion?: string | null;
}

export interface ResponsableCompraRespuesta {
    idSeguimiento: number;
    responsableCompra: ResponsableCompra | null;
}

/** Respuesta ligera del cambio masivo (contrato v1.3): conteo de todo el proyecto y el estatus de los productos pedidos. */
export interface ResumenEstatusMasivo {
    idSeguimiento: number;
    conteoPorEstatus: ConteoPorEstatus;
    materiales: { idMaterial: number; estatus: MaterialEstatus; fechaEstatus?: string | null }[];
}

export interface EstatusHistorialItem {
    estatusAnterior: MaterialEstatus;
    estatusNuevo: MaterialEstatus;
    comentario?: string | null;
    usuarioNombre?: string | null;
    fecha: string;
}

export interface MaterialExcelFila {
    fila: number;
    seccion?: string | null;
    cantidad: number;
    unidad?: string | null;
    concepto: string;
    codigo?: string | null;
    marca?: string | null;
    precioUnitario: number;
    subtotal: number;
    tipoItem: number;
    accion: 'agregar' | 'actualizar' | 'sinCambio';
    advertencias: string[];
}

export interface ResumenVistaPreviaExcel {
    totalFilas: number;
    materiales: number;
    servicios: number;
    agregar: number;
    actualizar: number;
    sinCambio: number;
    noEncontradosEnArchivo: number;
    omitidas: number;
}

export interface VistaPreviaExcelMateriales {
    nombreArchivo: string;
    hoja: string;
    filaEncabezado: number;
    filas: MaterialExcelFila[];
    resumen: ResumenVistaPreviaExcel;
    advertencias: string[];
}

export interface ImportacionExcelMateriales {
    agregados: number;
    actualizados: number;
    sinCambio: number;
    noEncontradosEnArchivo: number;
    omitidas: number;
}

export interface ImportacionExcelRespuesta {
    importacion: ImportacionExcelMateriales;
    trazabilidad: ResumenTrazabilidadProyecto;
}

export interface ProveedorLigero {
    idProveedor: number;
    razonSocial: string;
    nombreComercial?: string | null;
    rfc?: string | null;
}

/** Se reemplazan los dos valores (contrato §6.7): el front siempre manda ambos. */
export interface GuardarCompraMaterial {
    proveedorId: number | null;
    notas: string | null;
}


