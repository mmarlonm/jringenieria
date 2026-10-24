import { ETAPAS, obtenerEtapaConfig } from './etapas.config';

describe('etapas.config', () => {
    it('debe contener exactamente 5 etapas configuradas', () => {
        expect(ETAPAS.length).toBe(5);
        expect(ETAPAS.map((e) => e.numero)).toEqual([1, 2, 3, 4, 5]);
    });

    it('debe tener las 5 rutas y titulos exactos de la especificacion', () => {
        const esperado = [
            { numero: 1, ruta: 'solicitud-cliente', titulo: 'Solicitud del cliente' },
            { numero: 2, ruta: 'levantamiento-tecnico', titulo: 'Levantamiento técnico' },
            { numero: 3, ruta: 'diseno-calculo', titulo: 'Diseño/Cálculo e Ingeniería' },
            { numero: 4, ruta: 'presupuesto-tecnico', titulo: 'Presupuesto técnico' },
            { numero: 5, ruta: 'propuesta-tecnico-comercial', titulo: 'Propuesta técnico-comercial' }
        ];

        esperado.forEach((esp) => {
            const config = obtenerEtapaConfig(esp.numero);
            expect(config).toBeDefined();
            expect(config?.ruta).toBe(esp.ruta);
            expect(config?.titulo).toBe(esp.titulo);
        });
    });

    it('debe configurar correctamente las etapas siguientes permitidas', () => {
        expect(obtenerEtapaConfig(1)?.siguientes).toEqual([2, 3, 4, 5]);
        expect(obtenerEtapaConfig(2)?.siguientes).toEqual([3, 4, 5]);
        expect(obtenerEtapaConfig(3)?.siguientes).toEqual([4, 5]);
        expect(obtenerEtapaConfig(4)?.siguientes).toEqual([5]);
        expect(obtenerEtapaConfig(5)?.siguientes).toEqual([]);
    });

    it('debe configurar flags de campos condicionales y creacion', () => {
        // permiteCrear solo en 1
        expect(obtenerEtapaConfig(1)?.permiteCrear).toBeTrue();
        expect(obtenerEtapaConfig(2)?.permiteCrear).toBeFalse();
        expect(obtenerEtapaConfig(3)?.permiteCrear).toBeFalse();
        expect(obtenerEtapaConfig(4)?.permiteCrear).toBeFalse();
        expect(obtenerEtapaConfig(5)?.permiteCrear).toBeFalse();

        // usaInformacion en 1 y 2
        expect(obtenerEtapaConfig(1)?.usaInformacion).toBeTrue();
        expect(obtenerEtapaConfig(2)?.usaInformacion).toBeTrue();
        expect(obtenerEtapaConfig(3)?.usaInformacion).toBeFalse();
        expect(obtenerEtapaConfig(4)?.usaInformacion).toBeFalse();
        expect(obtenerEtapaConfig(5)?.usaInformacion).toBeFalse();

        // usaFechaProgramada solo en 2
        expect(obtenerEtapaConfig(1)?.usaFechaProgramada).toBeFalse();
        expect(obtenerEtapaConfig(2)?.usaFechaProgramada).toBeTrue();
        expect(obtenerEtapaConfig(3)?.usaFechaProgramada).toBeFalse();

        // usaMonto solo en 5
        expect(obtenerEtapaConfig(4)?.usaMonto).toBeFalse();
        expect(obtenerEtapaConfig(5)?.usaMonto).toBeTrue();
    });
});
