import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import {
    Ajuste, AjusteGuardar, CalendarioItem, DiaNoLaborable, Incidencia, IncidenciaGuardar, MensajeApi, Previsualizacion,
    SaldoVacaciones, SolicitudAusencia, SolicitudGuardar, TipoAusencia
} from './ausencias.types';

/**
 * Acceso al API de vacaciones y permisos. «Mis» = el colaborador de la sesión; aprobaciones = jefe inmediato o RRHH;
 * los métodos «De»/RRHH exigen el permiso especial rrhh.permisos.aprobar. Las fechas que se envían van como 'yyyy-MM-dd'.
 */
@Injectable({ providedIn: 'root' })
export class AusenciasService {
    private readonly _http = inject(HttpClient);
    private readonly _api = `${environment.apiUrl}/rrhh`;

    // ------------------------------------------------------------------ colaborador (sesión)

    tipos(): Observable<TipoAusencia[]> {
        return this._http.get<TipoAusencia[]>(`${this._api}/mis-ausencias/tipos`);
    }

    saldo(): Observable<SaldoVacaciones> {
        return this._http.get<SaldoVacaciones>(`${this._api}/mis-ausencias/saldo`);
    }

    previsualizar(tipoAusenciaId: number, inicio: string, fin: string): Observable<Previsualizacion> {
        const params = new HttpParams().set('tipoAusenciaId', tipoAusenciaId).set('inicio', inicio).set('fin', fin);
        return this._http.get<Previsualizacion>(`${this._api}/mis-ausencias/previsualizar`, { params });
    }

    misSolicitudes(): Observable<SolicitudAusencia[]> {
        return this._http.get<SolicitudAusencia[]>(`${this._api}/mis-ausencias`);
    }

    solicitar(dto: SolicitudGuardar): Observable<SolicitudAusencia> {
        return this._http.post<SolicitudAusencia>(`${this._api}/mis-ausencias`, dto);
    }

    cancelar(solicitudId: number): Observable<MensajeApi> {
        return this._http.post<MensajeApi>(`${this._api}/mis-ausencias/${solicitudId}/cancelar`, {});
    }

    // ------------------------------------------------------------------ jefe inmediato y RRHH

    porAprobar(): Observable<SolicitudAusencia[]> {
        return this._http.get<SolicitudAusencia[]>(`${this._api}/aprobaciones`);
    }

    aprobar(solicitudId: number, comentario?: string): Observable<MensajeApi> {
        return this._http.post<MensajeApi>(`${this._api}/aprobaciones/${solicitudId}/aprobar`, { comentario: comentario ?? null });
    }

    rechazar(solicitudId: number, motivo: string): Observable<MensajeApi> {
        return this._http.post<MensajeApi>(`${this._api}/aprobaciones/${solicitudId}/rechazar`, { motivo });
    }

    calendario(desde: string, hasta: string, sucursalId?: number | null): Observable<CalendarioItem[]> {
        let params = new HttpParams().set('desde', desde).set('hasta', hasta);
        if (sucursalId) params = params.set('sucursalId', sucursalId);
        return this._http.get<CalendarioItem[]>(`${this._api}/calendario-ausencias`, { params });
    }

    // ------------------------------------------------------------------ RRHH (rrhh.permisos.aprobar)

    tiposRrhh(): Observable<TipoAusencia[]> {
        return this._http.get<TipoAusencia[]>(`${this._api}/ausencias/tipos`);
    }

    saldoDe(colaboradorId: number): Observable<SaldoVacaciones> {
        return this._http.get<SaldoVacaciones>(`${this._api}/ausencias/colaboradores/${colaboradorId}/saldo`);
    }

    solicitudesDe(colaboradorId: number): Observable<SolicitudAusencia[]> {
        return this._http.get<SolicitudAusencia[]>(`${this._api}/ausencias/colaboradores/${colaboradorId}/solicitudes`);
    }

    /** Captura por un colaborador (p. ej. sin usuario): queda aprobada y acepta fechas pasadas. */
    capturar(colaboradorId: number, dto: SolicitudGuardar): Observable<SolicitudAusencia> {
        return this._http.post<SolicitudAusencia>(`${this._api}/ausencias/colaboradores/${colaboradorId}/solicitudes`, dto);
    }

    cancelarComoRrhh(solicitudId: number): Observable<MensajeApi> {
        return this._http.post<MensajeApi>(`${this._api}/ausencias/solicitudes/${solicitudId}/cancelar`, {});
    }

    ajustes(colaboradorId: number): Observable<Ajuste[]> {
        return this._http.get<Ajuste[]>(`${this._api}/ausencias/colaboradores/${colaboradorId}/ajustes`);
    }

    ajustar(colaboradorId: number, dto: AjusteGuardar): Observable<Ajuste> {
        return this._http.post<Ajuste>(`${this._api}/ausencias/colaboradores/${colaboradorId}/ajustes`, dto);
    }

    incidencias(colaboradorId: number): Observable<Incidencia[]> {
        return this._http.get<Incidencia[]>(`${this._api}/ausencias/colaboradores/${colaboradorId}/incidencias`);
    }

    registrarIncidencia(colaboradorId: number, dto: IncidenciaGuardar): Observable<Incidencia> {
        return this._http.post<Incidencia>(`${this._api}/ausencias/colaboradores/${colaboradorId}/incidencias`, dto);
    }

    eliminarIncidencia(incidenciaId: number): Observable<MensajeApi> {
        return this._http.delete<MensajeApi>(`${this._api}/ausencias/incidencias/${incidenciaId}`);
    }

    diasNoLaborables(anio: number): Observable<DiaNoLaborable[]> {
        return this._http.get<DiaNoLaborable[]>(`${this._api}/ausencias/dias-no-laborables`, { params: new HttpParams().set('anio', anio) });
    }

    agregarDiaNoLaborable(fecha: string, nombre: string): Observable<MensajeApi> {
        return this._http.post<MensajeApi>(`${this._api}/ausencias/dias-no-laborables`, { fecha, nombre });
    }

    quitarDiaNoLaborable(fecha: string): Observable<MensajeApi> {
        return this._http.delete<MensajeApi>(`${this._api}/ausencias/dias-no-laborables/${fecha}`);
    }
}
