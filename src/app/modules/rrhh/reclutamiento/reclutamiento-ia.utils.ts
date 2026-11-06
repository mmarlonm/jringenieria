import { Candidato, RequisicionDetalle } from './reclutamiento.types';

/** Puntaje de IA (1 a 5) desde el cual un candidato se muestra como "sugerido". Es una sugerencia, no una decisión. */
export const UMBRAL_SUGERENCIA_IA = 4.0;

export type FiltroSugerenciaIa = 'todos' | 'sugeridos' | 'sinAnalizar';

/** Filtra la vista de candidatos por la sugerencia de IA sin cambiar su orden ni su estatus. */
export function filtrarPorSugerenciaIa(
    candidatos: Candidato[],
    filtro: FiltroSugerenciaIa,
    umbral: number = UMBRAL_SUGERENCIA_IA
): Candidato[] {
    switch (filtro) {
        case 'sugeridos':
            return candidatos.filter((c) => c.puntajeIa !== null && c.puntajeIa !== undefined && c.puntajeIa >= umbral);
        case 'sinAnalizar':
            return candidatos.filter((c) => c.puntajeIa === null || c.puntajeIa === undefined);
        default:
            return candidatos;
    }
}

/**
 * Datos de la vacante que se le entregan al chat de IA (Rayito).
 * Solo se comparten candidatos con aviso de privacidad y consentimiento de IA; de ellos nunca salen
 * correo, teléfono, CV, notas ni expectativa salarial. De los demás solo se informa cuántos hay.
 */
export function construirContextoChat(r: RequisicionDetalle): Record<string, unknown> {
    const compartibles = r.candidatos.filter((c) => c.avisoPrivacidadAceptado && c.consentimientoIa === true);

    return {
        vacante: {
            folio: r.folio,
            puesto: r.puesto,
            estatus: r.estatus,
            numeroPlazas: r.numeroPlazas,
            plazasCubiertas: r.plazasCubiertas,
            diasEnProceso: r.diasEnProceso,
            perfilRequerido: r.perfilRequerido ?? null
        },
        totalCandidatos: r.candidatos.length,
        candidatosNoCompartidosConIa: r.candidatos.length - compartibles.length,
        candidatos: compartibles.map((c) => ({
            id: c.candidatoId,
            nombre: c.nombre,
            estatus: c.estatus,
            calificacionGeneral: c.calificacionGeneral ?? null,
            calificacionIncompleta: c.calificacionIncompleta,
            promedioEntrevistas: c.promedioEntrevistas ?? null,
            promedioPsicometrica: c.promedioPsicometrica ?? null,
            promedioPractica: c.promedioPractica ?? null,
            puntajeIa: c.puntajeIa ?? null,
            fortalezasIa: c.preseleccionIa?.fortalezas ?? [],
            brechasIa: c.preseleccionIa?.brechas ?? []
        }))
    };
}
