import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';
import {
    Cfdi, CfdiCandidato, ClaseSugerida, ClasificarMovimientos, Cuenta, CuentaGuardar, Empresa, EmpresaGuardar,
    FiltroCfdi, FiltroClases, FiltroConciliacion, FiltroImportaciones, FiltroMovimientos, HojaInfo, Importacion,
    ManualConciliacion, Movimiento, MovimientoConciliacion, Pagina, ResultadoClasificar, ResultadoImportacion,
    ResultadoLote, ResultadoSugerir, ResumenConciliacion, SugerirConciliacion, Vinculo
} from './finanzas.types';

@Injectable({
    providedIn: 'root'
})
export class FinanzasService {
    private _http = inject(HttpClient);
    private readonly _api = `${environment.apiUrl}/Finanzas`;

    empresas(): Observable<Empresa[]> {
        return this._http.get<Empresa[]>(`${this._api}/empresas`);
    }

    crearEmpresa(dto: EmpresaGuardar): Observable<Empresa> {
        return this._http.post<Empresa>(`${this._api}/empresas`, dto);
    }

    actualizarEmpresa(id: number, dto: EmpresaGuardar): Observable<Empresa> {
        return this._http.put<Empresa>(`${this._api}/empresas/${id}`, dto);
    }

    cuentas(empresaId?: number): Observable<Cuenta[]> {
        return this._http.get<Cuenta[]>(`${this._api}/cuentas`, { params: this._query({ empresaId }) });
    }

    crearCuenta(dto: CuentaGuardar): Observable<Cuenta> {
        return this._http.post<Cuenta>(`${this._api}/cuentas`, dto);
    }

    actualizarCuenta(id: number, dto: CuentaGuardar): Observable<Cuenta> {
        return this._http.put<Cuenta>(`${this._api}/cuentas/${id}`, dto);
    }

    hojas(archivo: File): Observable<HojaInfo[]> {
        const datos = new FormData();
        datos.append('archivo', archivo);
        return this._http.post<HojaInfo[]>(`${this._api}/importaciones/hojas`, datos);
    }

    importarCfdi(empresaId: number, archivo: File, hoja: string | null, soloValidar: boolean): Observable<ResultadoImportacion> {
        return this._http.post<ResultadoImportacion>(`${this._api}/cfdi/importar`, this._carga(archivo, 'empresaId', empresaId, hoja, soloValidar));
    }

    listarCfdi(filtro: FiltroCfdi): Observable<Pagina<Cfdi>> {
        return this._http.get<Pagina<Cfdi>>(`${this._api}/cfdi`, { params: this._query(filtro) });
    }

    importarMovimientos(cuentaId: number, archivo: File, hoja: string | null, soloValidar: boolean): Observable<ResultadoImportacion> {
        return this._http.post<ResultadoImportacion>(`${this._api}/movimientos/importar`, this._carga(archivo, 'cuentaId', cuentaId, hoja, soloValidar));
    }

    listarMovimientos(filtro: FiltroMovimientos): Observable<Pagina<Movimiento>> {
        return this._http.get<Pagina<Movimiento>>(`${this._api}/movimientos`, { params: this._query(filtro) });
    }

    importaciones(filtro: FiltroImportaciones): Observable<Pagina<Importacion>> {
        return this._http.get<Pagina<Importacion>>(`${this._api}/importaciones`, { params: this._query(filtro) });
    }

    anularImportacion(id: number): Observable<void> {
        return this._http.post<void>(`${this._api}/importaciones/${id}/anular`, null);
    }

    sugerirConciliaciones(dto: SugerirConciliacion): Observable<ResultadoSugerir> {
        return this._http.post<ResultadoSugerir>(`${this._api}/conciliacion/sugerir`, dto);
    }

    movimientosConciliacion(filtro: FiltroConciliacion): Observable<Pagina<MovimientoConciliacion>> {
        return this._http.get<Pagina<MovimientoConciliacion>>(`${this._api}/conciliacion/movimientos`, { params: this._query(filtro) });
    }

    resumenConciliacion(empresaId: number, cuentaId: number | null, desde: string, hasta: string): Observable<ResumenConciliacion> {
        return this._http.get<ResumenConciliacion>(`${this._api}/conciliacion/resumen`, {
            params: this._query({ empresaId, cuentaId, desde, hasta })
        });
    }

    candidatosCfdi(movimientoId: number, q: string): Observable<CfdiCandidato[]> {
        return this._http.get<CfdiCandidato[]>(`${this._api}/conciliacion/cfdi-candidatos`, {
            params: this._query({ movimientoId, q })
        });
    }

    clasesSugeridas(filtro: FiltroClases): Observable<ClaseSugerida[]> {
        return this._http.get<ClaseSugerida[]>(`${this._api}/conciliacion/clases-sugeridas`, { params: this._query(filtro) });
    }

    confirmarVinculo(id: number): Observable<Vinculo> {
        return this._http.post<Vinculo>(`${this._api}/conciliacion/${id}/confirmar`, null);
    }

    confirmarLote(ids: number[]): Observable<ResultadoLote> {
        return this._http.post<ResultadoLote>(`${this._api}/conciliacion/confirmar-lote`, { ids });
    }

    rechazarVinculo(id: number): Observable<void> {
        return this._http.post<void>(`${this._api}/conciliacion/${id}/rechazar`, null);
    }

    deshacerVinculo(id: number): Observable<void> {
        return this._http.post<void>(`${this._api}/conciliacion/${id}/deshacer`, null);
    }

    conciliarManual(dto: ManualConciliacion): Observable<Vinculo> {
        return this._http.post<Vinculo>(`${this._api}/conciliacion/manual`, dto);
    }

    clasificar(dto: ClasificarMovimientos): Observable<ResultadoClasificar> {
        return this._http.post<ResultadoClasificar>(`${this._api}/movimientos/clasificar`, dto);
    }

    /** Multipart con los nombres que enlaza el controlador; `hoja` solo viaja si se eligió una. */
    private _carga(archivo: File, campoId: 'empresaId' | 'cuentaId', id: number, hoja: string | null, soloValidar: boolean): FormData {
        const datos = new FormData();
        datos.append('archivo', archivo);
        datos.append(campoId, String(id));
        if (hoja !== null) {
            datos.append('hoja', hoja);
        }
        datos.append('soloValidar', soloValidar ? 'true' : 'false');
        return datos;
    }

    /** Query string con los nombres del filtro (ASP.NET no distingue mayúsculas); omite null, undefined y ''. */
    private _query(filtro: object): HttpParams {
        let params = new HttpParams();
        for (const [clave, valor] of Object.entries(filtro)) {
            if (valor !== null && valor !== undefined && valor !== '') {
                params = params.set(clave, String(valor));
            }
        }
        return params;
    }
}
