import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import {
    Beneficiario, BitacoraItem, Catalogos, ColaboradorDetalle, ColaboradorGuardar, ColaboradorLista,
    ColaboradorNomina, ColaboradorSalud, Contrato, ContratoGuardar, GeocercaSucursal, GeocercaSucursalGuardar, Parametro, ResultadoImportacion, UsuarioDisponible
} from './colaboradores.types';

/** Acceso al API de RRHH ET1 (colaboradores, contratos, datos sensibles y parámetros). */
@Injectable({ providedIn: 'root' })
export class ColaboradoresService {
    private readonly _http = inject(HttpClient);
    private readonly _api = `${environment.apiUrl}/rrhh/colaboradores`;
    private readonly _apiParametros = `${environment.apiUrl}/rrhh/parametros`;

    listar(filtros: { estatus?: string; sucursalId?: number | null; buscar?: string } = {}): Observable<ColaboradorLista[]> {
        let params = new HttpParams();
        if (filtros.estatus) params = params.set('estatus', filtros.estatus);
        if (filtros.sucursalId) params = params.set('sucursalId', filtros.sucursalId);
        if (filtros.buscar) params = params.set('buscar', filtros.buscar);
        return this._http.get<ColaboradorLista[]>(this._api, { params });
    }

    /** Geocerca de cada sucursal (punto de referencia y radio). */
    geocercasSucursales(): Observable<GeocercaSucursal[]> {
        return this._http.get<GeocercaSucursal[]>(`${this._api}/sucursales-geocerca`);
    }

    guardarGeocercaSucursal(id: number, dto: GeocercaSucursalGuardar): Observable<{ mensaje: string }> {
        return this._http.put<{ mensaje: string }>(`${this._api}/sucursales/${id}/geocerca`, dto);
    }

    catalogos(): Observable<Catalogos> {
        return this._http.get<Catalogos>(`${this._api}/catalogos`);
    }

    usuariosDisponibles(): Observable<UsuarioDisponible[]> {
        return this._http.get<UsuarioDisponible[]>(`${this._api}/usuarios-disponibles`);
    }

    /** Crea colaboradores INACTIVOS desde usuarios del sistema (idempotente: los que ya lo son se omiten). */
    importarUsuarios(usuarioIds: number[]): Observable<ResultadoImportacion> {
        return this._http.post<ResultadoImportacion>(`${this._api}/importar-usuarios`, { usuarioIds });
    }

    obtener(id: number): Observable<ColaboradorDetalle> {
        return this._http.get<ColaboradorDetalle>(`${this._api}/${id}`);
    }

    crear(dto: ColaboradorGuardar): Observable<ColaboradorDetalle> {
        return this._http.post<ColaboradorDetalle>(this._api, dto);
    }

    actualizar(id: number, dto: ColaboradorGuardar): Observable<ColaboradorDetalle> {
        return this._http.put<ColaboradorDetalle>(`${this._api}/${id}`, dto);
    }

    guardarBeneficiarios(id: number, items: Beneficiario[]): Observable<Beneficiario[]> {
        return this._http.put<Beneficiario[]>(`${this._api}/${id}/beneficiarios`, items);
    }

    listarContratos(id: number): Observable<Contrato[]> {
        return this._http.get<Contrato[]>(`${this._api}/${id}/contratos`);
    }

    agregarContrato(id: number, dto: ContratoGuardar): Observable<Contrato> {
        return this._http.post<Contrato>(`${this._api}/${id}/contratos`, dto);
    }

    /** Sube (o reemplaza) el contrato firmado: PDF, JPG o PNG de hasta 10 MB. */
    subirContratoFirmado(id: number, contratoId: number, archivo: File): Observable<Contrato> {
        const form = new FormData();
        form.append('archivo', archivo, archivo.name);
        return this._http.post<Contrato>(`${this._api}/${id}/contratos/${contratoId}/firmado`, form);
    }

    descargarContratoFirmado(id: number, contratoId: number): Observable<Blob> {
        return this._http.get(`${this._api}/${id}/contratos/${contratoId}/firmado`, { responseType: 'blob' });
    }

    actualizarContrato(id: number, contratoId: number, dto: ContratoGuardar): Observable<Contrato> {
        return this._http.put<Contrato>(`${this._api}/${id}/contratos/${contratoId}`, dto);
    }

    /** null si todavía no se captura. Requiere el permiso especial rrhh.colaboradores.nomina (403 sin él). */
    obtenerNomina(id: number): Observable<ColaboradorNomina | null> {
        return this._http.get<ColaboradorNomina | null>(`${this._api}/${id}/nomina`);
    }

    guardarNomina(id: number, dto: ColaboradorNomina): Observable<ColaboradorNomina> {
        return this._http.put<ColaboradorNomina>(`${this._api}/${id}/nomina`, dto);
    }

    /** null si todavía no se captura. Requiere el permiso especial rrhh.colaboradores.salud (403 sin él). */
    obtenerSalud(id: number): Observable<ColaboradorSalud | null> {
        return this._http.get<ColaboradorSalud | null>(`${this._api}/${id}/salud`);
    }

    guardarSalud(id: number, dto: ColaboradorSalud): Observable<ColaboradorSalud> {
        return this._http.put<ColaboradorSalud>(`${this._api}/${id}/salud`, dto);
    }

    historial(id: number): Observable<BitacoraItem[]> {
        return this._http.get<BitacoraItem[]>(`${this._api}/${id}/historial`);
    }

    listarParametros(): Observable<Parametro[]> {
        return this._http.get<Parametro[]>(this._apiParametros);
    }

    actualizarParametro(clave: string, valor: string): Observable<Parametro> {
        return this._http.put<Parametro>(`${this._apiParametros}/${encodeURIComponent(clave)}`, { valor });
    }
}
