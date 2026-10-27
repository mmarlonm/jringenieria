import {
    defaultNavigation,
    compactNavigation,
    futuristicNavigation,
    horizontalNavigation
} from './data';
import { FuseNavigationItem } from '@fuse/components/navigation';

describe('Navigation Data (mock-api)', () => {
    const variantes: { nombre: string; nav: FuseNavigationItem[] }[] = [
        { nombre: 'defaultNavigation', nav: defaultNavigation },
        { nombre: 'compactNavigation', nav: compactNavigation },
        { nombre: 'futuristicNavigation', nav: futuristicNavigation },
        { nombre: 'horizontalNavigation', nav: horizontalNavigation }
    ];

    const idsCincoEtapas = [
        'ingenieria.solicitud-cliente',
        'ingenieria.levantamiento-tecnico',
        'ingenieria.diseno-calculo',
        'ingenieria.presupuesto-tecnico',
        'ingenieria.propuesta-tecnico-comercial'
    ];

    variantes.forEach(({ nombre, nav }) => {
        describe(`Variante ${nombre}`, () => {
            function buscarHijosIngenieria(items: FuseNavigationItem[]): FuseNavigationItem[] {
                for (const item of items) {
                    if (item.id === 'ingenieria' && item.children) {
                        return item.children;
                    }
                    if (item.children) {
                        const encontrado = buscarHijosIngenieria(item.children);
                        if (encontrado.length > 0) return encontrado;
                    }
                }
                return [];
            }

            it('no debe contener ingenieria.tablero-proyectos', () => {
                const hijos = buscarHijosIngenieria(nav);
                const tablero = hijos.find((h) => h.id === 'ingenieria.tablero-proyectos');
                expect(tablero).toBeUndefined(`No debe existir tablero-proyectos en ${nombre}`);
            });

            it('debe contener las 5 etapas en orden inmediatamente antes de ingenieria.control-ejecucion', () => {
                const hijos = buscarHijosIngenieria(nav);
                expect(hijos.length).toBeGreaterThan(0, `No se encontraron hijos de ingenieria en ${nombre}`);

                const indiceControlEjecucion = hijos.findIndex((h) => h.id === 'ingenieria.control-ejecucion');
                expect(indiceControlEjecucion).toBeGreaterThanOrEqual(5, `control-ejecucion debe estar tras las 5 etapas en ${nombre}`);

                const cincoAntes = hijos.slice(indiceControlEjecucion - 5, indiceControlEjecucion).map((h) => h.id);
                expect(cincoAntes).toEqual(idsCincoEtapas, `Las 5 etapas deben preceder a control-ejecucion en ${nombre}`);
            });

            it('debe tener el grupo finanzas con Dashboard, Bancos, CFDI, Conciliación y Despacho, en el orden del proceso, inmediatamente después de rrhh', () => {
                const indiceRrhh = nav.findIndex((i) => i.id === 'rrhh');
                expect(indiceRrhh).toBeGreaterThanOrEqual(0, `No existe el grupo rrhh en ${nombre}`);

                const finanzas = nav[indiceRrhh + 1];
                expect(finanzas?.id).toBe('finanzas', `finanzas debe seguir a rrhh en ${nombre}`);
                expect(nav.filter((i) => i.id === 'finanzas').length).toBe(1);

                const hijos = finanzas.children ?? [];
                expect(hijos.map((h) => h.id)).toEqual(['finanzas.dashboard', 'finanzas.bancos', 'finanzas.cfdi', 'finanzas.conciliacion', 'finanzas.despacho']);
                hijos.forEach((h) => expect(h.link).toMatch(/^\/finanzas\//));
            });
        });
    });
});
