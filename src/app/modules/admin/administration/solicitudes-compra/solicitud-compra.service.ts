import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, catchError, map, Observable, of, ReplaySubject, tap } from 'rxjs';
import { environment } from 'environments/environment';
import { SolicitudCompra, CatEstatusCompra, SolicitudCompraCreateDto, ProductoBuscadorDto, HistorialEstatusDto } from './models/solicitud-compra.types';

@Injectable({
    providedIn: 'root'
})
export class SolicitudCompraService {
    private apiUrl = `${environment.apiUrl}/SolicitudesCompra`;

    private _solicitudes: ReplaySubject<SolicitudCompra[]> = new ReplaySubject<SolicitudCompra[]>(1);
    private _solicitud: BehaviorSubject<SolicitudCompra | null> = new BehaviorSubject(null);
    private _estatus: BehaviorSubject<CatEstatusCompra[]> = new BehaviorSubject([]);

    constructor(private _httpClient: HttpClient) { }

    buscarProductos(filtro: string = ''): Observable<ProductoBuscadorDto[]> {
        return this._httpClient.get<{ success: boolean, data: ProductoBuscadorDto[] }>(`${this.apiUrl}/buscar-productos`, {
            params: { filtro }
        }).pipe(
            map(response => response.data || []),
            catchError(() => of([] as ProductoBuscadorDto[]))
        );
    }

    consultarExistenciaContpaqi(busqueda: string, almacen: string): Observable<ProductoBuscadorDto[]> {
        return this._httpClient.get<any>(`${this.apiUrl}/consultar-existencia-contpaqi`, {
            params: { busqueda, almacen }
        }).pipe(
            map(response => {
                // Determine if the data is wrapped in { data: [...] } or is a direct array
                const rawData = response?.data !== undefined ? response.data : response;
                const data = Array.isArray(rawData) ? rawData : [];
                
                return data.map(p => ({
                    productoId: 0,
                    codigoProducto: p.codigo || p.codigoProducto || '',
                    nombreProducto: p.producto || p.nombreProducto || '',
                    existencia: p.cantidadReal !== undefined ? p.cantidadReal : (p.existencia || 0),
                    almacen: p.almacen || p.warehouse || almacen,
                    unidadMedida: p.unidadMedida || 'PZ'
                }));
            }),
            catchError(err => {
                console.error('Error en consultarExistenciaContpaqi:', err);
                return of([] as ProductoBuscadorDto[]);
            })
        );
    }

    get solicitudes$(): Observable<SolicitudCompra[]> {
        return this._solicitudes.asObservable();
    }

    get solicitud$(): Observable<SolicitudCompra> {
        return this._solicitud.asObservable();
    }

    get estatus$(): Observable<CatEstatusCompra[]> {
        return this._estatus.asObservable();
    }

    getEstatus(): Observable<CatEstatusCompra[]> {
        return this._httpClient.get<CatEstatusCompra[]>(`${this.apiUrl}/estatus`).pipe(
            tap((estatus) => {
                this._estatus.next(estatus);
            })
        );
    }

    getTodas(fechaInicio?: string, fechaFin?: string): Observable<SolicitudCompra[]> {
        const params: any = {};
        if (fechaInicio) params.fechaInicio = fechaInicio;
        if (fechaFin) params.fechaFin = fechaFin;

        return this._httpClient.get<SolicitudCompra[]>(this.apiUrl, { params }).pipe(
            tap((solicitudes) => {
                this._solicitudes.next(solicitudes);
            })
        );
    }

    getPorId(id: number): Observable<SolicitudCompra> {
        return this._httpClient.get<SolicitudCompra>(`${this.apiUrl}/${id}`).pipe(
            tap((solicitud) => {
                this._solicitud.next(solicitud);
            })
        );
    }

    crear(dto: SolicitudCompraCreateDto): Observable<any> {
        return this._httpClient.post(`${this.apiUrl}/crear`, dto);
    }

    actualizar(dto: SolicitudCompraCreateDto): Observable<any> {
        // El snippet no muestra un método explícito para actualización general (PUT o POST actualizar),
        // pero el usuario indica que 'crear' es la 'magia' para el 405.
        // Si el backend no tiene un 'update', usaremos 'crear' asumiendo que el servicio maneja el Upsert.
        // De lo contrario, se recomienda agregar un [HttpPut("{id}")] o similar en el controlador.
        return this._httpClient.post(`${this.apiUrl}/crear`, dto);
    }

    actualizarEstatus(id: number, idEstatus: number, folioOc?: string, idUsuario?: number): Observable<any> {
        let params: any = { idEstatus };
        if (folioOc) params.folioOc = folioOc;
        if (idUsuario) params.idUsuario = idUsuario;

        return this._httpClient.put(`${this.apiUrl}/${id}/estatus`, null, { params });
    }

    getHistorial(id: number): Observable<any> {
        return this._httpClient.get<any>(`${this.apiUrl}/${id}/historial`);
    }

    eliminar(id: number): Observable<any> {
        return this._httpClient.delete(`${this.apiUrl}/${id}`);
    }

    subirArchivo(id: number, archivo: File): Observable<any> {
        const formData = new FormData();
        formData.append('archivo', archivo);
        return this._httpClient.post(`${this.apiUrl}/${id}/archivos`, formData);
    }

    getArchivos(id: number): Observable<any> {
        return this._httpClient.get<any>(`${this.apiUrl}/${id}/archivos`);
    }

    descargarArchivo(id: number, nombreArchivo: string): Observable<Blob> {
        return this._httpClient.get<any>(`${this.apiUrl}/${id}/archivos/${nombreArchivo}`).pipe(
            map(response => {
                const base64Content = response.data;
                const byteCharacters = atob(base64Content);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                
                const extension = nombreArchivo.split('.').pop()?.toLowerCase();
                let type = 'application/octet-stream';
                if (extension === 'pdf') type = 'application/pdf';
                else if (['png', 'jpg', 'jpeg'].includes(extension)) type = `image/${extension}`;
                
                return new Blob([byteArray], { type });
            })
        );
    }

    eliminarArchivo(id: number, nombreArchivo: string): Observable<any> {
        return this._httpClient.delete(`${this.apiUrl}/${id}/archivos/${nombreArchivo}`);
    }

    getDetalleConsolidado(idSolicitud: number): Observable<any> {
        return this._httpClient.get<any>(`${this.apiUrl}/recepcion/detalle-consolidado/${idSolicitud}`);
    }

    actualizarEstadoLiquidacion(idSolicitud: number, nuevoEstado: number): Observable<any> {
        return this._httpClient.put(`${this.apiUrl}/${idSolicitud}/estado-liquidacion`, nuevoEstado);
    }
}
