import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EtapaDetalleDialogComponent } from './etapa-detalle-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CotizacionEtapasService } from '../cotizacion-etapas.service';
import { UsersService } from 'app/modules/admin/security/users/users.service';
import { SubcontratacionService } from '../../subcontratacion.service';
import { of, Subject, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CotizacionEtapasDetalleDto, ESTATUS_ETAPA } from '../cotizacion-etapas.models';
import { obtenerEtapaConfig } from '../etapas.config';

describe('EtapaDetalleDialogComponent', () => {
    let component: EtapaDetalleDialogComponent;
    let fixture: ComponentFixture<EtapaDetalleDialogComponent>;
    let serviceMock: jasmine.SpyObj<CotizacionEtapasService>;
    let usersMock: jasmine.SpyObj<UsersService>;
    let subcontratacionMock: jasmine.SpyObj<SubcontratacionService>;
    let dialogRefMock: jasmine.SpyObj<MatDialogRef<EtapaDetalleDialogComponent>>;

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
                autorizaUsuarioId: 99, // Distinto al usuario actual 42
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

    beforeEach(async () => {
        serviceMock = jasmine.createSpyObj('CotizacionEtapasService', [
            'obtener',
            'guardar',
            'cambiarEstatus',
            'iniciarRevision',
            'cancelar',
            'reactivar',
            'eliminar',
            'archivos',
            'subirArchivos',
            'descargarArchivo',
            'eliminarArchivo'
        ]);
        usersMock = jasmine.createSpyObj('UsersService', ['getUsers']);
        subcontratacionMock = jasmine.createSpyObj('SubcontratacionService', ['getPersonal']);
        dialogRefMock = jasmine.createSpyObj('MatDialogRef', ['close']);

        serviceMock.obtener.and.returnValue(of(mockDetalle));
        serviceMock.archivos.and.returnValue(of([]));
        usersMock.getUsers.and.returnValue(of([]));
        subcontratacionMock.getPersonal.and.returnValue(of([]));

        // Simular usuario actual id = 42 (distinto al autorizador 99)
        spyOn(localStorage, 'getItem').and.callFake((key: string) => {
            if (key === 'userInformation') {
                return JSON.stringify({ usuario: { id: 42 }, roles: ['Usuario'] });
            }
            return null;
        });

        await TestBed.configureTestingModule({
            imports: [EtapaDetalleDialogComponent, NoopAnimationsModule],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: { idSeguimiento: 10, etapa: 1 } },
                { provide: MatDialogRef, useValue: dialogRefMock },
                { provide: CotizacionEtapasService, useValue: serviceMock },
                { provide: UsersService, useValue: usersMock },
                { provide: SubcontratacionService, useValue: subcontratacionMock }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(EtapaDetalleDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create and load detail', () => {
        expect(component).toBeTruthy();
        expect(serviceMock.obtener).toHaveBeenCalledWith(10);
        expect(component.etapaActualDto?.etapa).toBe(1);
    });

    it('con autorizador designado distinto al usuario actual, puedeAutorizarAccion es false', () => {
        expect(component.puedeAutorizarAccion).toBeFalse();
    });

    it('con revision 2 y sin queCambio el guardado debe estar deshabilitado', () => {
        component.etapaActualDto = {
            ...mockDetalle.etapas[0],
            revisiones: [
                {
                    numero: 1,
                    resultado: ESTATUS_ETAPA.Rechazada,
                    historica: false
                },
                {
                    numero: 2,
                    resultado: ESTATUS_ETAPA.EnProceso,
                    queCambio: null,
                    historica: false
                }
            ]
        };
        component.form.patchValue({ queCambio: '' });

        expect(component.puedeGuardarRevision()).toBeFalse();

        component.form.patchValue({ queCambio: 'Se ajustaron las especificaciones técnicas' });
        expect(component.puedeGuardarRevision()).toBeTrue();
    });

    it('iniciar revision solo debe estar disponible cuando la ultima revision esta Rechazada', () => {
        // En proceso: no disponible
        expect(component.puedeIniciarRevision()).toBeFalse();

        // Ultima rechazada: disponible
        component.etapaActualDto = {
            ...mockDetalle.etapas[0],
            revisiones: [
                {
                    numero: 1,
                    resultado: ESTATUS_ETAPA.Rechazada,
                    historica: false
                }
            ]
        };

        expect(component.puedeIniciarRevision()).toBeTrue();
    });

    it('con etapa Autorizada o etapaActual distinta no aparecen los botones de accion', () => {
        // Caso 1: etapaActual distinta (caso en etapa 2, pero dialog abierto en etapa 1)
        component.detalle = {
            ...mockDetalle,
            etapaActual: 2
        };
        fixture.detectChanges();
        expect(component.esSoloLectura).toBeTrue();
        expect(component.puedeOperarAcciones).toBeFalse();
        let compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('button[color="primary"]')?.textContent).not.toContain('Autorizar');
        expect(compiled.textContent).not.toContain('Guardar Cambios');

        // Caso 2: etapa ya Autorizada
        component.detalle = {
            ...mockDetalle,
            etapaActual: 1
        };
        component.etapaActualDto = {
            ...mockDetalle.etapas[0],
            estatus: ESTATUS_ETAPA.Autorizada
        };
        fixture.detectChanges();
        expect(component.esSoloLectura).toBeTrue();
        expect(component.puedeOperarAcciones).toBeFalse();
        compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('button[color="primary"]')?.textContent).not.toContain('Autorizar');
        expect(compiled.textContent).not.toContain('Guardar Cambios');
    });

    function conSesion(roles: string[]): void {
        (localStorage.getItem as jasmine.Spy).and.callFake((key: string) =>
            key === 'userInformation' ? JSON.stringify({ usuario: { id: 42 }, roles }) : null
        );
    }

    it('un administrador (rol admin o pruebas, sin importar mayusculas) puede autorizar y cambiar al autorizador aunque haya otro designado', () => {
        for (const rol of ['Admin', 'PRUEBAS']) {
            conSesion([rol]);
            expect(component.esAdmin).withContext(rol).toBeTrue();
            expect(component.puedeAutorizarAccion).withContext(rol).toBeTrue();
            expect(component.puedeCambiarAutorizador).withContext(rol).toBeTrue();
        }

        conSesion(['Usuario']);
        expect(component.esAdmin).toBeFalse();
        expect(component.puedeAutorizarAccion).toBeFalse();
        expect(component.puedeCambiarAutorizador).toBeFalse();
    });

    it('quien no autoriza ve «Poner en Proceso» pero no Autorizar ni Rechazar', () => {
        fixture.detectChanges();
        const botones = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
            .map((b) => (b.textContent || '').trim());

        expect(botones.some((t) => t.includes('Poner en Proceso'))).toBeTrue();
        expect(botones.some((t) => t === 'Autorizar')).toBeFalse();
        expect(botones.some((t) => t === 'Rechazar')).toBeFalse();
    });

    it('la etapa 1 pregunta por la información brindada por el cliente y la 2 por la información recabada', () => {
        component.etapaNumero = 1;
        component.etapaConfig = obtenerEtapaConfig(1);
        fixture.detectChanges();
        expect(component.etiquetaInformacion).toBe('Información brindada por el cliente');
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Información brindada por el cliente');

        component.etapaNumero = 2;
        component.etapaConfig = obtenerEtapaConfig(2);
        fixture.detectChanges();
        expect(component.etiquetaInformacion).toBe('Información recabada');
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Información recabada');
    });

    it('un doble clic no envía dos veces la misma acción mientras la primera sigue en curso', () => {
        const enCurso = () => new Subject<CotizacionEtapasDetalleDto>();
        serviceMock.guardar.and.callFake(() => enCurso());
        serviceMock.cambiarEstatus.and.callFake(() => enCurso());
        serviceMock.iniciarRevision.and.callFake(() => enCurso());
        serviceMock.cancelar.and.callFake(() => enCurso());

        const acciones: { nombre: string; ejecutar: () => void; llamadas: () => number }[] = [
            { nombre: 'guardar', ejecutar: () => component.guardar(), llamadas: () => serviceMock.guardar.calls.count() },
            { nombre: 'ponerEnProceso', ejecutar: () => component.ponerEnProceso(), llamadas: () => serviceMock.cambiarEstatus.calls.count() }
        ];
        for (const accion of acciones) {
            accion.ejecutar();
            accion.ejecutar();
            expect(accion.llamadas()).withContext(accion.nombre).toBe(1);
            component.guardando = false; // la siguiente acción parte de cero
            serviceMock.cambiarEstatus.calls.reset();
        }

        component.guardando = false;
        component.modalAutorizarAbierto = true;
        component.confirmarAutorizar();
        component.confirmarAutorizar();
        expect(serviceMock.cambiarEstatus.calls.count()).withContext('confirmarAutorizar').toBe(1);

        component.guardando = false;
        serviceMock.cambiarEstatus.calls.reset();
        component.motivoRechazoTexto = 'falta información';
        component.confirmarRechazar();
        component.confirmarRechazar();
        expect(serviceMock.cambiarEstatus.calls.count()).withContext('confirmarRechazar').toBe(1);

        component.guardando = false;
        component.motivoCancelacionTexto = 'ya no procede';
        component.confirmarCancelar();
        component.confirmarCancelar();
        expect(serviceMock.cancelar.calls.count()).withContext('confirmarCancelar').toBe(1);

        component.guardando = false;
        component.iniciarRevision();
        component.iniciarRevision();
        expect(serviceMock.iniciarRevision.calls.count()).withContext('iniciarRevision').toBe(1);
    });

    it('un error al autorizar, rechazar o cancelar se ve dentro del modal que lo tapa', () => {
        const mensaje = 'La etapa ya se encuentra autorizada';
        const modales = ['modalAutorizarAbierto', 'modalRechazarAbierto', 'modalCancelarAbierto'] as const;

        for (const abierto of modales) {
            component.modalAutorizarAbierto = false;
            component.modalRechazarAbierto = false;
            component.modalCancelarAbierto = false;
            component[abierto] = true;
            component.errorMsg = mensaje;
            fixture.detectChanges();

            const modal = (fixture.nativeElement as HTMLElement).querySelector('.fixed.inset-0');
            expect(modal?.textContent).withContext(abierto).toContain(mensaje);
        }
    });

    it('al abrir un modal se limpia el error anterior', () => {
        for (const abrir of [() => component.abrirModalAutorizar(), () => component.abrirModalRechazar(), () => component.abrirModalCancelar()]) {
            component.errorMsg = 'error viejo';
            abrir();
            expect(component.errorMsg).toBeNull();
        }
    });

    // ───── Caso cancelado: reactivar o eliminar ─────

    function conCasoCancelado(cambios: Partial<CotizacionEtapasDetalleDto> = {}): void {
        component.detalle = { ...mockDetalle, cancelado: true, motivoRechazo: 'ya no procede', ...cambios };
        fixture.detectChanges();
    }

    function textosDeBotones(): string[] {
        return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).map((b) => (b.textContent || '').trim());
    }

    it('un caso cancelado ofrece reactivar, y no ofrece cancelar de nuevo', () => {
        conCasoCancelado();

        const botones = textosDeBotones();
        expect(botones.some((t) => t.includes('Reactivar'))).toBeTrue();
        expect(botones.some((t) => t.includes('Cancelar Caso'))).toBeFalse();
    });

    it('eliminar solo se ofrece a quien registró el caso o a un administrador, y nunca si ya pasó a Seguimiento de Proyectos', () => {
        // Usuario actual: 42. Registró él el caso → puede.
        conCasoCancelado({ idUsuarioRegistro: 42 });
        expect(component.puedeEliminar).toBeTrue();
        expect(textosDeBotones().some((t) => t.includes('Eliminar'))).toBeTrue();

        // Lo registró otra persona y no es admin → no.
        conCasoCancelado({ idUsuarioRegistro: 7 });
        expect(component.puedeEliminar).toBeFalse();
        expect(textosDeBotones().some((t) => t.includes('Eliminar'))).toBeFalse();

        // Lo registró otra persona pero es administrador → sí.
        conSesion(['Admin']);
        conCasoCancelado({ idUsuarioRegistro: 7 });
        expect(component.puedeEliminar).toBeTrue();

        // Ya pasó a Seguimiento de Proyectos (etapa 5 autorizada) → no, ni siquiera un administrador.
        conCasoCancelado({
            idUsuarioRegistro: 7,
            etapas: [...mockDetalle.etapas, { ...mockDetalle.etapas[0], etapa: 5, estatus: ESTATUS_ETAPA.Autorizada }]
        });
        expect(component.puedeEliminar).toBeFalse();
        expect(textosDeBotones().some((t) => t.includes('Eliminar'))).toBeFalse();
    });

    it('un caso que no está cancelado no ofrece reactivar ni eliminar', () => {
        component.detalle = { ...mockDetalle, cancelado: false };
        fixture.detectChanges();

        expect(component.puedeReactivar).toBeFalse();
        expect(component.puedeEliminar).toBeFalse();
    });

    it('confirmar la reactivación llama al servicio, cierra el modal y recarga el caso', () => {
        serviceMock.reactivar.and.returnValue(of({ ...mockDetalle, cancelado: false }));
        serviceMock.obtener.calls.reset();
        conCasoCancelado();

        component.abrirModalReactivar();
        expect(component.modalReactivarAbierto).toBeTrue();
        component.confirmarReactivar();

        expect(serviceMock.reactivar).toHaveBeenCalledOnceWith(10);
        expect(component.modalReactivarAbierto).toBeFalse();
        expect(component.huboCambios).toBeTrue();
        expect(serviceMock.obtener).toHaveBeenCalledWith(10);
    });

    it('confirmar la eliminación llama al servicio y cierra el diálogo avisando que hubo cambios', () => {
        serviceMock.eliminar.and.returnValue(of({ success: true }));
        conCasoCancelado();

        component.abrirModalEliminar();
        expect(component.modalEliminarAbierto).toBeTrue();
        component.confirmarEliminar();

        expect(serviceMock.eliminar).toHaveBeenCalledOnceWith(10);
        expect(dialogRefMock.close).toHaveBeenCalledWith(true);
    });

    it('si la API rechaza eliminar, el mensaje se ve dentro del modal y el diálogo sigue abierto', () => {
        serviceMock.eliminar.and.returnValue(throwError(() => ({ error: { mensaje: 'Este caso ya pasó a Seguimiento de Proyectos y no se puede eliminar' } })));
        conCasoCancelado();

        component.abrirModalEliminar();
        component.confirmarEliminar();
        fixture.detectChanges();

        expect(dialogRefMock.close).not.toHaveBeenCalled();
        const modal = (fixture.nativeElement as HTMLElement).querySelector('.fixed.inset-0');
        expect(modal?.textContent).toContain('Seguimiento de Proyectos');
    });

    it('reactivar y eliminar no se envían dos veces con un doble clic', () => {
        serviceMock.reactivar.and.callFake(() => new Subject<CotizacionEtapasDetalleDto>());
        serviceMock.eliminar.and.callFake(() => new Subject<any>());
        conCasoCancelado();

        component.confirmarReactivar();
        component.confirmarReactivar();
        expect(serviceMock.reactivar.calls.count()).toBe(1);

        component.guardando = false;
        component.confirmarEliminar();
        component.confirmarEliminar();
        expect(serviceMock.eliminar.calls.count()).toBe(1);
    });

    it('fecha de elaboracion solo aparece en las etapas 3 a 5', () => {
        // En etapa 1: no debe aparecer fecha de elaboración
        component.etapaNumero = 1;
        component.etapaConfig = obtenerEtapaConfig(1);
        fixture.detectChanges();
        let compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('input[formcontrolname="fechaElaboracion"]')).toBeNull();

        // En etapa 2: no debe aparecer fecha de elaboración
        component.etapaNumero = 2;
        component.etapaConfig = obtenerEtapaConfig(2);
        fixture.detectChanges();
        compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('input[formcontrolname="fechaElaboracion"]')).toBeNull();

        // En etapa 3: sí debe aparecer
        component.etapaNumero = 3;
        component.etapaConfig = obtenerEtapaConfig(3);
        fixture.detectChanges();
        compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('input[formcontrolname="fechaElaboracion"]')).not.toBeNull();

        // En etapa 5: sí debe aparecer
        component.etapaNumero = 5;
        component.etapaConfig = obtenerEtapaConfig(5);
        fixture.detectChanges();
        compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('input[formcontrolname="fechaElaboracion"]')).not.toBeNull();
    });
});
