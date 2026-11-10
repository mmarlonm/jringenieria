import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, of, throwError } from 'rxjs';
import {
    EncuestaRespuestaResumenDto,
    EncuestaRespuestaDetalleDto,
    SurveysProductsService
} from '../surveys.service';
import { SurveysListComponent } from './surveys-list.component';

describe('SurveysListComponent — Respuestas unificadas (Tarea C1)', () => {
    let component: SurveysListComponent;
    let fixture: ComponentFixture<SurveysListComponent>;
    let servicio: jasmine.SpyObj<SurveysProductsService> & {
        recuperados$: Subject<{ titulos: string[]; pendientes: number }>;
        servidorNoDisponible$: Subject<void>;
    };

    const respDinamica: EncuestaRespuestaResumenDto = {
        origen: 'dinamica',
        id: 12,
        formularioId: 1,
        formularioTitulo: 'Encuesta Satisfacción Q4',
        tipo: 'producto',
        nombre: 'Carlos Gómez',
        empresa: 'Industrias Alfa',
        email: 'carlos@alfa.com',
        telefono: '5512345678',
        cargo: 'Gerente Compras',
        calificacion: 8.5,
        fechaRegistro: '2026-11-05T03:00:00Z'
    };

    const respHeredadaAnonima: EncuestaRespuestaResumenDto = {
        origen: 'heredada',
        id: 5,
        formularioId: null,
        formularioTitulo: null,
        tipo: 'servicio',
        nombre: null,
        empresa: null,
        email: null,
        telefono: null,
        cargo: null,
        calificacion: null,
        fechaRegistro: '2026-11-05T03:00:00Z'
    };

    const detalleMock: EncuestaRespuestaDetalleDto = {
        ...respDinamica,
        respuestas: [
            { campoId: 'c1', etiqueta: 'Atención del personal', tipo: 'radio', valor: 'Excelente' },
            { campoId: 'c2', etiqueta: 'Comentarios', tipo: 'textarea', valor: '<img src=x onerror=alert(1)>' }
        ]
    };

    beforeEach(async () => {
        servicio = Object.assign(
            jasmine.createSpyObj<SurveysProductsService>('SurveysProductsService', [
                'getFormularios',
                'getSurveys',
                'guardarFormulario',
                'eliminarFormulario',
                'obtenerRespuestasUnificadas',
                'obtenerDetalleRespuestaUnificada'
            ]),
            {
                recuperados$: new Subject<{ titulos: string[]; pendientes: number }>(),
                servidorNoDisponible$: new Subject<void>()
            }
        );

        servicio.getFormularios.and.returnValue(of([]));
        servicio.getSurveys.and.returnValue(of({ code: 200, message: '', data: [] }));
        servicio.obtenerRespuestasUnificadas.and.returnValue(of([respDinamica, respHeredadaAnonima]));
        servicio.obtenerDetalleRespuestaUnificada.and.returnValue(of(detalleMock));

        await TestBed.configureTestingModule({
            imports: [
                SurveysListComponent,
                NoopAnimationsModule,
                HttpClientTestingModule
            ],
            providers: [
                { provide: SurveysProductsService, useValue: servicio },
                { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) },
                { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(SurveysListComponent);
        component = fixture.componentInstance;
        component.subTabListado = 'respuestas';
        fixture.detectChanges();
    });

    it('Muestra_el_nombre_derivado_y_Anonimo_solo_si_viene_vacio', () => {
        component.cargarRespuestas();
        fixture.detectChanges();

        const filas = fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>;
        expect(filas.length).toBeGreaterThanOrEqual(2);

        const textoFila1 = filas[0].textContent || '';
        const textoFila2 = filas[1].textContent || '';

        expect(textoFila1).toContain('Carlos Gómez');
        expect(textoFila1).not.toContain('Anónimo');

        expect(textoFila2).toContain('Anónimo');
    });

    it('Muestra_la_calificacion_real_y_guion_si_es_nula', () => {
        component.cargarRespuestas();
        fixture.detectChanges();

        const filas = fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>;
        expect(filas.length).toBeGreaterThanOrEqual(2);

        const celdaCal1 = filas[0].querySelectorAll('td')[5]?.textContent?.trim() || '';
        const celdaCal2 = filas[1].querySelectorAll('td')[5]?.textContent?.trim() || '';

        expect(celdaCal1).toContain('8.5');
        expect(celdaCal2).toBe('—');
        expect(celdaCal2).not.toContain('9');
    });

    it('Muestra_el_ID_y_la_fecha_en_hora_de_Mexico', () => {
        component.cargarRespuestas();
        fixture.detectChanges();

        const filas = fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>;
        expect(filas.length).toBeGreaterThanOrEqual(2);

        const idFila1 = filas[0].querySelectorAll('td')[0]?.textContent?.trim();
        const idFila2 = filas[1].querySelectorAll('td')[0]?.textContent?.trim();

        expect(idFila1).toBe('#12');
        expect(idFila2).toBe('H5');

        const fechaFila1 = filas[0].querySelectorAll('td')[6]?.textContent?.trim() || '';
        // 2026-11-05T03:00:00Z en America/Mexico_City es 2026-11-04 21:00
        expect(fechaFila1).toContain('04/11/2026');
        expect(fechaFila1).toContain('21:00');
    });

    it('El_filtro_de_tipo_se_manda_al_API', () => {
        component.cambiarFiltroTipoRespuesta('servicio');
        expect(servicio.obtenerRespuestasUnificadas).toHaveBeenCalledWith('servicio');

        component.cambiarFiltroTipoRespuesta('producto');
        expect(servicio.obtenerRespuestasUnificadas).toHaveBeenCalledWith('producto');
    });

    it('Un_error_de_carga_se_ve_con_Reintentar_y_no_se_oculta', () => {
        servicio.obtenerRespuestasUnificadas.and.returnValue(throwError(() => new Error('Error de conexión')));
        component.cargarRespuestas();
        fixture.detectChanges();

        const botonReintentar = fixture.nativeElement.querySelector('button.btn-reintentar-respuestas, button:not([disabled])') as HTMLButtonElement;
        const texto = fixture.nativeElement.textContent || '';

        expect(texto).toContain('Reintentar');

        // Al hacer clic en Reintentar debe llamar de nuevo a cargarRespuestas
        servicio.obtenerRespuestasUnificadas.calls.reset();
        servicio.obtenerRespuestasUnificadas.and.returnValue(of([respDinamica]));

        component.cargarRespuestas();
        fixture.detectChanges();

        expect(servicio.obtenerRespuestasUnificadas).toHaveBeenCalled();
        expect(component.respuestasList.length).toBe(1);
    });

    it('Ver_respuestas_pide_el_detalle_y_lo_muestra_pregunta_por_pregunta', () => {
        component.cargarRespuestas();
        fixture.detectChanges();

        component.abrirDetalleRespuesta(respDinamica);
        expect(servicio.obtenerDetalleRespuestaUnificada).toHaveBeenCalledWith('dinamica', 12);
        fixture.detectChanges();

        expect(component.modalDetalleAbierto).toBeTrue();
        const textoModal = fixture.nativeElement.textContent || '';
        expect(textoModal).toContain('Atención del personal');
        expect(textoModal).toContain('Excelente');
    });

    it('El_detalle_se_muestra_escapado', () => {
        component.abrirDetalleRespuesta(respDinamica);
        fixture.detectChanges();

        const imgX = fixture.nativeElement.querySelector('img[src="x"]');
        expect(imgX).withContext('no debe renderizarse una etiqueta img maliciosa como elemento HTML').toBeNull();

        const textoModal = fixture.nativeElement.textContent || '';
        expect(textoModal).toContain('<img src=x onerror=alert(1)>');
    });

    it('El_CSV_lleva_las_columnas_nuevas', async () => {
        component.cargarRespuestas();
        fixture.detectChanges();

        let blobGenerado: Blob | null = null;
        spyOn(URL, 'createObjectURL').and.callFake((blob: Blob) => {
            blobGenerado = blob;
            return 'blob:http://localhost/test';
        });
        spyOn(URL, 'revokeObjectURL').and.stub();
        spyOn(HTMLAnchorElement.prototype, 'click').and.stub();

        component.exportarRespuestasExcel();

        expect(URL.createObjectURL).toHaveBeenCalled();
        expect(blobGenerado).not.toBeNull();

        const texto = await (blobGenerado as any).text();
        const primeraLinea = texto.split('\n')[0].replace(/^\uFEFF/, '').trim();
        expect(primeraLinea).toBe('ID,Tipo,Formulario,Cliente,Empresa,Correo,Teléfono,Cargo,Calificación,Fecha');
    });

    // ---- Revisión de Claude: carreras, botón real, medianoche y sin camino al endpoint viejo ----

    it('Un_cambio_de_filtro_cancela_la_peticion_anterior', () => {
        const lenta = new Subject<EncuestaRespuestaResumenDto[]>();
        const rapida = new Subject<EncuestaRespuestaResumenDto[]>();
        servicio.obtenerRespuestasUnificadas.and.returnValues(lenta, rapida);

        component.cambiarFiltroTipoRespuesta('producto'); // queda pendiente
        component.cambiarFiltroTipoRespuesta('servicio'); // la reemplaza
        rapida.next([respHeredadaAnonima]);
        lenta.next([respDinamica]); // llega tarde: no debe pisar la lista actual

        expect(component.respuestasList).toEqual([respHeredadaAnonima]);
    });

    it('Abrir_otro_detalle_cancela_la_carga_del_anterior', () => {
        const lento = new Subject<EncuestaRespuestaDetalleDto>();
        const rapido = new Subject<EncuestaRespuestaDetalleDto>();
        servicio.obtenerDetalleRespuestaUnificada.and.returnValues(lento, rapido);
        const otro: EncuestaRespuestaDetalleDto = {
            ...detalleMock,
            id: 99,
            respuestas: [{ campoId: 'x', etiqueta: 'Otra pregunta', tipo: 'input', valor: 'Otra respuesta' }]
        };

        component.abrirDetalleRespuesta(respDinamica);
        component.cerrarDetalleRespuesta();
        component.abrirDetalleRespuesta({ ...respDinamica, id: 99 });
        rapido.next(otro);
        lento.next(detalleMock); // llega tarde: es de otra respuesta

        expect(component.detalleRespuestaCompleto?.id).toBe(99);
    });

    it('El_boton_Reintentar_vuelve_a_pedir_las_respuestas', () => {
        servicio.obtenerRespuestasUnificadas.and.returnValue(throwError(() => new Error('sin conexión')));
        component.cargarRespuestas();
        fixture.detectChanges();
        servicio.obtenerRespuestasUnificadas.calls.reset();
        servicio.obtenerRespuestasUnificadas.and.returnValue(of([respDinamica]));

        const boton = fixture.nativeElement.querySelector('button.btn-reintentar-respuestas') as HTMLButtonElement | null;
        expect(boton).withContext('debe haber un botón Reintentar visible').not.toBeNull();
        boton!.click();
        fixture.detectChanges();

        expect(servicio.obtenerRespuestasUnificadas).toHaveBeenCalledTimes(1);
        expect(component.errorCargaRespuestas).toBeFalse();
        expect(component.respuestasList).toEqual([respDinamica]);
    });

    it('La_hora_de_medianoche_se_muestra_como_00_y_no_como_24', () => {
        // 2026-11-05T06:05:00Z = 00:05 del 5 de noviembre en la Ciudad de México
        expect(component.formatearFechaMexico('2026-11-05T06:05:00Z')).toBe('05/11/2026 00:05');
    });

    it('No_hay_camino_al_endpoint_viejo_de_respuestas', () => {
        servicio.getSurveys.calls.reset();

        component.cargarRespuestas();

        expect(servicio.getSurveys).not.toHaveBeenCalled();
        expect(servicio.obtenerRespuestasUnificadas).toHaveBeenCalled();
    });

    it('Filtra_respuestas_por_formulario_especifico_y_por_heredadas', () => {
        const respForm2: EncuestaRespuestaResumenDto = {
            ...respDinamica,
            id: 13,
            formularioId: 2,
            formularioTitulo: 'Encuesta de Satisfacción'
        };
        component.respuestasList = [respDinamica, respForm2, respHeredadaAnonima];

        // Todos
        component.filtroFormularioId = 'todos';
        expect(component.respuestasFiltradas.length).toBe(3);

        // Solo Formulario 1
        component.filtroFormularioId = 1;
        expect(component.respuestasFiltradas.length).toBe(1);
        expect(component.respuestasFiltradas[0].id).toBe(12);

        // Solo Formulario 2
        component.filtroFormularioId = 2;
        expect(component.respuestasFiltradas.length).toBe(1);
        expect(component.respuestasFiltradas[0].id).toBe(13);

        // Solo Heredadas (valor 0)
        component.filtroFormularioId = 0;
        expect(component.respuestasFiltradas.length).toBe(1);
        expect(component.respuestasFiltradas[0].origen).toBe('heredada');
    });

    it('filtrarPorEncuesta_cambia_a_la_pestana_de_respuestas_y_establece_el_filtro', () => {
        const formMock = { id: 2, titulo: 'Encuesta de Satisfacción' } as any;
        component.subTabListado = 'formularios';
        component.filtroFormularioId = 'todos';

        component.filtrarPorEncuesta(formMock);

        expect(component.subTabListado).toBe('respuestas');
        expect<any>(component.filtroFormularioId).toBe(2);
    });

    it('contarRespuestasDeFormulario_cuenta_unicamente_las_de_ese_formulario', () => {
        const respForm2: EncuestaRespuestaResumenDto = {
            ...respDinamica,
            id: 13,
            formularioId: 2,
            formularioTitulo: 'Encuesta de Satisfacción'
        };
        component.respuestasList = [respDinamica, respForm2, respHeredadaAnonima];

        expect(component.contarRespuestasDeFormulario(1)).toBe(1);
        expect(component.contarRespuestasDeFormulario(2)).toBe(1);
        expect(component.contarRespuestasDeFormulario(99)).toBe(0);
        expect(component.contarRespuestasHeredadas()).toBe(1);
    });
});

