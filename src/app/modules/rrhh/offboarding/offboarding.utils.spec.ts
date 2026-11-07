import {
    accionesDisponibles,
    agruparPorResponsable,
    claseAlertaImss,
    etiquetaCausa,
    etiquetaEstatus,
    etiquetaRecontratable,
    etiquetaTarea,
    porcentajeAvance,
    textoAlertaImss
} from './offboarding.utils';
import { TareaOffboarding } from './offboarding.types';

function tarea(responsable: string, estatus: TareaOffboarding['estatus'], orden = 1): TareaOffboarding {
    return {
        tareaId: orden,
        orden,
        clave: 'X' + orden,
        plazo: 'Día 1',
        tarea: 'Tarea ' + orden,
        responsable,
        evidencia: 'Evidencia',
        estatus,
        vencida: false
    };
}

describe('accionesDisponibles', () => {
    it('un caso abierto de renuncia permite editar, registrar la baja y cancelar', () => {
        expect(accionesDisponibles({ estatus: 'Abierto', ruta: 1, autorizadaDireccion: false }, false))
            .toEqual(['editar', 'registrarBaja', 'cancelar']);
    });

    it('el despido injustificado ofrece autorizar solo a quien tiene el permiso y mientras no esté autorizado', () => {
        const caso = { estatus: 'Abierto' as const, ruta: 4, autorizadaDireccion: false };
        expect(accionesDisponibles(caso, true)).toEqual(['editar', 'autorizar', 'registrarBaja', 'cancelar']);
        expect(accionesDisponibles(caso, false)).toEqual(['editar', 'registrarBaja', 'cancelar']);
        expect(accionesDisponibles({ ...caso, autorizadaDireccion: true }, true)).toEqual(['editar', 'registrarBaja', 'cancelar']);
    });

    it('autorizar solo aplica a la ruta 4', () => {
        expect(accionesDisponibles({ estatus: 'Abierto', ruta: 3, autorizadaDireccion: false }, true)).not.toContain('autorizar');
    });

    it('con la baja registrada solo se puede cerrar', () => {
        expect(accionesDisponibles({ estatus: 'BajaRegistrada', ruta: 1, autorizadaDireccion: false }, true)).toEqual(['cerrar']);
    });

    it('un caso cerrado o cancelado no ofrece acciones', () => {
        expect(accionesDisponibles({ estatus: 'Cerrado', ruta: 1, autorizadaDireccion: false }, true)).toEqual([]);
        expect(accionesDisponibles({ estatus: 'Cancelado', ruta: 1, autorizadaDireccion: false }, true)).toEqual([]);
    });
});

describe('agruparPorResponsable', () => {
    it('agrupa las tareas por responsable respetando el orden en que aparecen', () => {
        const grupos = agruparPorResponsable([
            tarea('RRHH', 'Hecha', 1),
            tarea('TI', 'Pendiente', 2),
            tarea('RRHH', 'Pendiente', 3),
            tarea('TI', 'EnProceso', 4),
            tarea('Legal', 'NoAplica', 5)
        ]);

        expect(grupos.map((g) => g.responsable)).toEqual(['RRHH', 'TI', 'Legal']);
        expect(grupos[0].tareas.map((t) => t.orden)).toEqual([1, 3]);
        expect(grupos[1].tareas.map((t) => t.orden)).toEqual([2, 4]);
    });

    it('cuenta como pendientes las que no están hechas ni marcadas como no aplica', () => {
        const grupos = agruparPorResponsable([
            tarea('RRHH', 'Hecha', 1),
            tarea('RRHH', 'Pendiente', 2),
            tarea('RRHH', 'EnProceso', 3),
            tarea('RRHH', 'NoAplica', 4)
        ]);

        expect(grupos[0].pendientes).toBe(2);
    });

    it('sin tareas devuelve una lista vacía', () => {
        expect(agruparPorResponsable([])).toEqual([]);
    });
});

describe('porcentajeAvance', () => {
    it('redondea y no se pasa de 100', () => {
        expect(porcentajeAvance(14, 7)).toBe(50);
        expect(porcentajeAvance(3, 1)).toBe(33);
        expect(porcentajeAvance(4, 4)).toBe(100);
        expect(porcentajeAvance(0, 0)).toBe(0);
        expect(porcentajeAvance(2, 5)).toBe(100);
    });
});

describe('textos y clases', () => {
    it('etiquetas de estatus y de tarea', () => {
        expect(etiquetaEstatus('BajaRegistrada')).toBe('Baja registrada');
        expect(etiquetaTarea('EnProceso')).toBe('En proceso');
        expect(etiquetaTarea('NoAplica')).toBe('No aplica');
        expect(etiquetaTarea('Hecha')).toBe('Hecha');
    });

    it('etiqueta de causa y de recontratable', () => {
        expect(etiquetaCausa('DespidoInjustificadoConvenio')).toBe('Despido injustificado / convenio');
        expect(etiquetaCausa('PeriodoPruebaNoAprobado')).toBe('Periodo de prueba no aprobado');
        expect(etiquetaCausa('Otra')).toBe('Otra');
        expect(etiquetaRecontratable('CON_RESERVAS')).toBe('Con reservas');
        expect(etiquetaRecontratable('SI')).toBe('Sí');
    });

    it('alerta de baja IMSS', () => {
        expect(textoAlertaImss('Vencida')).toContain('vencido');
        expect(textoAlertaImss('PorVencer')).toContain('por vencer');
        expect(textoAlertaImss('Registrada')).toContain('registrada');
        expect(textoAlertaImss('Ninguna')).toBe('');
        expect(claseAlertaImss('Vencida')).toContain('red');
        expect(claseAlertaImss('PorVencer')).toContain('amber');
        expect(claseAlertaImss('EnTiempo')).toContain('green');
        expect(claseAlertaImss('Ninguna')).toBe('');
    });
});
