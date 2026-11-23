import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import {
    FormularioProductoDto,
    FormularioProductoRespuestaDetalleDto,
    SurveysProductsService
} from '../surveys.service';
import { SurveysListComponent } from './surveys-list.component';

describe('SurveysListComponent — Descarga de Respuestas Detalladas de Encuestas', () => {
    let component: SurveysListComponent;
    let fixture: ComponentFixture<SurveysListComponent>;
    let servicio: jasmine.SpyObj<SurveysProductsService>;
    let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

    const formMock2026: FormularioProductoDto = {
        id: 101,
        titulo: 'Encuesta de Satisfacción Clientes 2026',
        slug: 'encuesta-clientes-2026',
        descripcion: 'Evaluación anual de servicios y productos 2026',
        tipo: 'producto',
        activo: true,
        totalRespuestas: 2,
        camposConfigJson: JSON.stringify([
            { id: 'sec1', tipo: 'section', etiqueta: 'Datos de Cabecera' },
            { id: 'p1_comentario', tipo: 'input', etiqueta: 'Comentario general' },
            {
                id: 'p2_atencion',
                tipo: 'radio',
                etiqueta: 'Calidad de atención',
                opciones: [
                    { valor: '1', etiqueta: 'Deficiente' },
                    { valor: '2', etiqueta: 'Regular' },
                    { valor: '3', etiqueta: 'Excelente' }
                ]
            },
            {
                id: 'p3_servicios',
                tipo: 'checkbox',
                etiqueta: 'Servicios contratados',
                opciones: ['Mantenimiento', 'Soporte', 'Garantía']
            },
            {
                id: 'p4_matriz',
                tipo: 'matrix',
                etiqueta: 'Evaluación por área',
                filasMatriz: [
                    { id: 'f1', texto: 'Tiempo de respuesta' },
                    { id: 'f2', texto: 'Claridad en cotización' }
                ],
                columnasMatriz: [
                    { valor: 'mal', etiqueta: 'Malo' },
                    { valor: 'regular', etiqueta: 'Regular' },
                    { valor: 'bien', etiqueta: 'Bueno' }
                ]
            }
        ]),
        disenoConfigJson: '{}',
        fechaCreacion: '2026-01-01T00:00:00Z'
    };

    const respuestasMock: FormularioProductoRespuestaDetalleDto[] = [
        {
            id: 201,
            formularioId: 101,
            tipo: 'producto',
            nombreCliente: 'Ing. Laura Flores',
            empresaCliente: 'Aceros del Norte',
            emailCliente: 'laura@aceros.com',
            telefonoCliente: '8181234567',
            cargoCliente: 'Jefa de Planta',
            calificacionGeneral: 9.5,
            respuestasJson: JSON.stringify({
                p1_comentario: 'Servicio "rápido" y eficaz, muy recomendado.',
                p2_atencion: '3',
                p3_servicios: ['Mantenimiento', 'Soporte'],
                p4_matriz_f1: 'bien',
                p4_matriz_f2: 'regular'
            }),
            fechaRegistro: '2026-03-10T14:30:00Z'
        },
        {
            id: 202,
            formularioId: 101,
            tipo: 'producto',
            nombreCliente: 'Anónimo',
            empresaCliente: 'Grupo B',
            emailCliente: '',
            telefonoCliente: '',
            cargoCliente: '',
            calificacionGeneral: 8.0,
            respuestasJson: JSON.stringify({
                p1_comentario: 'Sin observaciones',
                p2_atencion: '2',
                p3_servicios: ['Garantía'],
                p4_matriz_f1: 'regular',
                p4_matriz_f2: 'bien'
            }),
            fechaRegistro: '2026-03-11T16:00:00Z'
        }
    ];

    beforeEach(async () => {
        servicio = jasmine.createSpyObj<SurveysProductsService>('SurveysProductsService', [
            'getFormularios',
            'getSurveys',
            'guardarFormulario',
            'eliminarFormulario',
            'obtenerRespuestasUnificadas',
            'obtenerDetalleRespuestaUnificada',
            'getRespuestasFormulario'
        ]);

        snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

        servicio.getFormularios.and.returnValue(of([formMock2026]));
        servicio.getSurveys.and.returnValue(of({ code: 200, message: '', data: [] }));
        servicio.obtenerRespuestasUnificadas.and.returnValue(of([]));
        servicio.obtenerDetalleRespuestaUnificada.and.returnValue(of({} as any));
        servicio.getRespuestasFormulario.and.returnValue(of(respuestasMock));

        await TestBed.configureTestingModule({
            imports: [
                SurveysListComponent,
                NoopAnimationsModule,
                HttpClientTestingModule
            ],
            providers: [
                { provide: SurveysProductsService, useValue: servicio },
                { provide: MatSnackBar, useValue: snackBarSpy },
                { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(SurveysListComponent);
        component = fixture.componentInstance;
        (component as any)._snackBar = snackBarSpy;
        fixture.detectChanges();
    });

    it('construirCsvRespuestasDetalladas genera encabezados base y columnas dinámicas por cada campo de la encuesta', () => {
        const csv = component.construirCsvRespuestasDetalladas(formMock2026, respuestasMock);

        expect(csv.startsWith('\uFEFF')).toBeTrue();
        expect(csv).toContain('ID,Fecha,Encuesta,Tipo,Cliente / Evaluador,Empresa,Correo Electrónico,Teléfono,Cargo / Puesto,Calificación General');
        expect(csv).toContain('Comentario general');
        expect(csv).toContain('Calidad de atención');
        expect(csv).toContain('Servicios contratados');
        expect(csv).toContain('Evaluación por área — Tiempo de respuesta');
        expect(csv).toContain('Evaluación por área — Claridad en cotización');

        // Fila 1 valores y escape de comillas
        expect(csv).toContain('Ing. Laura Flores');
        expect(csv).toContain('Aceros del Norte');
        expect(csv).toContain('Excelente'); // Radio resuelto
        expect(csv).toContain('Mantenimiento, Soporte'); // Checkboxes unidos
        expect(csv).toContain('Bueno'); // Matriz fila 1 resuelto
        expect(csv).toContain('Regular'); // Matriz fila 2 resuelto
        expect(csv).toContain('""rápido""'); // Comillas escapadas

        // Fila 2
        expect(csv).toContain('Anónimo');
        expect(csv).toContain('Grupo B');
        expect(csv).toContain('Garantía');
    });

    it('descargarRespuestasEncuesta consulta las respuestas detalladas del formulario y dispara la descarga', () => {
        let blobDescargado: Blob | null = null;
        let nombreArchivoDescargado = '';

        spyOn(URL, 'createObjectURL').and.callFake((blob: Blob) => {
            blobDescargado = blob;
            return 'blob:http://localhost/test-descarga';
        });
        spyOn(URL, 'revokeObjectURL').and.stub();
        spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
            nombreArchivoDescargado = this.download;
        });

        component.descargarRespuestasEncuesta(formMock2026);

        expect(servicio.getRespuestasFormulario).toHaveBeenCalledWith(101);
        expect(URL.createObjectURL).toHaveBeenCalled();
        expect(blobDescargado).not.toBeNull();
        expect(nombreArchivoDescargado).toContain('Respuestas_encuesta_clientes_2026_');
        expect(nombreArchivoDescargado.endsWith('.csv')).toBeTrue();
        expect(snackBarSpy.open).toHaveBeenCalledWith(
            jasmine.stringMatching(/Se descargaron 2 respuestas con todos sus campos/),
            'OK',
            jasmine.any(Object)
        );
    });

    it('descargarRespuestasEncuesta avisa si no existen respuestas para la encuesta', () => {
        servicio.getRespuestasFormulario.and.returnValue(of([]));
        spyOn(component, 'descargarArchivoCsv');

        component.descargarRespuestasEncuesta(formMock2026);

        expect(component.descargarArchivoCsv).not.toHaveBeenCalled();
        expect(snackBarSpy.open).toHaveBeenCalledWith(
            jasmine.stringMatching(/no tiene respuestas registradas para descargar/),
            'Cerrar',
            jasmine.any(Object)
        );
    });

    it('toggleSeleccionEncuesta y gestion de seleccion multiple de encuestas', () => {
        expect(component.hayEncuestasSeleccionadas).toBeFalse();
        expect(component.estaEncuestaSeleccionada(101)).toBeFalse();

        // Seleccionar
        component.toggleSeleccionEncuesta(101);
        expect(component.estaEncuestaSeleccionada(101)).toBeTrue();
        expect(component.hayEncuestasSeleccionadas).toBeTrue();
        expect(component.encuestasSeleccionadas.size).toBe(1);

        // Deseleccionar
        component.toggleSeleccionEncuesta(101);
        expect(component.estaEncuestaSeleccionada(101)).toBeFalse();
        expect(component.hayEncuestasSeleccionadas).toBeFalse();

        // Seleccionar todas y limpiar
        component.formulariosList = [formMock2026, { ...formMock2026, id: 102 }];
        component.seleccionarTodasEncuestas();
        expect(component.encuestasSeleccionadas.size).toBe(2);

        component.limpiarSeleccionEncuestas();
        expect(component.encuestasSeleccionadas.size).toBe(0);
    });

    it('descargarRespuestasSeleccionadas procesa la descarga de las encuestas elegidas', fakeAsync(() => {
        const form2: FormularioProductoDto = { ...formMock2026, id: 102, slug: 'encuesta-2', titulo: 'Encuesta 2' };
        component.formulariosList = [formMock2026, form2];
        component.toggleSeleccionEncuesta(101);
        component.toggleSeleccionEncuesta(102);

        spyOn(component, 'descargarRespuestasEncuesta');

        component.descargarRespuestasSeleccionadas();

        // Primera llamada inmediata (idx = 0)
        tick(10);
        expect(component.descargarRespuestasEncuesta).toHaveBeenCalledWith(formMock2026);

        // Segunda llamada con delay (idx = 1)
        tick(700);
        expect(component.descargarRespuestasEncuesta).toHaveBeenCalledWith(form2);
    }));

    it('exportarRespuestasExcel delega a la descarga detallada cuando filtroFormularioId tiene una encuesta activa', () => {
        component.formulariosList = [formMock2026];
        component.filtroFormularioId = 101;
        component.respuestasList = [
            { id: 201, origen: 'dinamica', formularioId: 101 } as any
        ];

        spyOn(component, 'descargarRespuestasEncuesta');

        component.exportarRespuestasExcel();

        expect(component.descargarRespuestasEncuesta).toHaveBeenCalledWith(
            formMock2026,
            new Set([201])
        );
    });
});
