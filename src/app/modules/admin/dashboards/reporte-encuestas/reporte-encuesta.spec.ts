import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Subject, of, throwError } from 'rxjs';
import { FuseNavigationItem } from '@fuse/components/navigation';
import { ReporteEncuestaComponent } from './reporte-encuesta.component';
import { ReporteEncuestaService } from './reporte-encuesta.service';
import { FormularioReporteResumenDto, ReporteEncuestaDetalleDto } from './reporte-encuesta.types';
import { defaultNavigation } from 'app/mock-api/common/navigation/data';
import { filtrarMenuPorVistas } from 'app/mock-api/common/navigation/navigation-filter';

describe('ReporteEncuestaComponent (Tarea C2)', () => {
    let servicio: jasmine.SpyObj<ReporteEncuestaService>;

    const formularioMock1: FormularioReporteResumenDto = {
        id: 10,
        titulo: 'Encuesta Calidad Producto Transformador',
        activo: true,
        totalRespuestas: 42,
        ultimaRespuesta: '2026-11-05T03:00:00Z'
    };

    const formularioMock2: FormularioReporteResumenDto = {
        id: 20,
        titulo: 'Encuesta Mantenimiento Subestaciones',
        activo: true,
        totalRespuestas: 15,
        ultimaRespuesta: '2026-11-04T12:00:00Z'
    };

    const reporteDetalleMock: ReporteEncuestaDetalleDto = {
        formularioTipo: 'producto',
        calificacionPromedio: 8.7,
        reporte: {
            formularioId: 10,
            titulo: 'Encuesta Calidad Producto Transformador',
            eventoId: 0,
            nombreEvento: null,
            resumen: {
                totalRespuestas: 42,
                completitudPromedio: 100,
                tasaRespuesta: null,
                ultimaRespuesta: '2026-11-04T21:00:00', // el API la manda sin zona y ya en hora de México
                porDia: [
                    { fecha: '2026-11-04', total: 20 },
                    { fecha: '2026-11-05', total: 22 }
                ]
            },
            secciones: [
                {
                    titulo: 'Calidad y Servicio',
                    preguntas: [
                        {
                            campoId: 'p1',
                            etiqueta: '¿Cómo califica el producto?',
                            tipo: 'opcion',
                            base: 42,
                            opciones: [
                                { etiqueta: 'Excelente', total: 30, porcentaje: 71.4 },
                                { etiqueta: 'Bueno', total: 12, porcentaje: 28.6 }
                            ],
                            matriz: null,
                            numerico: null,
                            abiertas: null
                        }
                    ]
                }
            ]
        }
    };

    const reporteSinRespuestasMock: ReporteEncuestaDetalleDto = {
        formularioTipo: 'producto',
        calificacionPromedio: null,
        reporte: {
            formularioId: 10,
            titulo: 'Encuesta Calidad Producto Transformador',
            eventoId: 0,
            nombreEvento: null,
            resumen: {
                totalRespuestas: 0,
                completitudPromedio: 0,
                tasaRespuesta: null,
                ultimaRespuesta: null,
                porDia: []
            },
            secciones: []
        }
    };

    function crearModulo(tipo: 'producto' | 'servicio') {
        servicio = jasmine.createSpyObj<ReporteEncuestaService>('ReporteEncuestaService', [
            'obtenerFormularios',
            'obtenerReporte'
        ]);
        servicio.obtenerFormularios.and.returnValue(of([formularioMock1, formularioMock2]));
        servicio.obtenerReporte.and.returnValue(of(reporteDetalleMock));

        return TestBed.configureTestingModule({
            imports: [
                ReporteEncuestaComponent,
                NoopAnimationsModule
            ],
            providers: [
                { provide: ReporteEncuestaService, useValue: servicio },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            data: { tipo }
                        }
                    }
                }
            ]
        }).compileComponents();
    }

    it('La_ruta_de_productos_pide_formularios_de_productos_y_la_de_servicios_los_de_servicios', async () => {
        await crearModulo('producto');
        const fixtureProd = TestBed.createComponent(ReporteEncuestaComponent);
        fixtureProd.detectChanges();
        expect(servicio.obtenerFormularios).toHaveBeenCalledWith('producto');

        TestBed.resetTestingModule();
        await crearModulo('servicio');
        const fixtureServ = TestBed.createComponent(ReporteEncuestaComponent);
        fixtureServ.detectChanges();
        expect(servicio.obtenerFormularios).toHaveBeenCalledWith('servicio');
    });

    it('Elegir_otro_formulario_o_cambiar_el_rango_pide_el_reporte_de_nuevo', async () => {
        await crearModulo('producto');
        const fixture = TestBed.createComponent(ReporteEncuestaComponent);
        const comp = fixture.componentInstance;
        fixture.detectChanges();

        expect(servicio.obtenerReporte).toHaveBeenCalledWith('producto', 10, null, null);

        // Elegir otro formulario
        comp.formularioId = 20;
        comp.solicitarReporte();
        expect(servicio.obtenerReporte).toHaveBeenCalledWith('producto', 20, null, null);

        // Cambiar rango de fechas
        comp.desde = '2026-11-01';
        comp.hasta = '2026-11-05';
        comp.solicitarReporte();
        expect(servicio.obtenerReporte).toHaveBeenCalledWith('producto', 20, '2026-11-01', '2026-11-05');
    });

    it('Muestra_total_calificacion_promedio_y_ultima_respuesta', async () => {
        await crearModulo('producto');
        const fixture = TestBed.createComponent(ReporteEncuestaComponent);
        fixture.detectChanges();

        const texto = fixture.nativeElement.textContent || '';
        expect(texto).toContain('42');
        expect(texto).toContain('8.7 / 10');
        expect(texto).toContain('2026');
    });

    it('La_ultima_respuesta_ya_viene_en_hora_de_Mexico_y_se_muestra_sin_convertir_de_zona', async () => {
        await crearModulo('producto');
        const fixture = TestBed.createComponent(ReporteEncuestaComponent);
        fixture.detectChanges();

        // El API manda esta fecha sin zona y ya en hora de México (igual que el reporte de Eventos). Convertirla con
        // timeZone la movería en un navegador que no esté en México.
        fixture.componentInstance.reporteDetalle = {
            ...reporteDetalleMock,
            reporte: {
                ...reporteDetalleMock.reporte,
                resumen: { ...reporteDetalleMock.reporte.resumen, ultimaRespuesta: '2026-11-05T10:59:39' }
            }
        };
        const espia = spyOn(Date.prototype, 'toLocaleString').and.callThrough();

        const texto = fixture.componentInstance.ultimaRespuestaTexto;

        expect(texto).toContain('10:59');
        const opciones = espia.calls.mostRecent().args[1] as Intl.DateTimeFormatOptions;
        expect(opciones.timeZone).withContext('no debe convertir de zona una hora que ya es de México').toBeUndefined();
    });

    it('Sin_respuestas_muestra_el_aviso', async () => {
        await crearModulo('producto');
        servicio.obtenerReporte.and.returnValue(of(reporteSinRespuestasMock));
        const fixture = TestBed.createComponent(ReporteEncuestaComponent);
        fixture.detectChanges();

        const texto = fixture.nativeElement.textContent || '';
        expect(texto).toContain('Todavía no hay respuestas para este formulario');
    });

    it('Un_error_se_muestra_con_Reintentar', async () => {
        await crearModulo('producto');
        servicio.obtenerReporte.and.returnValue(throwError(() => ({ error: { mensaje: 'Error al calcular reporte' } })));
        const fixture = TestBed.createComponent(ReporteEncuestaComponent);
        fixture.detectChanges();

        const texto = fixture.nativeElement.textContent || '';
        expect(texto).toContain('Error al calcular reporte');
        expect(texto).toContain('Reintentar');

        const btnReintentar = fixture.nativeElement.querySelector('.btn-reintentar') as HTMLButtonElement;
        expect(btnReintentar).not.toBeNull();

        servicio.obtenerReporte.and.returnValue(of(reporteDetalleMock));
        btnReintentar.click();
        fixture.detectChanges();

        expect(servicio.obtenerReporte).toHaveBeenCalledTimes(2);
    });

    it('La_respuesta_tardia_de_un_formulario_anterior_no_pisa_a_la_actual', async () => {
        await crearModulo('producto');
        const flujo1$ = new Subject<ReporteEncuestaDetalleDto>();
        const flujo2$ = new Subject<ReporteEncuestaDetalleDto>();

        servicio.obtenerReporte.and.callFake((_tipo: string, id: number) => {
            if (id === 10) return flujo1$.asObservable();
            if (id === 20) return flujo2$.asObservable();
            return of(reporteDetalleMock);
        });

        const fixture = TestBed.createComponent(ReporteEncuestaComponent);
        const comp = fixture.componentInstance;
        fixture.detectChanges();

        // Primera petición (id 10) está en vuelo
        expect(servicio.obtenerReporte).toHaveBeenCalledWith('producto', 10, null, null);

        // Cambiamos a formulario 20 (segunda petición en vuelo)
        comp.formularioId = 20;
        comp.solicitarReporte();
        expect(servicio.obtenerReporte).toHaveBeenCalledWith('producto', 20, null, null);

        // Llega primero la respuesta de 20
        const reporte20: ReporteEncuestaDetalleDto = {
            ...reporteDetalleMock,
            formularioTipo: 'producto',
            calificacionPromedio: 9.5,
            reporte: {
                ...reporteDetalleMock.reporte,
                formularioId: 20,
                titulo: 'Encuesta 20'
            }
        };
        flujo2$.next(reporte20);
        fixture.detectChanges();

        expect(comp.reporteDetalle?.reporte.formularioId).toBe(20);
        expect(comp.reporteDetalle?.calificacionPromedio).toBe(9.5);

        // Ahora llega la respuesta tardía de 10: NO debe pisar la de 20
        flujo1$.next(reporteDetalleMock);
        fixture.detectChanges();

        expect(comp.reporteDetalle?.reporte.formularioId).toBe(20);
        expect(comp.reporteDetalle?.calificacionPromedio).toBe(9.5);
    });

    it('No_hay_boton_de_PDF_ni_descarga', async () => {
        await crearModulo('producto');
        const fixture = TestBed.createComponent(ReporteEncuestaComponent);
        fixture.detectChanges();

        const texto = fixture.nativeElement.textContent || '';
        expect(texto.toLowerCase()).not.toContain('exportar a pdf');
        expect(texto.toLowerCase()).not.toContain('descargar reporte');

        const exportBtn = fixture.nativeElement.querySelector('.highcharts-exporting-group, button.btn-pdf');
        expect(exportBtn).toBeNull();
    });

    describe('Navegación por vistas', () => {
        const ids = (items: FuseNavigationItem[] | undefined): string[] =>
            (items ?? []).flatMap((i) => [i.id as string, ...ids(i.children)]);

        it('Quien_tiene_la_vista_de_productos_ve_solo_ese_reporte', () => {
            const menu = filtrarMenuPorVistas(defaultNavigation, ['marketing.reporte-encuestas-productos']);
            const lista = ids(menu);
            expect(lista).toContain('marketing.reporte-encuestas-productos');
            expect(lista).not.toContain('marketing.reporte-encuestas-servicios');
        });

        it('Quien_tiene_la_vista_de_servicios_ve_solo_ese_reporte', () => {
            const menu = filtrarMenuPorVistas(defaultNavigation, ['marketing.reporte-encuestas-servicios']);
            const lista = ids(menu);
            expect(lista).toContain('marketing.reporte-encuestas-servicios');
            expect(lista).not.toContain('marketing.reporte-encuestas-productos');
        });
    });
});

