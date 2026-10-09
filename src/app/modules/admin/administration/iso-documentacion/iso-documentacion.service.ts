import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';

export interface IsoApartado {
    nombre: string;
    label: string;
    icon?: string;
}

export interface IsoArchivo {
    tipo: string;
    nombreArchivo: string;
    tamanoBytes?: number;
    fechaModificacion?: string;
    esZip?: boolean;
}

export interface IsoRespuestaArchivos {
    apartados: IsoApartado[];
    archivos: IsoArchivo[];
}

export interface IsoBitacoraItem {
    id: number;
    accion: 'SUBIDA' | 'DESCARGA' | 'ELIMINACION' | 'CREACION_CARPETA' | string;
    seccion: string;
    nombreArchivo: string;
    usuario: string;
    fechaRegistro: string;
    detalle?: string;
    tamanoBytes?: number;
    ip?: string;
}

@Injectable({
    providedIn: 'root'
})
export class IsoDocumentacionService {
    private _http = inject(HttpClient);
    private _apiUrl = `${environment.apiUrl}/IsoDocumentacion`;

    obtenerArchivos(): Observable<IsoRespuestaArchivos> {
        return this._http.get<IsoRespuestaArchivos>(`${this._apiUrl}/archivos`);
    }

    obtenerBitacora(limite: number = 100): Observable<IsoBitacoraItem[]> {
        const params = new HttpParams().set('limite', limite.toString());
        return this._http.get<IsoBitacoraItem[]>(`${this._apiUrl}/bitacora`, { params });
    }

    crearApartado(nombreApartado: string, usuario?: string): Observable<any> {
        let params = new HttpParams();
        if (usuario) params = params.set('usuario', usuario);

        return this._http.post<any>(`${this._apiUrl}/crear-apartado`, {
            nombreApartado
        }, { params });
    }

    crearSubcarpeta(apartado: string, subcarpeta: string, usuario?: string): Observable<any> {
        let params = new HttpParams();
        if (usuario) params = params.set('usuario', usuario);

        return this._http.post<any>(`${this._apiUrl}/crear-subcarpeta`, {
            apartado,
            subcarpeta
        }, { params });
    }

    subirArchivos(formData: FormData): Observable<any> {
        return this._http.post<any>(`${this._apiUrl}/subir`, formData);
    }

    subirArchivosConProgreso(formData: FormData): Observable<any> {
        return this._http.post<any>(`${this._apiUrl}/subir`, formData, {
            reportProgress: true,
            observe: 'events'
        });
    }

    descargarArchivo(tipo: string, nombreArchivo: string, usuario?: string): Observable<any> {
        let params = new HttpParams()
            .set('tipo', tipo)
            .set('nombreArchivo', nombreArchivo);
        if (usuario) params = params.set('usuario', usuario);

        return this._http.get<any>(`${this._apiUrl}/descargar`, { params });
    }

    eliminar(tipo: string, nombreArchivo?: string, subcarpeta?: string, usuario?: string): Observable<any> {
        let params = new HttpParams().set('tipo', tipo);
        if (nombreArchivo) params = params.set('nombreArchivo', nombreArchivo);
        if (subcarpeta) params = params.set('subcarpeta', subcarpeta);
        if (usuario) params = params.set('usuario', usuario);

        return this._http.delete<any>(`${this._apiUrl}/eliminar`, { params });
    }

    getToken(tipo: string, nombreArchivo: string, mode: string = 'edit', usuario?: string): Observable<any> {
        let params = new HttpParams()
            .set('tipo', tipo)
            .set('nombreArchivo', nombreArchivo)
            .set('mode', mode);
        if (usuario) params = params.set('usuario', usuario);

        return this._http.get<any>(`${this._apiUrl}/token`, { params });
    }

    renombrar(tipo: string, nombreArchivoActual: string, nuevoNombre: string, usuario?: string): Observable<any> {
        let params = new HttpParams();
        if (usuario) params = params.set('usuario', usuario);

        return this._http.post<any>(`${this._apiUrl}/renombrar`, {
            tipo,
            nombreArchivoActual,
            nuevoNombre
        }, { params });
    }
}

