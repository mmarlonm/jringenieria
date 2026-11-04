import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, of } from 'rxjs';
import { FormularioProductoDto, SurveysProductsService } from '../surveys.service';
import { SurveysListComponent } from './surveys-list.component';
import { EnvioClientesDialogComponent } from '../envio-clientes/envio-clientes-dialog.component';

describe('SurveysListComponent — Envío de encuesta a clientes', () => {
    let component: SurveysListComponent;
    let fixture: ComponentFixture<SurveysListComponent>;
    let dialog: MatDialog;
    let dialogOpenSpy: jasmine.Spy;
    let mockAfterClosed$: Subject<any>;
    let servicio: jasmine.SpyObj<SurveysProductsService> & {
        recuperados$: Subject<{ titulos: string[]; pendientes: number }>;
        servidorNoDisponible$: Subject<void>;
    };

    const encuestaActiva: FormularioProductoDto = {
        id: 1,
        slug: 'encuesta-activa',
        titulo: 'Encuesta Activa',
        camposConfigJson: '[]',
        disenoConfigJson: '{}',
        tipo: 'producto',
        activo: true,
        fechaCreacion: '2026-11-04T10:00:00.000Z',
        totalRespuestas: 0,
    };

    const encuestaInactiva: FormularioProductoDto = {
        id: 2,
        slug: 'encuesta-inactiva',
        titulo: 'Encuesta Inactiva',
        camposConfigJson: '[]',
        disenoConfigJson: '{}',
        tipo: 'producto',
        activo: false,
        fechaCreacion: '2026-11-04T10:00:00.000Z',
        totalRespuestas: 0,
    };

    beforeEach(async () => {
        mockAfterClosed$ = new Subject<any>();

        servicio = Object.assign(
            jasmine.createSpyObj<SurveysProductsService>('SurveysProductsService', [
                'getFormularios',
                'getSurveys',
                'guardarFormulario',
                'eliminarFormulario',
            ]),
            {
                recuperados$: new Subject<{ titulos: string[]; pendientes: number }>(),
                servidorNoDisponible$: new Subject<void>(),
            }
        );
        servicio.getFormularios.and.returnValue(of([encuestaActiva, encuestaInactiva]));
        servicio.getSurveys.and.returnValue(of({ code: 200, message: '', data: [] }));

        await TestBed.configureTestingModule({
            imports: [SurveysListComponent, NoopAnimationsModule, HttpClientTestingModule],
            providers: [
                { provide: SurveysProductsService, useValue: servicio },
                { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(SurveysListComponent);
        component = fixture.componentInstance;

        dialogOpenSpy = spyOn((component as any)._dialog, 'open').and.returnValue({
            afterClosed: () => mockAfterClosed$.asObservable(),
        } as any);
    });

    it('abrirEnvioClientes_abre_un_solo_dialogo_aunque_se_llame_dos_veces', () => {
        component.abrirEnvioClientes(encuestaActiva);
        component.abrirEnvioClientes(encuestaActiva); // segunda llamada mientras abierto

        expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
        expect(dialogOpenSpy).toHaveBeenCalledWith(EnvioClientesDialogComponent, {
            data: {
                formularioId: 1,
                titulo: 'Encuesta Activa',
            },
            width: '1000px',
            maxWidth: '96vw',
        });

        // Al cerrarse el diálogo, permite abrir uno nuevo
        mockAfterClosed$.next(null);
        component.abrirEnvioClientes(encuestaActiva);
        expect(dialogOpenSpy).toHaveBeenCalledTimes(2);
    });

    it('no_hay_boton_para_un_formulario_inactivo', () => {
        component.abrirEnvioClientes(encuestaInactiva);
        expect(dialogOpenSpy).not.toHaveBeenCalled();
    });

    it('boton_en_tarjeta_de_formulario_activo_y_ausente_en_inactivo', () => {
        fixture.detectChanges(); // Renderiza la plantilla completa
        const compiled = fixture.nativeElement as HTMLElement;

        // Buscamos los botones con el icono forward_to_inbox en las tarjetas
        const botonesEnviar = compiled.querySelectorAll('button[matTooltip="Enviar encuesta"]');
        expect(botonesEnviar.length).toBe(1); // Solo la encuesta activa tiene el botón
    });

    it('boton_en_el_editor_de_un_formulario_guardado_y_activo', () => {
        component.vistaActual = 'editor';
        component.currentFormId = 15;
        component.titulo = 'Encuesta Guardada';
        component.activo = true;
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        const botonEditor = compiled.querySelector('header button[matTooltip="Enviar encuesta"]');
        expect(botonEditor).toBeTruthy();
    });

    it('ausente_en_el_editor_de_uno_nuevo', () => {
        component.vistaActual = 'editor';
        component.currentFormId = 0; // formulario nuevo sin guardar
        component.titulo = 'Nueva Encuesta';
        component.activo = true;
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        const botonEditor = compiled.querySelector('header button[matTooltip="Enviar encuesta"]');
        expect(botonEditor).toBeFalsy();
    });
});

