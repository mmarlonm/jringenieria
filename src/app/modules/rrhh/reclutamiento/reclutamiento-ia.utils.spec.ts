import { construirContextoChat, filtrarPorSugerenciaIa, UMBRAL_SUGERENCIA_IA } from './reclutamiento-ia.utils';
import { Candidato, RequisicionDetalle } from './reclutamiento.types';

function candidato(parcial: Partial<Candidato>): Candidato {
    return {
        candidatoId: 1,
        requisicionId: 10,
        requisicionFolio: 'REQ-1',
        requisicionPuesto: 'Ingeniero',
        nombre: 'Ana',
        fuente: 'Web',
        avisoPrivacidadAceptado: true,
        fechaPrimerContacto: '2026-11-01',
        estatus: 'Nuevo',
        calificacionIncompleta: false,
        creadoEn: '2026-11-01',
        entrevistas: [],
        evaluaciones: [],
        ...parcial
    };
}

function vacante(candidatos: Candidato[]): RequisicionDetalle {
    return {
        requisicionId: 10,
        folio: 'REQ-1',
        areaOSolicitante: 'Ingeniería',
        puesto: 'Ingeniero de software',
        tipo: 'NuevaCreacion',
        fechaSolicitud: '2026-10-01',
        estatus: 'Publicada',
        diasEnProceso: 20,
        numeroPlazas: 2,
        plazasCubiertas: 0,
        razonSocial: 'JR',
        validacionRrhh: true,
        aprobacionAdminGeneral: true,
        aprobacionDireccion: true,
        totalCandidatos: candidatos.length,
        perfilRequerido: 'C# y .NET',
        creadoEn: '2026-10-01',
        candidatos
    };
}

describe('filtrarPorSugerenciaIa', () => {
    const alto = candidato({ candidatoId: 1, puntajeIa: UMBRAL_SUGERENCIA_IA });
    const bajo = candidato({ candidatoId: 2, puntajeIa: 2.0 });
    const sin = candidato({ candidatoId: 3, puntajeIa: null });

    it('sugeridos incluye a quien alcanza el umbral y excluye bajos y sin análisis', () => {
        const res = filtrarPorSugerenciaIa([alto, bajo, sin], 'sugeridos');
        expect(res.map(c => c.candidatoId)).toEqual([1]);
    });

    it('sinAnalizar devuelve solo a quien no tiene puntaje de IA', () => {
        const res = filtrarPorSugerenciaIa([alto, bajo, sin], 'sinAnalizar');
        expect(res.map(c => c.candidatoId)).toEqual([3]);
    });

    it('todos devuelve la lista completa en el mismo orden', () => {
        const res = filtrarPorSugerenciaIa([alto, bajo, sin], 'todos');
        expect(res.map(c => c.candidatoId)).toEqual([1, 2, 3]);
    });
});

describe('construirContextoChat', () => {
    it('solo comparte candidatos con aviso de privacidad y consentimiento de IA, y cuenta los demás', () => {
        const ctx = construirContextoChat(vacante([
            candidato({ candidatoId: 1, nombre: 'Con consentimiento', consentimientoIa: true }),
            candidato({ candidatoId: 2, nombre: 'Sin consentimiento', consentimientoIa: false }),
            candidato({ candidatoId: 3, nombre: 'Sin aviso', avisoPrivacidadAceptado: false, consentimientoIa: true })
        ])) as any;

        expect(ctx.candidatos.length).toBe(1);
        expect(ctx.candidatos[0].nombre).toBe('Con consentimiento');
        expect(ctx.totalCandidatos).toBe(3);
        expect(ctx.candidatosNoCompartidosConIa).toBe(2);
        expect(JSON.stringify(ctx)).not.toContain('Sin consentimiento');
        expect(JSON.stringify(ctx)).not.toContain('Sin aviso');
    });

    it('nunca incluye correo, teléfono, CV, notas ni expectativa salarial', () => {
        const ctx = construirContextoChat(vacante([
            candidato({
                consentimientoIa: true,
                email: 'ana@correo.com',
                telefono: '5512345678',
                cvTexto: 'texto del cv',
                notas: 'nota privada',
                expectativaSalarial: 30000
            })
        ]));
        const texto = JSON.stringify(ctx);

        expect(texto).not.toContain('ana@correo.com');
        expect(texto).not.toContain('5512345678');
        expect(texto).not.toContain('texto del cv');
        expect(texto).not.toContain('nota privada');
        expect(texto).not.toContain('30000');
    });

    it('incluye calificación, puntaje de IA, fortalezas y brechas de quien consintió', () => {
        const ctx = construirContextoChat(vacante([
            candidato({
                consentimientoIa: true,
                calificacionGeneral: 4.2,
                puntajeIa: 4.8,
                preseleccionIa: {
                    preseleccionIaId: 1,
                    candidatoId: 1,
                    puntaje: 4.8,
                    fortalezas: ['C#'],
                    brechas: ['Inglés'],
                    justificacion: 'Buen perfil',
                    modelo: 'm',
                    fechaAnalisis: '2026-11-05'
                }
            })
        ])) as any;

        const c = ctx.candidatos[0];
        expect(c.calificacionGeneral).toBe(4.2);
        expect(c.puntajeIa).toBe(4.8);
        expect(c.fortalezasIa).toEqual(['C#']);
        expect(c.brechasIa).toEqual(['Inglés']);
        expect(ctx.vacante.puesto).toBe('Ingeniero de software');
    });
});
