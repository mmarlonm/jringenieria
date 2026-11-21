import { puedeAutorizar } from './etapa-permisos.utils';
import { CotizacionEtapaDto } from './cotizacion-etapas.models';

describe('etapa-permisos.utils', () => {
    const baseEtapa: CotizacionEtapaDto = {
        etapa: 1,
        estatus: 2,
        esAliado: false,
        autorizaUsuarioId: 42,
        revisiones: []
    };

    it('un administrador siempre puede autorizar', () => {
        expect(puedeAutorizar(baseEtapa, 999, true)).toBeTrue();
        expect(puedeAutorizar(null, 999, true)).toBeTrue();
    });

    it('si no es admin y etapa es nula, retorna false', () => {
        expect(puedeAutorizar(null, 42, false)).toBeFalse();
    });

    it('Sin_autorizador_designado_solo_un_administrador_puede_autorizar', () => {
        const sinDesignado: CotizacionEtapaDto = {
            ...baseEtapa,
            autorizaUsuarioId: null
        };
        expect(puedeAutorizar(sinDesignado, 10, false)).toBeFalse();
        expect(puedeAutorizar(sinDesignado, 99, false)).toBeFalse();
        expect(puedeAutorizar(sinDesignado, 10, true)).toBeTrue();
    });

    it('Con_autorizador_designado_solo_ese_usuario_o_un_administrador', () => {
        expect(puedeAutorizar(baseEtapa, 42, false)).toBeTrue();
        expect(puedeAutorizar(baseEtapa, 43, false)).toBeFalse();
        expect(puedeAutorizar(baseEtapa, 1, false)).toBeFalse();
        expect(puedeAutorizar(baseEtapa, 43, true)).toBeTrue();
    });
});
