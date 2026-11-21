import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EtapaDetalleDialogComponent } from './etapa-detalle-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CotizacionEtapasService } from '../cotizacion-etapas.service';
import { UsersService } from 'app/modules/admin/security/users/users.service';
import { SubcontratacionService } from '../../subcontratacion.service';
import { of, Subject, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CotizacionEtapasDetalleDto, ESTATUS_ETAPA } from '../cotizacion-etapas.models';
import { ProcesoComercialService } from 'app/shared/proceso-comercial/proceso-comercial.service';

describe('EtapaDetalleDialogComponent (Autorizacion F2)', () => {
    let component: EtapaDetalleDialogComponent;
    let fixture: ComponentFixture<EtapaDetalleDialogComponent>;
    let serviceMock: jasmine.SpyObj<CotizacionEtapasService>;
    let usersMock: jasmine.SpyObj<UsersService>;
    let subcontratacionMock: jasmine.SpyObj<SubcontratacionService>;
    let dialogRefMock: jasmine.SpyObj<MatDialogRef<EtapaDetalleDialogComponent>>;
    let procesoMock: { obtener: jasmine.Spy };

    const mockDetalle: CotizacionEtapasDetalleDto = {
        idSeguimiento: 10,
        titulo: 'Proyecto Prueba',
        descripcion: 'Descripción del proyecto',
        tipo: 'PROYECTO',
        idSolicitante: 1,
        solicitanteNombre: 'Cliente Corp',
        empresa: 'Empresa SA',
        sucursalId: 1,
        fechaRequisicion: '2026-10-24T10:00:00Z',
        idUsuarioRegistro: 42,
        etapaActual: 1,
        cancelado: false,
        motivoRechazo: null,
        montoTotalEstimado: null,
        etapas: [
            {
                etapa: 1,
                estatus: ESTATUS_ETAPA.EnProceso,
                fechaProgramada: null,
                responsableUsuarioId: 5,
                responsableNombre: 'Responsable 5',
                responsableAliadoId: null,
                esAliado: false,
                autorizaUsuarioId: 99,
                autorizaNombre: 'Autorizador 99',
                informacionSuficiente: 1,
                observacionesInformacion: 'Observaciones iniciales',
                revisiones: [
                    {
                        numero: 1,
                        fechaElaboracion: '2026-10-24T10:00:00Z',
                        elaboradoPorNombre: 'Colaborador 1',
                        queCambio: null,
                        monto: null,
                        resultado: ESTATUS_ETAPA.EnProceso,
                        observacionesAutorizacion: null,
                        autorizadoPorNombre: null,
                        fechaAutorizacion: null,
                        historica: false,
                        carpetaLegada: null
                    }
                ]
            }
        ]
    };

    function conSesion(usuarioId: number = 42, roles: string[] = ['Usuario']): void {
        (localStorage.getItem as jasmine.Spy).and.callFake((key: string) =>
            key === 'userInformation' ? JSON.stringify({ usuario: { id: usuarioId }, roles }) : null
        );
    }

    beforeEach(async () => {
        serviceMock = jasmine.createSpyObj('CotizacionEtapasService', [
            'obtener',
            'guardar',
            'cambiarEstatus',
            'enviarAutorizacion',
            'iniciarRevision',
            'cancelar',
            'reactivar',
            'eliminar',
            'archivos',
            'archivosDelCaso',
            'subirArchivos',
            'descargarArchivo',
            'eliminarArchivo'
        ]);
        usersMock = jasmine.createSpyObj('UsersService', ['getUsers']);
        subcontratacionMock = jasmine.createSpyObj('SubcontratacionService', ['getPersonal']);
        dialogRefMock = jasmine.createSpyObj('MatDialogRef', ['close']);

        serviceMock.obtener.and.returnValue(of(JSON.parse(JSON.stringify(mockDetalle))));
        serviceMock.archivos.and.returnValue(of([]));
        serviceMock.archivosDelCaso.and.returnValue(of([]));
        usersMock.getUsers.and.returnValue(of([{ id: 99, nombreCompleto: 'Autorizador 99' }]));
        subcontratacionMock.getPersonal.and.returnValue(of([]));

        spyOn(localStorage, 'getItem').and.callFake((key: string) => {
            if (key === 'userInformation') {
                return JSON.stringify({ usuario: { id: 42 }, roles: ['Usuario'] });
            }
            return null;
        });

        procesoMock = { obtener: jasmine.createSpy('obtener').and.returnValue(of({ actual: 'ingenieria', mensaje: 'Va en Ingeniería', pasos: [] })) };

        await TestBed.configureTestingModule({
            imports: [EtapaDetalleDialogComponent, NoopAnimationsModule],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: { idSeguimiento: 10, etapa: 1 } },
                { provide: MatDialogRef, useValue: dialogRefMock },
                { provide: CotizacionEtapasService, useValue: serviceMock },
                { provide: UsersService, useValue: usersMock },
                { provide: SubcontratacionService, useValue: subcontratacionMock },
                { provide: ProcesoComercialService, useValue: procesoMock }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(EtapaDetalleDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('El_autorizador_se_pide_sin_la_opcion_cualquier_usuario', () => {
        const text = (fixture.nativeElement as HTMLElement).textContent || '';
        expect(text).not.toContain('Cualquier usuario autorizado');
        expect(text).toContain('Autorizador designado *');
        expect(text).toContain('Obligatorio para enviar a autorizar');
    });

    it('Enviar_a_autorizar_se_deshabilita_sin_autorizador_guardado_o_con_cambios_sin_guardar', () => {
        fixture.detectChanges();
        const botonEnviar = () => {
            const botones = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
            return botones.find(b => (b.textContent || '').trim().includes('Enviar a autorizar'));
        };

        expect(botonEnviar()).toBeDefined();
        expect(botonEnviar()?.disabled).toBeFalse();

        component.form.markAsDirty();
        fixture.detectChanges();
        expect(botonEnviar()?.disabled).toBeTrue();

        component.form.markAsPristine();
        component.guardando = true;
        fixture.detectChanges();
        expect(botonEnviar()?.disabled).toBeTrue();

        component.guardando = false;
        component.etapaActualDto = {
            ...component.etapaActualDto!,
            autorizaUsuarioId: null
        };
        fixture.detectChanges();
        expect(botonEnviar()?.disabled).toBeTrue();
    });

    it('Enviar_a_autorizar_llama_al_servicio_una_sola_vez_con_doble_clic_y_recarga', () => {
        const enCurso = new Subject<CotizacionEtapasDetalleDto>();
        serviceMock.enviarAutorizacion.and.callFake(() => enCurso);
        serviceMock.obtener.calls.reset();

        component.enviarAutorizacion();
        component.enviarAutorizacion();

        expect(serviceMock.enviarAutorizacion.calls.count()).toBe(1);
        expect(serviceMock.enviarAutorizacion).toHaveBeenCalledWith(10, 1);

        enCurso.next(mockDetalle);
        enCurso.complete();

        expect(component.huboCambios).toBeTrue();
        expect(serviceMock.obtener).toHaveBeenCalledWith(10);
    });

    it('Tras_enviar_se_muestra_la_franja_de_pendiente_del_autorizador', () => {
        component.etapaActualDto = {
            ...mockDetalle.etapas[0],
            autorizaNombre: 'Autorizador 99',
            revisiones: [
                {
                    ...mockDetalle.etapas[0].revisiones[0],
                    enviadaAutorizarFecha: '2026-11-20T10:00:00Z'
                }
            ]
        };
        fixture.detectChanges();

        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('Enviada a autorizar el');
        expect(el.textContent).toContain('Pendiente de Autorizador 99');
    });

    it('Un_error_al_enviar_se_ve_en_pantalla_y_no_cambia_el_estado', () => {
        serviceMock.enviarAutorizacion.and.returnValue(throwError(() => ({
            error: { mensaje: 'Designa y guarda al autorizador antes de enviar a autorizar' }
        })));

        component.enviarAutorizacion();
        fixture.detectChanges();

        expect(component.guardando).toBeFalse();
        expect(component.errorMsg).toBe('Designa y guarda al autorizador antes de enviar a autorizar');
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('Designa y guarda al autorizador antes de enviar a autorizar');
    });

    it('Autorizar_y_rechazar_solo_se_ofrecen_al_autorizador_designado_o_a_un_admin_y_sin_designado_solo_a_los_admin', () => {
        conSesion(42, ['Usuario']);
        fixture.detectChanges();
        expect(component.puedeAutorizarAccion).toBeFalse();

        conSesion(99, ['Usuario']);
        fixture.detectChanges();
        expect(component.puedeAutorizarAccion).toBeTrue();

        conSesion(42, ['Admin']);
        fixture.detectChanges();
        expect(component.puedeAutorizarAccion).toBeTrue();

        component.etapaActualDto = {
            ...mockDetalle.etapas[0],
            autorizaUsuarioId: null
        };
        conSesion(42, ['Usuario']);
        fixture.detectChanges();
        expect(component.puedeAutorizarAccion).toBeFalse();

        conSesion(42, ['Admin']);
        fixture.detectChanges();
        expect(component.puedeAutorizarAccion).toBeTrue();
    });
});
