import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import {
    ColaboradorDesempeno,
    DesempenoCatalogos,
    EvaluacionCompetencia,
    EvaluacionDesempeno,
    GuardarEvaluacionCompetencia,
    GuardarEvaluacionDesempeno,
    GuardarMatrizCompetencia,
    GuardarPlanDesarrollo,
    MatrizCompetencia,
    MiDesempeno,
    PlanDesarrollo
} from './desempeno.types';

@Injectable({ providedIn: 'root' })
export class DesempenoService {
    private readonly _http = inject(HttpClient);
    private readonly _desempeno = `${environment.apiUrl}/rrhh/desempeno`;
    private readonly _competencias = `${environment.apiUrl}/rrhh/competencias`;
    private readonly _mi = `${environment.apiUrl}/rrhh/mi-desempeno`;

    // ---------------------------------------------------------------- apoyo
    catalogos(): Observable<DesempenoCatalogos> {
        return this._http.get<DesempenoCatalogos>(`${this._desempeno}/catalogos`);
    }

    colaboradores(buscar?: string): Observable<ColaboradorDesempeno[]> {
        let params = new HttpParams();
        if (buscar) params = params.set('buscar', buscar);
        return this._http.get<ColaboradorDesempeno[]>(`${this._desempeno}/colaboradores`, { params });
    }

    // ---------------------------------------------------------------- evaluaciones de desempeño
    listarEvaluaciones(filtros: { colaboradorId?: number; periodo?: string; buscar?: string } = {}): Observable<EvaluacionDesempeno[]> {
        let params = new HttpParams();
        if (filtros.colaboradorId) params = params.set('colaboradorId', filtros.colaboradorId);
        if (filtros.periodo) params = params.set('periodo', filtros.periodo);
        if (filtros.buscar) params = params.set('buscar', filtros.buscar);
        return this._http.get<EvaluacionDesempeno[]>(`${this._desempeno}/evaluaciones`, { params });
    }

    crearEvaluacion(dto: GuardarEvaluacionDesempeno): Observable<EvaluacionDesempeno> {
        return this._http.post<EvaluacionDesempeno>(`${this._desempeno}/evaluaciones`, dto);
    }

    actualizarEvaluacion(id: number, dto: GuardarEvaluacionDesempeno): Observable<EvaluacionDesempeno> {
        return this._http.put<EvaluacionDesempeno>(`${this._desempeno}/evaluaciones/${id}`, dto);
    }

    cerrarCiclo(id: number): Observable<EvaluacionDesempeno> {
        return this._http.post<EvaluacionDesempeno>(`${this._desempeno}/evaluaciones/${id}/cerrar`, {});
    }

    liberar(id: number): Observable<EvaluacionDesempeno> {
        return this._http.post<EvaluacionDesempeno>(`${this._desempeno}/evaluaciones/${id}/liberar`, {});
    }

    retirarLiberacion(id: number): Observable<EvaluacionDesempeno> {
        return this._http.post<EvaluacionDesempeno>(`${this._desempeno}/evaluaciones/${id}/retirar-liberacion`, {});
    }

    reabrir(id: number): Observable<EvaluacionDesempeno> {
        return this._http.post<EvaluacionDesempeno>(`${this._desempeno}/evaluaciones/${id}/reabrir`, {});
    }

    // ---------------------------------------------------------------- planes de desarrollo
    listarPlanes(colaboradorId?: number): Observable<PlanDesarrollo[]> {
        let params = new HttpParams();
        if (colaboradorId) params = params.set('colaboradorId', colaboradorId);
        return this._http.get<PlanDesarrollo[]>(`${this._desempeno}/planes`, { params });
    }

    crearPlan(dto: GuardarPlanDesarrollo): Observable<PlanDesarrollo> {
        return this._http.post<PlanDesarrollo>(`${this._desempeno}/planes`, dto);
    }

    actualizarPlan(id: number, dto: GuardarPlanDesarrollo): Observable<PlanDesarrollo> {
        return this._http.put<PlanDesarrollo>(`${this._desempeno}/planes/${id}`, dto);
    }

    eliminarPlan(id: number): Observable<void> {
        return this._http.delete<void>(`${this._desempeno}/planes/${id}`);
    }

    cambiarVisibilidadPlan(id: number, visible: boolean): Observable<PlanDesarrollo> {
        return this._http.post<PlanDesarrollo>(`${this._desempeno}/planes/${id}/visibilidad`, { visible });
    }

    // ---------------------------------------------------------------- matriz y competencias
    listarMatriz(puesto?: string): Observable<MatrizCompetencia[]> {
        let params = new HttpParams();
        if (puesto) params = params.set('puesto', puesto);
        return this._http.get<MatrizCompetencia[]>(`${this._competencias}/matriz`, { params });
    }

    puestos(): Observable<string[]> {
        return this._http.get<string[]>(`${this._competencias}/matriz/puestos`);
    }

    guardarMatriz(dto: GuardarMatrizCompetencia): Observable<MatrizCompetencia> {
        return this._http.put<MatrizCompetencia>(`${this._competencias}/matriz`, dto);
    }

    eliminarMatriz(id: number): Observable<void> {
        return this._http.delete<void>(`${this._competencias}/matriz/${id}`);
    }

    listarCompetencias(filtros: { colaboradorId?: number; soloConBrecha?: boolean; buscar?: string } = {}): Observable<EvaluacionCompetencia[]> {
        let params = new HttpParams();
        if (filtros.colaboradorId) params = params.set('colaboradorId', filtros.colaboradorId);
        if (filtros.soloConBrecha) params = params.set('soloConBrecha', true);
        if (filtros.buscar) params = params.set('buscar', filtros.buscar);
        return this._http.get<EvaluacionCompetencia[]>(`${this._competencias}/evaluaciones`, { params });
    }

    crearCompetencia(dto: GuardarEvaluacionCompetencia): Observable<EvaluacionCompetencia> {
        return this._http.post<EvaluacionCompetencia>(`${this._competencias}/evaluaciones`, dto);
    }

    actualizarCompetencia(id: number, dto: GuardarEvaluacionCompetencia): Observable<EvaluacionCompetencia> {
        return this._http.put<EvaluacionCompetencia>(`${this._competencias}/evaluaciones/${id}`, dto);
    }

    generarCapacitacion(id: number): Observable<EvaluacionCompetencia> {
        return this._http.post<EvaluacionCompetencia>(`${this._competencias}/evaluaciones/${id}/generar-capacitacion`, {});
    }

    // ---------------------------------------------------------------- colaborador
    miDesempeno(): Observable<MiDesempeno> {
        return this._http.get<MiDesempeno>(this._mi);
    }
}
