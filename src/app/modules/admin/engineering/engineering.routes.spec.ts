import engineeringRoutes from './engineering.routes';

describe('engineering.routes', () => {
    it('debe contener las 5 rutas de etapas de cotización con data.etapa correspondiente', () => {
        const etapasEsperadas = [
            { path: 'solicitud-cliente', etapa: 1 },
            { path: 'levantamiento-tecnico', etapa: 2 },
            { path: 'diseno-calculo', etapa: 3 },
            { path: 'presupuesto-tecnico', etapa: 4 },
            { path: 'propuesta-tecnico-comercial', etapa: 5 }
        ];

        etapasEsperadas.forEach(({ path, etapa }) => {
            const route = engineeringRoutes.find((r) => r.path === path);
            expect(route).toBeDefined(`Ruta ${path} no encontrada`);
            expect((route?.data as any)?.etapa).toBe(etapa, `Data etapa para ${path} no coincide`);
        });
    });

    it('tablero-proyectos debe redirigir a solicitud-cliente', () => {
        const route = engineeringRoutes.find((r) => r.path === 'tablero-proyectos');
        expect(route).toBeDefined();
        expect(route?.redirectTo).toBe('solicitud-cliente');
    });
});
