import {
    defaultNavigation,
    compactNavigation,
    futuristicNavigation,
    horizontalNavigation
} from './data';
import { FuseNavigationItem } from '@fuse/components/navigation';
import { filtrarMenuPorVistas } from './navigation-filter';

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

            it('El_menu_muestra_Cotizacion_tecnico_comercial_con_el_mismo_id_y_enlace', () => {
                function buscarItem(items: FuseNavigationItem[], id: string): FuseNavigationItem | undefined {
                    for (const item of items) {
                        if (item.id === id) return item;
                        if (item.children) {
                            const enc = buscarItem(item.children, id);
                            if (enc) return enc;
                        }
                    }
                    return undefined;
                }

                const item = buscarItem(nav, 'ingenieria.propuesta-tecnico-comercial');
                expect(item).toBeDefined(`Debe existir ingenieria.propuesta-tecnico-comercial en ${nombre}`);
                expect(item?.title).toBe('Cotización técnico-comercial');
                expect(item?.link).toBe('/engineering/propuesta-tecnico-comercial');
            });

            it('debe tener el grupo finanzas con Dashboard, Bancos, CFDI, Créditos, Cobranza, Conciliación y Despacho, en el orden del proceso, inmediatamente después de rrhh', () => {
                const indiceRrhh = nav.findIndex((i) => i.id === 'rrhh');
                expect(indiceRrhh).toBeGreaterThanOrEqual(0, `No existe el grupo rrhh en ${nombre}`);

                const finanzas = nav[indiceRrhh + 1];
                expect(finanzas?.id).toBe('finanzas', `finanzas debe seguir a rrhh en ${nombre}`);
                expect(nav.filter((i) => i.id === 'finanzas').length).toBe(1);

                const hijos = finanzas.children ?? [];
                expect(hijos.map((h) => h.id)).toEqual(['finanzas.dashboard', 'finanzas.bancos', 'finanzas.cfdi', 'finanzas.creditos', 'finanzas.cobranza', 'finanzas.conciliacion', 'finanzas.despacho']);
                hijos.forEach((h) => expect(h.link).toMatch(/^\/finanzas\//));
            });

            it('debe tener los reportes de encuestas de productos y servicios dentro de marketing.encuestas', () => {
                function buscarItem(items: FuseNavigationItem[], id: string): FuseNavigationItem | undefined {
                    for (const item of items) {
                        if (item.id === id) return item;
                        if (item.children) {
                            const enc = buscarItem(item.children, id);
                            if (enc) return enc;
                        }
                    }
                    return undefined;
                }

                const prod = buscarItem(nav, 'marketing.reporte-encuestas-productos');
                const serv = buscarItem(nav, 'marketing.reporte-encuestas-servicios');

                expect(prod).toBeDefined(`Debe existir reporte productos en ${nombre}`);
                expect(serv).toBeDefined(`Debe existir reporte servicios en ${nombre}`);
                expect(prod?.link).toBe('/dashboards/reporte-encuestas/productos');
                expect(serv?.link).toBe('/dashboards/reporte-encuestas/servicios');
            });
        });
    });

    it('Cotizaciones_va_justo_debajo_de_Requerimientos_en_Comercializacion', () => {
        const comercializacion = defaultNavigation.find((i) => i.id === 'comercializacion');
        expect(comercializacion).toBeDefined('Debe existir comercializacion en defaultNavigation');
        const hijos = comercializacion?.children ?? [];

        const idxReq = hijos.findIndex((h) => h.id === 'comercializacion.requerimientos');
        const idxCot = hijos.findIndex((h) => h.id === 'dashboards.quote-products');

        expect(idxReq).toBeGreaterThanOrEqual(0, 'Debe existir comercializacion.requerimientos');
        expect(idxCot).toBe(idxReq + 1, 'Cotizaciones debe estar justo debajo de Requerimientos');

        const itemCot = hijos[idxCot];
        expect(itemCot.id).toBe('dashboards.quote-products');
        expect(itemCot.title).toBe('Cotizaciones');
        expect(itemCot.link).toBe('/dashboards/quote-products');

        // Ya no está en comercializacion.gestion
        const gestion = hijos.find((h) => h.id === 'comercializacion.gestion');
        expect(gestion).toBeDefined();
        const enGestion = gestion?.children?.find((h) => h.id === 'dashboards.quote-products');
        expect(enGestion).toBeUndefined('No debe estar en comercializacion.gestion');
    });

    it('Quien_tiene_la_vista_de_cotizaciones_la_sigue_viendo', () => {
        const menu = filtrarMenuPorVistas(defaultNavigation, ['dashboards.quote-products']);
        const ids = (items: FuseNavigationItem[] | undefined): string[] =>
            (items ?? []).flatMap((i) => [i.id as string, ...ids(i.children)]);

        expect(ids(menu)).toContain('dashboards.quote-products');
    });
});
