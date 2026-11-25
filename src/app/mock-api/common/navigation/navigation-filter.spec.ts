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

        it('los nombres de Ingeniería solo coinciden de forma exacta, en los dos sentidos', () => {
            // Choque de tickets: administracion.tickets no debe encender ingenieria.tickets
            expect(coincideVista('administracion.tickets', 'ingenieria.tickets')).toBeFalse();
            expect(coincideVista('ingenieria.tickets', 'administracion.tickets')).toBeFalse();
            // Solicitud del cliente solo enciende con su vista exacta
            expect(coincideVista('solicitud-cliente', 'ingenieria.solicitud-cliente')).toBeFalse();
            expect(coincideVista('otro.solicitud-cliente', 'ingenieria.solicitud-cliente')).toBeFalse();
            expect(coincideVista('administracion.solicitudes-compra', 'ingenieria.solicitud-cliente')).toBeFalse();
            expect(coincideVista('ingenieria.solicitud-cliente', 'ingenieria.solicitud-cliente')).toBeTrue();
        });

        it('los demás módulos principales (administración, comercialización, marketing, rrhh, eventos) solo coinciden exacto', () => {
            expect(coincideVista('comercializacion.control-entregas', 'administracion.control-entregas')).toBeFalse();
            expect(coincideVista('administracion.reportes', 'ingenieria.reportes')).toBeFalse();
            expect(coincideVista('comercializacion.inventario', 'ingenieria.inventario')).toBeFalse();
            expect(coincideVista('eventos.gestion', 'ingenieria.gestion')).toBeFalse();
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

        it('Quien_tiene_finanzas_creditos_ve_ese_hijo_y_no_los_demas', () => {
            const menu = filtrarMenuPorVistas(defaultNavigation, ['finanzas.creditos']);

            expect(hijosDeFinanzas(menu)).toEqual(['finanzas.creditos']);
            expect(ids(menu)).not.toContain('eventos.dashboard');
        });

        it('Cobranza_solo_aparece_con_la_vista_finanzas_cobranza', () => {
            const menu = filtrarMenuPorVistas(defaultNavigation, ['finanzas.cobranza']);

            expect(hijosDeFinanzas(menu)).toEqual(['finanzas.cobranza']);
            expect(ids(menu)).not.toContain('eventos.dashboard');
        });

        it('Quien_tiene_la_vista_de_productos_ve_solo_ese_reporte', () => {
            const menu = filtrarMenuPorVistas(defaultNavigation, ['marketing.reporte-encuestas-productos']);
            const idsMenu = ids(menu);
            expect(idsMenu).toContain('marketing.reporte-encuestas-productos');
            expect(idsMenu).not.toContain('marketing.reporte-encuestas-servicios');
        });

        it('Quien_tiene_la_vista_de_servicios_ve_solo_ese_reporte', () => {
            const menu = filtrarMenuPorVistas(defaultNavigation, ['marketing.reporte-encuestas-servicios']);
            const idsMenu = ids(menu);
            expect(idsMenu).toContain('marketing.reporte-encuestas-servicios');
            expect(idsMenu).not.toContain('marketing.reporte-encuestas-productos');
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

        it('sin vistas solo quedan las tres entradas que siempre se muestran (SIEMPRE_VISIBLES)', () => {
            const menu = filtrarMenuPorVistas(defaultNavigation, []);

            // «Nube de Minutas» se agregó a SIEMPRE_VISIBLES a propósito (commit bd03e5c5): la ven todos los usuarios
            expect(hojas(menu)).toEqual(['dashboards.identidad', 'dashboards.neural-graph', 'administracion.minutas']);
        });

        it('quien solo tiene tickets de Administración no ve el módulo Ingeniería ni ingenieria.tickets', () => {
            const menu = filtrarMenuPorVistas(defaultNavigation, ['administracion.tickets']);
            const idsMenu = ids(menu);

            expect(idsMenu).toContain('administracion.tickets');
            expect(idsMenu).not.toContain('ingenieria.tickets');
            expect(menu.find((i) => i.id === 'ingenieria')).toBeUndefined();
        });

        it('quien no tiene ingenieria.solicitud-cliente no ve la entrada de Solicitud del cliente en el menú', () => {
            const menu = filtrarMenuPorVistas(defaultNavigation, ['administracion.solicitudes-compra', 'rrhh.mis-solicitudes']);
            const idsMenu = ids(menu);

            expect(idsMenu).not.toContain('ingenieria.solicitud-cliente');
            expect(menu.find((i) => i.id === 'ingenieria')).toBeUndefined();
        });

        it('quien solo tiene vistas de administración no ve módulos a los que su rol no tiene permisos', () => {
            const menu = filtrarMenuPorVistas(defaultNavigation, [
                'administracion.tablero-compras',
                'administracion.solicitudes-compra',
                'administracion.recepcion-compras',
                'administracion.tickets'
            ]);
            const topLevelIds = menu.map((i) => i.id);

            expect(topLevelIds).toContain('administracion');
            expect(topLevelIds).not.toContain('ingenieria');
            expect(topLevelIds).not.toContain('finanzas');
            expect(topLevelIds).not.toContain('eventos');
            expect(topLevelIds).not.toContain('rrhh');
            expect(topLevelIds).not.toContain('comercializacion');
        });

        it('quien tiene ingenieria.solicitud-cliente ve solo esa etapa y no las demás etapas de ingeniería', () => {
            const menu = filtrarMenuPorVistas(defaultNavigation, ['ingenieria.solicitud-cliente']);
            const hijosIng = menu.find((i) => i.id === 'ingenieria')?.children?.map((h) => h.id as string);

            expect(hijosIng).toContain('ingenieria.solicitud-cliente');
            expect(hijosIng).not.toContain('ingenieria.levantamiento-tecnico');
            expect(hijosIng).not.toContain('ingenieria.diseno-calculo');
            expect(hijosIng).not.toContain('ingenieria.presupuesto-tecnico');
            expect(hijosIng).not.toContain('ingenieria.propuesta-tecnico-comercial');
            expect(hijosIng).not.toContain('ingenieria.tickets');
        });

        it('devuelve copias: no modifica el menú original', () => {
            const antes = JSON.stringify(defaultNavigation);

            filtrarMenuPorVistas(defaultNavigation, ['finanzas.dashboard']);

            expect(JSON.stringify(defaultNavigation)).toBe(antes);
        });
    });
});
