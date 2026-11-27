import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface UsuarioPorVista {
    usuarioId: number;
    nombreUsuario: string;
    email: string;
    activo: boolean;
    roles: string[];
}

export interface VistaConUsuarios {
    vistaId: number;
    nombreVista: string;
    ruta: string;
    usuarios: UsuarioPorVista[];
}

export interface DescargaItem {
    id: number;
    fechaUtc: string;
    usuarioId: number | null;
    usuarioNombre: string | null;
    origen: string;
    modulo: string;
    nombreArchivo: string;
    ruta: string;
    tamanoBytes: number | null;
}

export interface DescargasPaginadas {
    total: number;
    items: DescargaItem[];
}

export interface ConteoModulo {
    modulo: string;
    cantidad: number;
}

export interface TopUsuario {
    usuarioId: number | null;
    usuarioNombre: string | null;
    cantidad: number;
}

export interface TopArchivo {
    nombreArchivo: string;
    modulo: string;
    cantidad: number;
}

export interface DescargasResumen {
    total: number;
    porModulo: ConteoModulo[];
    topUsuarios: TopUsuario[];
    topArchivos: TopArchivo[];
}

@Injectable({ providedIn: 'root' })
export class ReportesService {
    private _http = inject(HttpClient);
    private _apiUrl = `${environment.apiUrl}/SeguridadReportes`;

    obtenerUsuariosPorVista(incluirInactivos: boolean = false): Observable<VistaConUsuarios[]> {
        return this._http.get<VistaConUsuarios[]>(`${this._apiUrl}/usuarios-por-vista`, {
            params: new HttpParams().set('incluirInactivos', incluirInactivos.toString())
        });
    }

    obtenerDescargas(
        desde?: string,
        hasta?: string,
        usuarioId?: number | null,
        modulo?: string,
        texto?: string,
        page: number = 1,
        size: number = 50
    ): Observable<DescargasPaginadas> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        if (desde) params = params.set('desde', desde);
        if (hasta) params = params.set('hasta', hasta);
        if (usuarioId != null) params = params.set('usuarioId', usuarioId.toString());
        if (modulo) params = params.set('modulo', modulo);
        if (texto) params = params.set('texto', texto);

        return this._http.get<DescargasPaginadas>(`${this._apiUrl}/descargas`, { params });
    }

    obtenerResumenDescargas(desde?: string, hasta?: string): Observable<DescargasResumen> {
        let params = new HttpParams();
        if (desde) params = params.set('desde', desde);
        if (hasta) params = params.set('hasta', hasta);

        return this._http.get<DescargasResumen>(`${this._apiUrl}/descargas/resumen`, { params });
    }

    exportarDescargas(
        desde?: string,
        hasta?: string,
        usuarioId?: number | null,
        modulo?: string,
        texto?: string
    ): Observable<DescargaItem[]> {
        let params = new HttpParams();
        if (desde) params = params.set('desde', desde);
        if (hasta) params = params.set('hasta', hasta);
        if (usuarioId != null) params = params.set('usuarioId', usuarioId.toString());
        if (modulo) params = params.set('modulo', modulo);
        if (texto) params = params.set('texto', texto);

        return this._http.get<DescargaItem[]>(`${this._apiUrl}/descargas/exportar`, { params });
    }
}
