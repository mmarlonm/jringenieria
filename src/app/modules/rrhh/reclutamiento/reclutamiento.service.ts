import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import {
    ActualizarCandidatoDto,
    ActualizarRequisicionDto,
    Candidato,
    CatalogosReclutamiento,
    CrearCandidatoDto,
    CrearRequisicionDto,
    Entrevista,
    Evaluacion,
    RegistrarEntrevistaDto,
    RegistrarEvaluacionDto,
    RequisicionDetalle,
    RequisicionResumen
} from './reclutamiento.types';

@Injectable({ providedIn: 'root' })
export class ReclutamientoService {
    private readonly _http = inject(HttpClient);
    private readonly _api = `${environment.apiUrl}/rrhh/reclutamiento`;

    // Requisiciones
    listarRequisiciones(filtros: { estatus?: string; sucursalId?: number | null; buscar?: string } = {}): Observable<RequisicionResumen[]> {
        let params = new HttpParams();
        if (filtros.estatus) params = params.set('estatus', filtros.estatus);
        if (filtros.sucursalId) params = params.set('sucursalId', filtros.sucursalId);
        if (filtros.buscar) params = params.set('buscar', filtros.buscar);
        return this._http.get<RequisicionResumen[]>(`${this._api}/requisiciones`, { params });
    }

    obtenerRequisicion(id: number): Observable<RequisicionDetalle> {
        return this._http.get<RequisicionDetalle>(`${this._api}/requisiciones/${id}`);
    }

    crearRequisicion(dto: CrearRequisicionDto): Observable<RequisicionDetalle> {
        return this._http.post<RequisicionDetalle>(`${this._api}/requisiciones`, dto);
    }

    actualizarRequisicion(id: number, dto: ActualizarRequisicionDto): Observable<RequisicionDetalle> {
        return this._http.put<RequisicionDetalle>(`${this._api}/requisiciones/${id}`, dto);
    }

    cambiarAprobacion(id: number, tipo: 'AdminGeneral' | 'Direccion' | 'Rrhh', aprobado: boolean): Observable<RequisicionDetalle> {
        return this._http.post<RequisicionDetalle>(`${this._api}/requisiciones/${id}/aprobacion`, { tipo, aprobado });
    }

    publicarRequisicion(id: number, fechaPublicacion?: string | null): Observable<RequisicionDetalle> {
        return this._http.post<RequisicionDetalle>(`${this._api}/requisiciones/${id}/publicar`, { fechaPublicacion });
    }

    cancelarRequisicion(id: number, motivoCancelacion: string): Observable<RequisicionDetalle> {
        return this._http.post<RequisicionDetalle>(`${this._api}/requisiciones/${id}/cancelar`, { motivoCancelacion });
    }

    // Candidatos
    listarCandidatos(filtros: { requisicionId?: number | null; estatus?: string; buscar?: string } = {}): Observable<Candidato[]> {
        let params = new HttpParams();
        if (filtros.requisicionId) params = params.set('requisicionId', filtros.requisicionId);
        if (filtros.estatus) params = params.set('estatus', filtros.estatus);
        if (filtros.buscar) params = params.set('buscar', filtros.buscar);
        return this._http.get<Candidato[]>(`${this._api}/candidatos`, { params });
    }

    rankingPorVacante(requisicionId: number): Observable<Candidato[]> {
        return this._http.get<Candidato[]>(`${this._api}/requisiciones/${requisicionId}/ranking`);
    }

    obtenerCandidato(id: number): Observable<Candidato> {
        return this._http.get<Candidato>(`${this._api}/candidatos/${id}`);
    }

    crearCandidato(dto: CrearCandidatoDto): Observable<Candidato> {
        return this._http.post<Candidato>(`${this._api}/candidatos`, dto);
    }

    actualizarCandidato(id: number, dto: ActualizarCandidatoDto): Observable<Candidato> {
        return this._http.put<Candidato>(`${this._api}/candidatos/${id}`, dto);
    }

    cambiarEstatusCandidato(id: number, nuevoEstatus: string, motivoDescarte?: string | null): Observable<Candidato> {
        return this._http.post<Candidato>(`${this._api}/candidatos/${id}/estatus`, { nuevoEstatus, motivoDescarte });
    }

    // Entrevistas & Evaluaciones
    registrarEntrevista(dto: RegistrarEntrevistaDto): Observable<Entrevista> {
        return this._http.post<Entrevista>(`${this._api}/entrevistas`, dto);
    }

    registrarEvaluacion(dto: RegistrarEvaluacionDto): Observable<Evaluacion> {
        return this._http.post<Evaluacion>(`${this._api}/evaluaciones`, dto);
    }

    // Catálogos
    catalogos(): Observable<CatalogosReclutamiento> {
        return this._http.get<CatalogosReclutamiento>(`${this._api}/catalogos`);
    }
}

