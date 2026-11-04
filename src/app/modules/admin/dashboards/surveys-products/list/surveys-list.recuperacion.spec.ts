import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, of, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { FormularioProductoDto, SurveysProductsService } from '../surveys.service';
import { SurveysListComponent } from './surveys-list.component';

/**
 * Cuando el servidor fallaba, guardar, activar o eliminar una encuesta "funcionaba" en silencio solo en el navegador.
 * Ahora la pantalla avisa de lo que recupera y muestra el error cuando el servidor no pudo hacer lo pedido.
 */
describe('SurveysListComponent: recuperación y errores visibles', () => {
    let servicio: jasmine.SpyObj<SurveysProductsService> & {
        recuperados$: Subject<{ titulos: string[]; pendientes: number }>;
        servidorNoDisponible$: Subject<void>;
    };
    let avisos: jasmine.Spy;
    let componente: SurveysListComponent;

    const encuesta = (id: number, activo = true): FormularioProductoDto => ({
        id, slug: `encuesta-${id}`, titulo: `Encuesta ${id}`, camposConfigJson: '[]', disenoConfigJson: '{}',
        tipo: 'producto', activo, fechaCreacion: '2026-11-03T10:00:00.000Z', totalRespuestas: 0
    });

    const servidorCaido = () => throwError(() => ({ status: 502, error: {} }));

    beforeEach(() => {
        servicio = Object.assign(
            jasmine.createSpyObj<SurveysProductsService>('SurveysProductsService', [
                'getFormularios', 'getSurveys', 'guardarFormulario', 'eliminarFormulario'
            ]),
            {
                recuperados$: new Subject<{ titulos: string[]; pendientes: number }>(),
                servidorNoDisponible$: new Subject<void>()
            }
        );
        servicio.getFormularios.and.returnValue(of([]));
        servicio.getSurveys.and.returnValue(of({ code: 200, message: '', data: [] }));
        avisos = spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: false } as any));

        TestBed.configureTestingModule({
            imports: [SurveysListComponent, NoopAnimationsModule],
            providers: [
                { provide: SurveysProductsService, useValue: servicio },
                { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) }
            ]
        });
        // Se prueban los manejadores de la clase, no la plantilla de 1,800 líneas.
        TestBed.overrideComponent(SurveysListComponent, { set: { template: '' } });
        componente = TestBed.createComponent(SurveysListComponent).componentInstance;
    });

    describe('encuestas recuperadas del navegador', () => {
        it('al abrir la pantalla avisa cuáles se recuperaron, aunque el aviso salga durante la propia carga de la lista', () => {
            servicio.getFormularios.and.callFake(() => {
                servicio.recuperados$.next({ titulos: ['Taller A', 'Taller B'], pendientes: 0 });
                return of([encuesta(1)]);
            });

            componente.ngOnInit();

            expect(avisos).toHaveBeenCalledTimes(1);
            const opciones = avisos.calls.mostRecent().args[0];
            expect(opciones.icon).toBe('success');
            expect(opciones.html).toContain('Taller A');
            expect(opciones.html).toContain('Taller B');
        });

        it('si no se recuperó nada, no muestra ningún aviso', () => {
            componente.ngOnInit();

            expect(avisos).not.toHaveBeenCalled();
        });

        it('si algo no se pudo subir, lo dice y conserva el tono de advertencia', () => {
            componente.ngOnInit();

            servicio.recuperados$.next({ titulos: ['Taller A'], pendientes: 2 });

            const opciones = avisos.calls.mostRecent().args[0];
            expect(opciones.icon).toBe('warning');
            expect(opciones.html).toContain('2 más no se pudieron subir');
        });

        it('si solo quedaron pendientes (ninguna se pudo subir), el aviso lo dice claro sin hablar de "más"', () => {
            componente.ngOnInit();

            servicio.recuperados$.next({ titulos: [], pendientes: 2 });

            const opciones = avisos.calls.mostRecent().args[0];
            expect(opciones.icon).toBe('warning');
            expect(opciones.html).toContain('2 encuesta(s) guardada(s) solo en este navegador no se pudieron subir');
            expect(opciones.html).not.toContain('más');
        });

        it('el título de una encuesta nunca se interpreta como código HTML', () => {
            componente.ngOnInit();

            servicio.recuperados$.next({ titulos: ['<img src=x onerror=alert(1)>'], pendientes: 0 });

            const html: string = avisos.calls.mostRecent().args[0].html;
            expect(html).not.toContain('<img');
            expect(html).toContain('&lt;img');
        });
    });

    describe('servidor sin respuesta al cargar la lista', () => {
        it('avisa que se muestra la copia guardada en este navegador y que no se guardará nada hasta que responda', () => {
            // El componente importa MatSnackBarModule y trae su propia instancia: se espía esa, no la de la raíz.
            const abrirAviso = spyOn(componente['_snackBar'] as MatSnackBar, 'open');
            componente.ngOnInit();

            servicio.servidorNoDisponible$.next();

            expect(abrirAviso).toHaveBeenCalledTimes(1);
            const mensaje = abrirAviso.calls.mostRecent().args[0];
            expect(mensaje).toContain('copia guardada en este navegador');
            expect(mensaje).toContain('no se guardará');
        });
    });

    describe('errores del servidor', () => {
        it('si el servidor no pudo activar o desactivar una encuesta, la deja como estaba y avisa', () => {
            const form = encuesta(1, true);
            servicio.guardarFormulario.and.returnValue(servidorCaido());

            componente.toggleActivoFormulario(form);

            expect(form.activo).withContext('debe volver a su valor original').toBeTrue();
            expect(avisos.calls.mostRecent().args[2]).toBe('error');
        });

        it('si el servidor no pudo duplicar una encuesta, avisa', () => {
            servicio.guardarFormulario.and.returnValue(servidorCaido());

            componente.duplicarFormulario(encuesta(1));

            expect(avisos.calls.mostRecent().args[2]).toBe('error');
        });

        it('si el servidor no pudo eliminar una encuesta, avisa en lugar de decir que se eliminó', async () => {
            avisos.and.returnValues(Promise.resolve({ isConfirmed: true } as any), Promise.resolve({} as any));
            servicio.eliminarFormulario.and.returnValue(servidorCaido());

            componente.eliminarFormulario(encuesta(1));
            await Promise.resolve();
            await Promise.resolve();

            const ultimo = avisos.calls.mostRecent().args;
            expect(ultimo[2]).toBe('error');
            expect(String(ultimo[1])).not.toContain('eliminada correctamente');
        });
    });
});
