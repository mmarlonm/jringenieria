import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable, ReplaySubject, tap } from 'rxjs';
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
            map(response => response.data || [])
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
        return this._httpClient.get(`${this.apiUrl}/${id}/archivos/${nombreArchivo}`, { responseType: 'blob' });
    }

    eliminarArchivo(id: number, nombreArchivo: string): Observable<any> {
        return this._httpClient.delete(`${this.apiUrl}/${id}/archivos/${nombreArchivo}`);
    }
}
