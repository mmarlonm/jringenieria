import { FuseNavigationItem } from '@fuse/components/navigation';
import { defaultNavigation } from './data';
import { coincideVista, filtrarMenuPorVistas } from './navigation-filter';

describe('filtro del menú por vistas', () => {
    describe('coincideVista', () => {
        it('un nombre de vista igual al id del menú coincide', () => {
            expect(coincideVista('finanzas.bancos', 'finanzas.bancos')).toBeTrue();
            expect(coincideVista('rrhh.colaboradores', 'rrhh.colaboradores')).toBeTrue();
        });

        it('los nombres de Finanzas solo coinciden de forma exacta, en los dos sentidos', () => {
            // El choque real: eventos.dashboard y finanzas.dashboard terminan igual.
            expect(coincideVista('eventos.dashboard', 'finanzas.dashboard')).toBeFalse();
            expect(coincideVista('finanzas.dashboard', 'eventos.dashboard')).toBeFalse();
            // Un nombre antiguo sin módulo, o de otro módulo, tampoco enciende una entrada de Finanzas.
            expect(coincideVista('dashboard', 'finanzas.dashboard')).toBeFalse();
            expect(coincideVista('bancos', 'finanzas.bancos')).toBeFalse();
            expect(coincideVista('otro.cfdi', 'finanzas.cfdi')).toBeFalse();
        });

        it('el resto conserva la regla antigua por último segmento', () => {
            expect(coincideVista('clients', 'catalogs.clients')).toBeTrue();
            expect(coincideVista('viejo.usuarios', 'apps.usuarios')).toBeTrue();
            expect(coincideVista('catalogs.products', 'catalogs.clients')).toBeFalse();
        });
    });

    describe('filtrarMenuPorVistas con el menú real', () => {
        const ids = (items: FuseNavigationItem[] | undefined): string[] =>
            (items ?? []).flatMap((i) => [i.id as string, ...ids(i.children)]);
        const hojas = (items: FuseNavigationItem[] | undefined): string[] =>
            (items ?? []).flatMap((i) => (i.children?.length ? hojas(i.children) : [i.id as string]));
        const hijosDeFinanzas = (menu: FuseNavigationItem[]): string[] | undefined =>
            menu.find((i) => i.id === 'finanzas')?.children?.map((h) => h.id as string);

        it('quien solo tiene el Dashboard de Eventos no ve el grupo Finanzas', () => {
            const menu = filtrarMenuPorVistas(defaultNavigation, ['eventos.dashboard']);

            expect(hijosDeFinanzas(menu)).toBeUndefined();
            expect(ids(menu)).toContain('eventos.dashboard');
            expect(ids(menu)).not.toContain('finanzas.dashboard');
        });

        it('quien solo tiene el Dashboard de Finanzas ve solo ese hijo y no el Dashboard de Eventos', () => {
            const menu = filtrarMenuPorVistas(defaultNavigation, ['finanzas.dashboard']);

            expect(hijosDeFinanzas(menu)).toEqual(['finanzas.dashboard']);
            expect(ids(menu)).not.toContain('eventos.dashboard');
        });

        it('el grupo Finanzas lista sus hijos en el orden del proceso', () => {
            const todas = ['finanzas.despacho', 'finanzas.cfdi', 'finanzas.dashboard', 'finanzas.conciliacion', 'finanzas.bancos'];

            const menu = filtrarMenuPorVistas(defaultNavigation, todas);

            expect(hijosDeFinanzas(menu)).toEqual([
                'finanzas.dashboard', 'finanzas.bancos', 'finanzas.cfdi', 'finanzas.conciliacion', 'finanzas.despacho'
            ]);
        });

        it('un nombre antiguo de una sola palabra no abre ninguna entrada de Finanzas', () => {
            const menu = filtrarMenuPorVistas(defaultNavigation, ['dashboard', 'bancos', 'cfdi', 'conciliacion', 'despacho']);

            expect(hijosDeFinanzas(menu)).toBeUndefined();
        });

        it('una vista de otro módulo con el nombre antiguo sigue encendiendo su entrada (compatibilidad)', () => {
            const menu = filtrarMenuPorVistas(defaultNavigation, ['clients']);

            expect(ids(menu)).toContain('catalogs.clients');
        });

        it('sin vistas solo quedan las dos entradas que siempre se muestran', () => {
            const menu = filtrarMenuPorVistas(defaultNavigation, []);

            expect(hojas(menu)).toEqual(['dashboards.identidad', 'dashboards.neural-graph']);
        });

        it('devuelve copias: no modifica el menú original', () => {
            const antes = JSON.stringify(defaultNavigation);

            filtrarMenuPorVistas(defaultNavigation, ['finanzas.dashboard']);

            expect(JSON.stringify(defaultNavigation)).toBe(antes);
        });
    });
});
