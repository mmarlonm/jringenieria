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
import { fechaLocalISO } from '../cotizacion-etapas.utils';

describe('EtapaDetalleDialogComponent (Cliente F3)', () => {
    let component: EtapaDetalleDialogComponent;
    let fixture: ComponentFixture<EtapaDetalleDialogComponent>;
    let serviceMock: jasmine.SpyObj<CotizacionEtapasService>;
    let usersMock: jasmine.SpyObj<UsersService>;
    let subcontratacionMock: jasmine.SpyObj<SubcontratacionService>;
    let dialogRefMock: jasmine.SpyObj<MatDialogRef<EtapaDetalleDialogComponent>>;
    let procesoMock: { obtener: jasmine.Spy };

    // JSON exacto del API según el plan
    const mockJsonApiEtapa5Estatus6 = {
        idSeguimiento: 10,
        etapaActual: 5,
        cancelado: false,
        montoTotalEstimado: 150000,
        etapas: [
            {
                etapa: 5,
                estatus: 6,
                responsableUsuarioId: 5,
                responsableNombre: 'Responsable 5',
                esAliado: false,
                autorizaUsuarioId: 99,
                autorizaNombre: 'Autorizador 99',
                revisiones: [
                    {
                        numero: 1,
                        elaboradoPorUsuarioId: 42,
                        elaboradoPorNombre: 'Colaborador 1',
                        monto: 150000,
                        resultado: 6,
                        autorizadoPorNombre: 'Autorizador 99',
                        fechaAutorizacion: '2026-11-19T21:05:00Z',
                        enviadaAutorizarFecha: '2026-11-19T20:00:00Z',
                        enviadaAutorizarPorNombre: 'Colaborador 1',
                        clienteResultado: null,
                        clienteFecha: null,
                        clienteReferencia: null,
                        clienteObservaciones: null,
                        clienteRegistradoPorNombre: null,
                        historica: false
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

    async function crearComponente(datosCaso: any = mockJsonApiEtapa5Estatus6, sesionUsuarioId: number = 42, sesionRoles: string[] = ['Usuario']) {
        serviceMock = jasmine.createSpyObj('CotizacionEtapasService', [
            'obtener',
            'guardar',
            'cambiarEstatus',
            'enviarAutorizacion',
            'autorizacionCliente',
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

        serviceMock.obtener.and.returnValue(of(JSON.parse(JSON.stringify(datosCaso))));
        serviceMock.archivos.and.returnValue(of([{ nombreArchivo: 'cotizacion.pdf' }]));
        serviceMock.archivosDelCaso.and.returnValue(of([]));
        usersMock.getUsers.and.returnValue(of([]));
        subcontratacionMock.getPersonal.and.returnValue(of([]));

        if (!jasmine.isSpy(localStorage.getItem)) {
            spyOn(localStorage, 'getItem').and.callFake((key: string) => {
                if (key === 'userInformation') {
                    return JSON.stringify({ usuario: { id: sesionUsuarioId }, roles: sesionRoles });
                }
                return null;
            });
        } else {
            (localStorage.getItem as jasmine.Spy).and.callFake((key: string) => {
                if (key === 'userInformation') {
                    return JSON.stringify({ usuario: { id: sesionUsuarioId }, roles: sesionRoles });
                }
                return null;
            });
        }

        procesoMock = { obtener: jasmine.createSpy('obtener').and.returnValue(of({ actual: 'ingenieria', mensaje: 'Va en Ingeniería', pasos: [] })) };

        TestBed.resetTestingModule();
        await TestBed.configureTestingModule({
            imports: [EtapaDetalleDialogComponent, NoopAnimationsModule],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: { idSeguimiento: 10, etapa: 5 } },
                { provide: MatDialogRef, useValue: dialogRefMock },
                { provide: CotizacionEtapasService, useValue: serviceMock },
                { provide: UsersService, useValue: usersMock },
                { provide: SubcontratacionService, useValue: subcontratacionMock },
                { provide: ProcesoComercialService, useValue: procesoMock }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(EtapaDetalleDialogComponent);
        component = fixture.componentInstance;
    }

    it('La_etapa_5_en_estatus_6_muestra_el_panel_del_cliente_y_oculta_guardar_poner_en_proceso_autorizar_y_rechazar', async () => {
        await crearComponente();
        fixture.detectChanges();

        expect(component.esSoloLectura).toBeTrue();
        expect(component.etapa5PendienteDelCliente).toBeTrue();

        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('Pendiente de autorización del cliente');

        // Botones de edición/estatus ocultos
        const botones = Array.from(el.querySelectorAll('button')).map(b => (b.textContent || '').trim());
        expect(botones.some(t => t.includes('Guardar Cambios'))).toBeFalse();
        expect(botones.some(t => t.includes('Poner en Proceso'))).toBeFalse();
        expect(botones.some(t => t === 'Autorizar' || t.includes('Autorizar cotización (JR)'))).toBeFalse();
        expect(botones.some(t => t.includes('Rechazar'))).toBeFalse();
    });

    it('Solo_el_autorizador_quien_elaboro_o_un_admin_ven_los_botones_del_cliente', async () => {
        // Usuario 42 elaboró la revisión (elaboradoPorUsuarioId: 42) -> ve los botones
        await crearComponente(mockJsonApiEtapa5Estatus6, 42, ['Usuario']);
        fixture.detectChanges();
        expect(component.puedeRegistrarCliente).toBeTrue();
        let el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('El cliente autorizó');
        expect(el.textContent).toContain('El cliente no autorizó');

        // Usuario 99 es el autorizador designado -> ve los botones
        conSesion(99, ['Usuario']);
        fixture.detectChanges();
        expect(component.puedeRegistrarCliente).toBeTrue();

        // Usuario 7 no es autorizador ni elaborador pero es Admin -> ve los botones
        conSesion(7, ['Admin']);
        fixture.detectChanges();
        expect(component.puedeRegistrarCliente).toBeTrue();

        // Usuario 7 común (no es autorizador ni elaborador ni admin) -> no ve los botones, ve texto informativo
        conSesion(7, ['Usuario']);
        fixture.detectChanges();
        expect(component.puedeRegistrarCliente).toBeFalse();
        el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).not.toContain('El cliente autorizó');
        expect(el.textContent).toContain('Solo el autorizador designado, quien elaboró');
    });

    it('El_cliente_autorizo_envia_el_cuerpo_exacto_con_la_fecha_de_hoy_por_omision_y_recarga', async () => {
        await crearComponente();
        fixture.detectChanges();

        component.abrirModalClienteAutorizo();
        expect(component.modalClienteAutorizoAbierto).toBeTrue();
        const hoy = fechaLocalISO(new Date());
        expect(component.clienteFecha).toBe(hoy);

        component.clienteReferencia = 'OC-9876';
        component.clienteObservaciones = 'Autorizado por director';

        serviceMock.autorizacionCliente.and.returnValue(of(mockJsonApiEtapa5Estatus6 as any));
        serviceMock.obtener.calls.reset();

        component.confirmarClienteAutorizo();

        expect(serviceMock.autorizacionCliente).toHaveBeenCalledWith(10, {
            resultado: 3,
            fecha: hoy,
            referencia: 'OC-9876',
            observaciones: 'Autorizado por director'
        });
        expect(component.modalClienteAutorizoAbierto).toBeFalse();
        expect(component.huboCambios).toBeTrue();
        expect(serviceMock.obtener).toHaveBeenCalledWith(10);
    });

    it('El_cliente_autorizo_exige_fecha_y_no_acepta_una_futura', async () => {
        await crearComponente();
        fixture.detectChanges();

        component.abrirModalClienteAutorizo();

        // Sin fecha
        component.clienteFecha = '';
        component.confirmarClienteAutorizo();
        expect(serviceMock.autorizacionCliente).not.toHaveBeenCalled();
        expect(component.errorMsg).toContain('obligatoria');

        // Fecha futura
        const manana = new Date();
        manana.setDate(manana.getDate() + 1);
        component.clienteFecha = fechaLocalISO(manana);
        component.confirmarClienteAutorizo();
        expect(serviceMock.autorizacionCliente).not.toHaveBeenCalled();
        expect(component.errorMsg).toContain('futura');
    });

    it('El_cliente_no_autorizo_exige_observaciones_y_envia_resultado_4', async () => {
        await crearComponente();
        fixture.detectChanges();

        component.abrirModalClienteNoAutorizo();
        expect(component.modalClienteNoAutorizoAbierto).toBeTrue();

        // Sin observaciones
        component.clienteNoAutorizoObservaciones = '   ';
        component.confirmarClienteNoAutorizo();
        expect(serviceMock.autorizacionCliente).not.toHaveBeenCalled();
        expect(component.errorMsg).toContain('obligatorias');

        // Con observaciones
        component.clienteNoAutorizoObservaciones = 'Presupuesto recortado por el cliente';
        component.clienteNoAutorizoReferencia = 'Correo del 19-nov';
        serviceMock.autorizacionCliente.and.returnValue(of(mockJsonApiEtapa5Estatus6 as any));

        component.confirmarClienteNoAutorizo();

        expect(serviceMock.autorizacionCliente).toHaveBeenCalledWith(10, {
            resultado: 4,
            fecha: null,
            referencia: 'Correo del 19-nov',
            observaciones: 'Presupuesto recortado por el cliente'
        });
        expect(component.modalClienteNoAutorizoAbierto).toBeFalse();
        expect(component.huboCambios).toBeTrue();
    });

    it('Un_doble_clic_en_confirmar_manda_una_sola_peticion', async () => {
        await crearComponente();
        fixture.detectChanges();

        const enCurso = new Subject<any>();
        serviceMock.autorizacionCliente.and.callFake(() => enCurso);

        component.abrirModalClienteAutorizo();
        component.confirmarClienteAutorizo();
        component.confirmarClienteAutorizo();

        expect(serviceMock.autorizacionCliente.calls.count()).toBe(1);

        component.guardando = false;
        serviceMock.autorizacionCliente.calls.reset();

        component.abrirModalClienteNoAutorizo();
        component.clienteNoAutorizoObservaciones = 'Rechazo';
        component.confirmarClienteNoAutorizo();
        component.confirmarClienteNoAutorizo();

        expect(serviceMock.autorizacionCliente.calls.count()).toBe(1);
    });

    it('Un_error_del_API_se_ve_dentro_del_modal', async () => {
        await crearComponente();
        fixture.detectChanges();

        serviceMock.autorizacionCliente.and.returnValue(throwError(() => ({
            error: { mensaje: 'La cotización ya fue autorizada por JR; registra la respuesta del cliente' }
        })));

        component.abrirModalClienteAutorizo();
        component.confirmarClienteAutorizo();
        fixture.detectChanges();

        expect(component.modalClienteAutorizoAbierto).toBeTrue();
        expect(component.errorMsg).toBe('La cotización ya fue autorizada por JR; registra la respuesta del cliente');
        const modal = (fixture.nativeElement as HTMLElement).querySelector('.fixed.inset-0');
        expect(modal?.textContent).toContain('La cotización ya fue autorizada por JR');
    });

    it('En_estatus_6_se_puede_subir_evidencia_pero_no_borrarla', async () => {
        await crearComponente();
        fixture.detectChanges();

        expect(component.puedeSubirArchivoActual).toBeTrue();
        expect(component.puedeEliminarArchivoActual).toBeFalse();

        // Cambiar a la pestaña de Archivos y Evidencias
        const pestanas = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[role="tab"]'));
        const tabArchivos = pestanas.find((t) => (t.textContent || '').includes('Archivos y Evidencias'));
        tabArchivos?.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('Subir Archivo');
        expect(el.querySelector('button[mattooltip="Eliminar"]')).toBeNull();
    });

    it('Autorizar_la_etapa_5_dice_Autorizar_cotizacion_JR_y_explica_el_paso_siguiente', async () => {
        // Etapa 5 en EnProceso (no autorizada todavía)
        const casoEtapa5EnProceso = {
            ...mockJsonApiEtapa5Estatus6,
            etapas: [{
                ...mockJsonApiEtapa5Estatus6.etapas[0],
                estatus: ESTATUS_ETAPA.EnProceso,
                revisiones: [{
                    ...mockJsonApiEtapa5Estatus6.etapas[0].revisiones[0],
                    resultado: ESTATUS_ETAPA.EnProceso
                }]
            }]
        };
        await crearComponente(casoEtapa5EnProceso, 99, ['Usuario']); // Usuario 99 es autorizador
        fixture.detectChanges();

        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('Autorizar cotización (JR)');

        component.abrirModalAutorizar();
        fixture.detectChanges();
        const modal = el.querySelector('.fixed.inset-0');
        expect(modal?.textContent).toContain('Autorizar cotización (JR)');
        expect(modal?.textContent).toContain('Seguimiento de Proyectos');
    });

    it('Con_el_cliente_ya_autorizado_el_caso_pasa_a_Seguimiento_de_Proyectos', async () => {
        const casoAprobadoCliente = {
            ...mockJsonApiEtapa5Estatus6,
            etapas: [{
                ...mockJsonApiEtapa5Estatus6.etapas[0],
                estatus: ESTATUS_ETAPA.Autorizada,
                revisiones: [{
                    ...mockJsonApiEtapa5Estatus6.etapas[0].revisiones[0],
                    resultado: ESTATUS_ETAPA.Autorizada,
                    clienteResultado: 3
                }]
            }]
        };
        await crearComponente(casoAprobadoCliente);
        fixture.detectChanges();

        expect(component.casoPasoASeguimiento).toBeTrue();
    });

    it('La_franja_Autorizada_por_JR_no_sale_en_una_revision_que_el_autorizador_rechazo', async () => {
        await crearComponente();
        fixture.detectChanges();
        const base = mockJsonApiEtapa5Estatus6.etapas[0].revisiones[0] as any;

        // El API guarda FechaAutorizacion también al rechazar: una revisión rechazada por el autorizador NO fue autorizada por JR
        expect(component.revisionAutorizadaPorJr({ ...base, resultado: ESTATUS_ETAPA.Rechazada, clienteResultado: null })).toBeFalse();
        expect(component.revisionAutorizadaPorJr({ ...base, resultado: ESTATUS_ETAPA.EnProceso, fechaAutorizacion: null, clienteResultado: null })).toBeFalse();
        // Autorizada por JR y pendiente del cliente
        expect(component.revisionAutorizadaPorJr({ ...base, resultado: ESTATUS_ETAPA.AutorizadaInterna })).toBeTrue();
        // El cliente autorizó (o es una autorización anterior, migrada)
        expect(component.revisionAutorizadaPorJr({ ...base, resultado: ESTATUS_ETAPA.Autorizada, clienteResultado: 3 })).toBeTrue();
        // El cliente no autorizó: JR sí había autorizado antes
        expect(component.revisionAutorizadaPorJr({ ...base, resultado: ESTATUS_ETAPA.Rechazada, clienteResultado: 4 })).toBeTrue();
    });

    it('Abre_con_el_JSON_exacto_del_API_de_la_etapa_5_en_estatus_6_sin_errores', async () => {
        await crearComponente();
        fixture.autoDetectChanges(true);

        expect(component).toBeTruthy();
        expect(component.etapaActualDto?.estatus).toBe(6);
        expect(component.etapa5PendienteDelCliente).toBeTrue();
    });
});
