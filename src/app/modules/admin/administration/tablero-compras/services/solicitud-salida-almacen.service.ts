import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, tap } from 'rxjs';
import { environment } from 'environments/environment';
import { 
    SolicitudSalidaAlmacen, 
    SolicitudSalidaAlmacenCreateDto, 
    RegistrarEntregaSalidaDto, 
    MaterialAlmacenDto 
} from '../models/solicitud-salida-almacen.types';

@Injectable({
    providedIn: 'root'
})
export class SolicitudSalidaAlmacenService {
    private apiUrl = `${environment.apiUrl}/SolicitudesSalidaAlmacen`;

    private _salidas: BehaviorSubject<SolicitudSalidaAlmacen[]> = new BehaviorSubject<SolicitudSalidaAlmacen[]>([]);
    public salidas$: Observable<SolicitudSalidaAlmacen[]> = this._salidas.asObservable();

    constructor(private _http: HttpClient) {}

    getTodas(busqueda?: string, estatus?: string, fechaInicio?: string, fechaFin?: string): Observable<SolicitudSalidaAlmacen[]> {
        let params = new HttpParams();
        if (busqueda) params = params.set('busqueda', busqueda);
        if (estatus) params = params.set('estatus', estatus);
        if (fechaInicio) params = params.set('fechaInicio', fechaInicio);
        if (fechaFin) params = params.set('fechaFin', fechaFin);

        return this._http.get<SolicitudSalidaAlmacen[]>(this.apiUrl, { params }).pipe(
            tap(list => this._salidas.next(list)),
            catchError(err => {
                console.error('[SolicitudSalidaAlmacenService] Error cargando salidas:', err);
                return of([]);
            })
        );
    }

    getPorId(id: number): Observable<SolicitudSalidaAlmacen> {
        return this._http.get<SolicitudSalidaAlmacen>(`${this.apiUrl}/${id}`);
    }

    crear(dto: SolicitudSalidaAlmacenCreateDto): Observable<SolicitudSalidaAlmacen> {
        return this._http.post<SolicitudSalidaAlmacen>(this.apiUrl, dto).pipe(
            tap(() => this.getTodas().subscribe())
        );
    }

    registrarEntrega(id: number, dto: RegistrarEntregaSalidaDto): Observable<SolicitudSalidaAlmacen> {
        return this._http.put<SolicitudSalidaAlmacen>(`${this.apiUrl}/${id}/entrega`, dto).pipe(
            tap(() => this.getTodas().subscribe())
        );
    }

    cancelar(id: number): Observable<any> {
        return this._http.put(`${this.apiUrl}/${id}/cancelar`, {}).pipe(
            tap(() => this.getTodas().subscribe())
        );
    }

    buscarMaterialesAlmacen(busqueda: string, almacen: string = '1'): Observable<MaterialAlmacenDto[]> {
        if (!busqueda || busqueda.trim().length < 2) return of([]);
        const params = new HttpParams()
            .set('busqueda', busqueda.trim())
            .set('almacen', almacen);

        return this._http.get<MaterialAlmacenDto[]>(`${this.apiUrl}/buscar-materiales`, { params }).pipe(
            catchError(() => of([]))
        );
    }
}
