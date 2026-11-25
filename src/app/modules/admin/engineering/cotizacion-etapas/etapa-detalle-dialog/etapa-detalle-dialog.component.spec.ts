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
import { ProcesoComercialService } from 'app/shared/proceso-comercial/proceso-comercial.service';

describe('EtapaDetalleDialogComponent', () => {
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
            'archivosDelCaso',
            'subirArchivos',
            'descargarArchivo',
            'eliminarArchivo',
            'regresar'
        ]);
        usersMock = jasmine.createSpyObj('UsersService', ['getUsers']);
        subcontratacionMock = jasmine.createSpyObj('SubcontratacionService', ['getPersonal']);
        dialogRefMock = jasmine.createSpyObj('MatDialogRef', ['close']);

        serviceMock.obtener.and.returnValue(of(mockDetalle));
        serviceMock.regresar.and.returnValue(of(mockDetalle));
        serviceMock.archivos.and.returnValue(of([]));
        serviceMock.archivosDelCaso.and.returnValue(of([]));
        usersMock.getUsers.and.returnValue(of([]));
        subcontratacionMock.getPersonal.and.returnValue(of([]));

        // Simular usuario actual id = 42 (distinto al autorizador 99)
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

    it('should create and load detail', () => {
        expect(component).toBeTruthy();
        expect(serviceMock.obtener).toHaveBeenCalledWith(10);
        expect(component.etapaActualDto?.etapa).toBe(1);
    });

    it('muestra en que proceso va el caso de Ingenieria', () => {
        expect(procesoMock.obtener).toHaveBeenCalledWith('caso', 10);
        expect(fixture.nativeElement.querySelector('app-proceso-comercial')).not.toBeNull();
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

    function conSesion(roles: string[], id: number = 42): void {
        (localStorage.getItem as jasmine.Spy).and.callFake((key: string) =>
            key === 'userInformation' ? JSON.stringify({ usuario: { id }, roles }) : null
        );
    }

    it('un administrador (rol admin, sin importar mayusculas) puede autorizar y cambiar al autorizador aunque haya otro designado', () => {
        for (const rol of ['Admin', 'ADMIN']) {
            conSesion([rol], 88); // 88 no es idUsuarioRegistro (42)
            expect(component.esAdmin).withContext(rol).toBeTrue();
            expect(component.puedeAutorizarAccion).withContext(rol).toBeTrue();
            expect(component.puedeCambiarAutorizador).withContext(rol).toBeTrue();
        }

        // El rol Pruebas ya no cuenta como admin en Ingeniería: no ve Autorizar/Rechazar si no es el designado
        for (const rol of ['Pruebas', 'PRUEBAS']) {
            conSesion([rol], 88);
            expect(component.esAdmin).withContext(rol).toBeFalse();
            expect(component.puedeAutorizarAccion).withContext(rol).toBeFalse();
            expect(component.puedeCambiarAutorizador).withContext(rol).toBeFalse();
        }

        conSesion(['Usuario'], 88); // 88 no es admin y no es quien registró (42)
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

    // ───── Etapas anteriores: solo consulta ─────

    function abrirEnEtapa3ConAnteriores(): void {
        const etapa1 = { ...mockDetalle.etapas[0], estatus: ESTATUS_ETAPA.Autorizada };
        serviceMock.obtener.and.returnValue(of({
            ...mockDetalle,
            etapaActual: 3,
            etapas: [
                { ...etapa1, etapa: 3, estatus: ESTATUS_ETAPA.EnProceso },
                { ...etapa1, etapa: 2, estatus: ESTATUS_ETAPA.NoAplica, revisiones: [] },
                etapa1,
                { ...etapa1, etapa: 4, estatus: ESTATUS_ETAPA.Pendiente, revisiones: [] }
            ]
        }));
        serviceMock.archivosDelCaso.and.returnValue(of([
            { etapa: 1, revision: 1, nombreArchivo: 'plano.pdf' },
            { etapa: 3, revision: 1, nombreArchivo: 'calculo.xlsx' }
        ]));
        component.etapaNumero = 3;
        component.etapaVisualizada = 3;
        component.etapaConfig = obtenerEtapaConfig(3);
        component.cargarDetalle();
        fixture.detectChanges();
    }

    function etiquetasDePestanas(): string[] {
        return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[role="tab"]')).map((t) => (t.textContent || '').trim());
    }

    it('en la etapa 1 no hay pestaña de etapas anteriores ni se piden sus archivos', () => {
        expect(component.etapasAnteriores).toEqual([]);
        expect(etiquetasDePestanas().some((t) => t.includes('Etapas anteriores'))).toBeFalse();
        expect(serviceMock.archivosDelCaso).not.toHaveBeenCalled();
    });

    it('en la etapa 3 se consultan la 1 y la 2, en orden, con solo los archivos de esas etapas', () => {
        abrirEnEtapa3ConAnteriores();

        expect(component.etapasAnteriores.map((e) => e.etapa)).toEqual([1, 2]);
        expect(etiquetasDePestanas().some((t) => t.includes('Etapas anteriores (2)'))).toBeTrue();
        expect(serviceMock.archivosDelCaso).toHaveBeenCalledWith(10);
        expect(component.archivosAnteriores.map((a) => a.nombreArchivo)).toEqual(['plano.pdf']);
        expect(component.archivosDeEtapaAnterior(1).length).toBe(1);
        expect(component.archivosDeEtapaAnterior(2).length).toBe(0);
        expect(component.etapaNoAplica(component.etapasAnteriores[1])).toBeTrue();
    });

    it('la pestaña de etapas anteriores muestra los datos sin campos editables ni botones de subir o eliminar', async () => {
        abrirEnEtapa3ConAnteriores();
        const pestanas = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[role="tab"]'));
        pestanas.find((t) => (t.textContent || '').includes('Etapas anteriores'))!.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const paneles = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[data-etapa-anterior]');
        expect(paneles.length).toBe(2);
        const etapa1 = paneles[0];
        expect(etapa1.textContent).toContain('Solicitud del cliente');
        expect(etapa1.textContent).toContain('Autorizada');
        expect(etapa1.textContent).toContain('Observaciones iniciales');
        expect(etapa1.textContent).toContain('Responsable 5');
        expect(etapa1.textContent).toContain('plano.pdf');
        expect(etapa1.querySelectorAll('input, textarea, select, mat-select').length).toBe(0);
        expect(etapa1.textContent).not.toContain('Subir');
        expect(etapa1.querySelectorAll('button').length).toBe(1); // solo descargar
        expect(paneles[1].textContent).toContain('No aplica');
        expect(paneles[1].textContent).toContain('se omitió');
    });

    it('descargar un archivo de una etapa anterior pide el de su etapa y revisión, no el de la etapa abierta', () => {
        abrirEnEtapa3ConAnteriores();
        serviceMock.descargarArchivo.and.returnValue(of(new Blob(['x'])));

        component.descargarArchivoAnterior({ etapa: 1, revision: 2, nombreArchivo: 'plano.pdf' });

        expect(serviceMock.descargarArchivo).toHaveBeenCalledOnceWith(10, 1, 2, 'plano.pdf');
    });

    it('El_selector_de_etapa_siguiente_muestra_el_titulo_de_cada_etapa_y_no_Etapa_sola', () => {
        component.modalAutorizarAbierto = true;
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        const select = compiled.querySelector('[data-testid="select-etapa-siguiente"]') as HTMLSelectElement;
        expect(select).not.toBeNull();

        const opciones = Array.from(select.querySelectorAll('option'));
        expect(opciones.length).toBe(4);

        for (const op of opciones) {
            expect(op.textContent?.trim()).not.toMatch(/^Etapa \d+$/);
        }

        expect(opciones[0].textContent?.trim()).toBe('Levantamiento técnico');
        expect(opciones[0].value).toBe('2');

        expect(opciones[1].textContent?.trim()).toBe('Diseño/Cálculo e Ingeniería');
        expect(opciones[1].value).toBe('3');

        expect(opciones[2].textContent?.trim()).toBe('Presupuesto técnico');
        expect(opciones[2].value).toBe('4');

        expect(opciones[3].textContent?.trim()).toBe('Cotización técnico-comercial');
        expect(opciones[3].value).toBe('5');
    });

    // ───── F4: Archivos y evidencias con versiones y observaciones ─────

    it('Muestra_pestanas_R1_R2_por_cada_revision_de_la_etapa', async () => {
        const detalleConDosRevisiones: CotizacionEtapasDetalleDto = {
            ...mockDetalle,
            etapas: [
                {
                    ...mockDetalle.etapas[0],
                    revisiones: [
                        { ...mockDetalle.etapas[0].revisiones[0], numero: 1, resultado: ESTATUS_ETAPA.Rechazada },
                        { ...mockDetalle.etapas[0].revisiones[0], numero: 2, resultado: ESTATUS_ETAPA.EnProceso }
                    ]
                }
            ]
        };
        component.detalle = detalleConDosRevisiones;
        component.etapaActualDto = detalleConDosRevisiones.etapas[0];
        component.revisionSeleccionadaArchivos = 2;
        fixture.detectChanges();

        const pestanas = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[role="tab"]'));
        pestanas.find((t) => (t.textContent || '').includes('Archivos'))!.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const tabsRev = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('[data-testid^="tab-revision-"]');
        expect(tabsRev.length).toBe(2);
        expect(tabsRev[0].textContent?.trim()).toBe('R1');
        expect(tabsRev[1].textContent?.trim()).toBe('R2');

        serviceMock.archivos.calls.reset();
        tabsRev[0].click();
        fixture.detectChanges();
        expect(component.revisionSeleccionadaArchivos).toBe(1);
        expect(serviceMock.archivos).toHaveBeenCalledWith(10, 1, 1);
    });

    it('Cada_archivo_muestra_version_observacion_quien_y_cuando', async () => {
        component.archivosLista = [
            {
                nombreArchivo: 'memoria.docx',
                tamanoBytes: 2048,
                fecha: '2026-11-20T10:30:00Z',
                subidoPorNombre: 'Juan Ingeniero',
                version: 2,
                observacion: 'Cálculo de cargas ajustado',
                versiones: []
            }
        ];
        component.cargandoArchivos = false;
        fixture.detectChanges();

        const pestanas = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[role="tab"]'));
        pestanas.find((t) => (t.textContent || '').includes('Archivos'))!.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const item = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="archivo-item-memoria.docx"]');
        expect(item).not.toBeNull();
        expect(item?.querySelector('[data-testid="version-badge-memoria.docx"]')?.textContent?.trim()).toBe('v2');
        expect(item?.querySelector('[data-testid="subido-por-memoria.docx"]')?.textContent).toContain('Juan Ingeniero');
        expect(item?.querySelector('[data-testid="observacion-archivo-memoria.docx"]')?.textContent).toContain('Cálculo de cargas ajustado');
    });

    it('Muestra_versiones_anteriores_desplegable_con_descarga_version_k', async () => {
        serviceMock.descargarArchivo.and.returnValue(of(new Blob(['v1content'])));
        component.archivosLista = [
            {
                nombreArchivo: 'especificaciones.pdf',
                tamanoBytes: 4096,
                fecha: '2026-11-21T15:00:00Z',
                subidoPorNombre: 'Carlos',
                version: 2,
                observacion: 'Segunda entrega',
                versiones: [
                    {
                        version: 1,
                        fecha: '2026-11-19T09:00:00Z',
                        subidoPorNombre: 'Carlos',
                        observacion: 'Primera entrega preliminar'
                    }
                ]
            }
        ];
        component.cargandoArchivos = false;
        fixture.detectChanges();

        const pestanas = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[role="tab"]'));
        pestanas.find((t) => (t.textContent || '').includes('Archivos'))!.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const summary = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="summary-versiones-especificaciones.pdf"]');
        expect(summary).not.toBeNull();
        expect(summary?.textContent).toContain('Versiones anteriores (1)');

        const versionItem = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="version-item-especificaciones.pdf-1"]');
        expect(versionItem).not.toBeNull();
        expect(versionItem?.textContent).toContain('v1');
        expect(versionItem?.textContent).toContain('Primera entrega preliminar');

        const btnDescargarV1 = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="descargar-v-especificaciones.pdf-1"]');
        expect(btnDescargarV1).not.toBeNull();
        btnDescargarV1?.click();
        expect(serviceMock.descargarArchivo).toHaveBeenCalledWith(10, 1, 1, 'especificaciones.pdf', 1);
    });

    it('Al_elegir_archivos_abre_modal_y_si_existe_avisa_se_guardara_como_version_N', () => {
        component.archivosLista = [
            {
                nombreArchivo: 'diagrama.dwg',
                tamanoBytes: 1024,
                fecha: '2026-11-20T10:00:00Z',
                subidoPorNombre: 'Ana',
                version: 2,
                observacion: 'Versión previa',
                versiones: []
            }
        ];
        fixture.detectChanges();

        const mockFileExistente = new File(['123'], 'diagrama.dwg');
        const mockFileNuevo = new File(['456'], 'nuevo-plano.pdf');

        component.onArchivosSeleccionados({ target: { files: [mockFileExistente, mockFileNuevo] } });
        fixture.detectChanges();

        expect(component.modalSubirArchivosAbierto).toBeTrue();
        expect(component.archivosParaSubir.length).toBe(2);
        expect(component.archivosParaSubir[0].esResubida).toBeTrue();
        expect(component.archivosParaSubir[0].versionSiguiente).toBe(3);
        expect(component.archivosParaSubir[1].esResubida).toBeFalse();
        expect(component.archivosParaSubir[1].versionSiguiente).toBe(1);

        const avisoResubida = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="aviso-resubida-diagrama.dwg"]');
        expect(avisoResubida).not.toBeNull();
        expect(avisoResubida?.textContent).toContain('Se guardará como versión 3');

        const avisoNuevo = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="aviso-resubida-nuevo-plano.pdf"]');
        expect(avisoNuevo).toBeNull();
    });

    it('Confirmar_subida_manda_archivos_y_observaciones_al_servicio', () => {
        serviceMock.subirArchivos.and.returnValue(of(undefined));
        const mockFile = new File(['abc'], 'reporte.docx');
        component.archivosParaSubir = [
            {
                file: mockFile,
                nombre: 'reporte.docx',
                observacion: 'Correcciones de ortografía',
                esResubida: false,
                versionSiguiente: 1
            }
        ];
        component.modalSubirArchivosAbierto = true;
        fixture.detectChanges();

        component.confirmarSubida();
        expect(serviceMock.subirArchivos).toHaveBeenCalledWith(
            10,
            1,
            1,
            [mockFile],
            ['Correcciones de ortografía']
        );
        expect(component.modalSubirArchivosAbierto).toBeFalse();
    });

    it('Subir_archivo_solo_se_permite_en_la_revision_editable', async () => {
        const detalleConDosRev: CotizacionEtapasDetalleDto = {
            ...mockDetalle,
            etapas: [
                {
                    ...mockDetalle.etapas[0],
                    revisiones: [
                        { ...mockDetalle.etapas[0].revisiones[0], numero: 1, resultado: ESTATUS_ETAPA.Rechazada },
                        { ...mockDetalle.etapas[0].revisiones[0], numero: 2, resultado: ESTATUS_ETAPA.EnProceso }
                    ]
                }
            ]
        };
        component.detalle = detalleConDosRev;
        component.etapaActualDto = detalleConDosRev.etapas[0];

        // En R1 (revisión pasada no editable)
        component.revisionSeleccionadaArchivos = 1;
        fixture.detectChanges();
        expect(component.puedeSubirArchivoActual).toBeFalse();

        // En R2 (última revisión editable)
        component.revisionSeleccionadaArchivos = 2;
        fixture.detectChanges();
        expect(component.puedeSubirArchivoActual).toBeTrue();

        // Verificar botón en la pestaña de archivos
        const pestanas = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[role="tab"]'));
        pestanas.find((t) => (t.textContent || '').includes('Archivos'))!.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="btn-abrir-subir-archivo"]')).not.toBeNull();
    });

    // ───── F6: Regresar a una etapa anterior y breadcrumb de solo lectura ─────

    it('Encabezado_muestra_breadcrumb_de_las_5_etapas_con_marca_de_hecha_actual_y_futura', () => {
        abrirEnEtapa3ConAnteriores();
        const breadcrumb = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="breadcrumb-etapas"]');
        expect(breadcrumb).not.toBeNull();

        for (let i = 1; i <= 5; i++) {
            const btn = (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="breadcrumb-etapa-${i}"]`);
            expect(btn).not.toBeNull();
        }

        // Etapa 1 está hecha (Autorizada)
        const iconoHecha1 = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="icono-hecha-1"]');
        expect(iconoHecha1).not.toBeNull();

        // Etapa 4 y 5 son futuras
        const btn4 = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="breadcrumb-etapa-4"]');
        const btn5 = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="breadcrumb-etapa-5"]');
        expect(btn4?.disabled).toBeTrue();
        expect(btn5?.disabled).toBeTrue();
    });

    it('Clic_en_etapa_anterior_muestra_vista_de_consulta_solo_lectura_y_boton_volver', () => {
        abrirEnEtapa3ConAnteriores();
        const btn1 = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="breadcrumb-etapa-1"]');
        btn1?.click();
        fixture.detectChanges();

        expect(component.etapaVisualizada).toBe(1);
        expect(component.esModoConsulta).toBeTrue();
        expect(component.esSoloLectura).toBeTrue();
        expect(component.form.disabled).toBeTrue();

        const banner = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="banner-vista-consulta"]');
        expect(banner).not.toBeNull();
        expect(banner?.textContent).toContain('Vista de consulta');
        expect(banner?.textContent).toContain('Solicitud del cliente');

        const btnVolver = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="btn-volver-etapa-actual"]');
        expect(btnVolver).not.toBeNull();
        btnVolver?.click();
        fixture.detectChanges();

        expect(component.etapaVisualizada).toBe(3);
        expect(component.esModoConsulta).toBeFalse();
    });

    it('Etapas_futuras_no_son_clicables_en_el_breadcrumb', () => {
        abrirEnEtapa3ConAnteriores();
        const btn4 = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="breadcrumb-etapa-4"]');
        expect(btn4?.disabled).toBeTrue();
        component.seleccionarEtapaBreadcrumb(4);
        fixture.detectChanges();

        expect(component.etapaVisualizada).toBe(3);
    });

    it('Boton_regresar_a_etapa_anterior_solo_se_ofrece_si_es_elegible_y_con_permiso', () => {
        // En etapa 1: no se debe ofrecer
        expect(component.puedeRegresarEtapa).toBeFalse();
        let btnRegresar = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="btn-abrir-regresar-etapa"]');
        expect(btnRegresar).toBeNull();

        // En etapa 3 como usuario sin permiso
        abrirEnEtapa3ConAnteriores();
        expect(component.puedeRegresarEtapa).toBeFalse();

        // En etapa 3 con rol admin
        spyOnProperty(component, 'esAdmin', 'get').and.returnValue(true);
        fixture.detectChanges();
        expect(component.puedeRegresarEtapa).toBeTrue();
        btnRegresar = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="btn-abrir-regresar-etapa"]');
        expect(btnRegresar).not.toBeNull();
    });

    it('Modal_regresar_muestra_selector_por_titulo_y_valida_motivo_10_a_1000', () => {
        abrirEnEtapa3ConAnteriores();
        spyOnProperty(component, 'esAdmin', 'get').and.returnValue(true);
        fixture.detectChanges();

        component.abrirModalRegresar();
        fixture.detectChanges();

        expect(component.modalRegresarAbierto).toBeTrue();
        expect(component.etapasParaRegresar.map((e) => e.numero)).toEqual([1, 2]);
        expect(component.etapaRegresoSeleccionada).toBe(2);

        // Motivo vacío o corto (< 10 caracteres)
        component.motivoRegresoTexto = 'Corto';
        expect(component.motivoValido).toBeFalse();

        component.motivoRegresoTexto = 'Motivo suficientemente detallado para el regreso';
        expect(component.motivoValido).toBeTrue();
    });

    it('Confirmar_regreso_llama_a_servicio_regresar_y_recarga_detalle', () => {
        abrirEnEtapa3ConAnteriores();
        spyOnProperty(component, 'esAdmin', 'get').and.returnValue(true);
        fixture.detectChanges();

        const detalleRegresado: CotizacionEtapasDetalleDto = {
            ...mockDetalle,
            etapaActual: 1
        };
        serviceMock.regresar.and.returnValue(of(detalleRegresado));

        component.abrirModalRegresar();
        component.etapaRegresoSeleccionada = 1;
        component.motivoRegresoTexto = 'Revisión técnica solicitada por el cliente';
        component.confirmarRegresar();

        expect(serviceMock.regresar).toHaveBeenCalledWith(10, 1, 'Revisión técnica solicitada por el cliente');
        expect(component.modalRegresarAbierto).toBeFalse();
        expect(component.huboCambios).toBeTrue();
        expect(component.etapaActualNumero).toBe(1);
    });

    it('Error_al_regresar_se_muestra_dentro_del_modal', () => {
        abrirEnEtapa3ConAnteriores();
        spyOnProperty(component, 'esAdmin', 'get').and.returnValue(true);
        fixture.detectChanges();

        serviceMock.regresar.and.returnValue(throwError(() => ({ error: { mensaje: 'No se puede regresar esta etapa' } })));

        component.abrirModalRegresar();
        component.etapaRegresoSeleccionada = 1;
        component.motivoRegresoTexto = 'Motivo de prueba con longitud valida';
        component.confirmarRegresar();
        fixture.detectChanges();

        expect(component.modalRegresarAbierto).toBeTrue();
        expect(component.errorRegresoMsg).toBe('No se puede regresar esta etapa');
        const errorElem = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="error-regreso"]');
        expect(errorElem?.textContent).toContain('No se puede regresar esta etapa');
    });

    describe('Candado del autorizador (F1)', () => {
        it('Quien_registro_el_caso_puede_cambiar_al_autorizador', () => {
            conSesion(['Usuario'], 42); // 42 es idUsuarioRegistro
            component.detalle = { ...mockDetalle, idUsuarioRegistro: 42 };
            expect(component.puedeCambiarAutorizador).toBeTrue();
        });

        it('Otro_usuario_no_puede_aunque_no_haya_autorizador', () => {
            conSesion(['Usuario'], 88); // 88 no es idUsuarioRegistro
            component.detalle = { ...mockDetalle, idUsuarioRegistro: 42 };
            component.etapaActualDto = { ...component.etapaActualDto!, autorizaUsuarioId: null };
            expect(component.puedeCambiarAutorizador).toBeFalse();
        });

        it('El_autorizador_actual_que_no_registro_no_puede_cambiarlo', () => {
            conSesion(['Usuario'], 99); // 99 es autorizaUsuarioId actual, pero no es idUsuarioRegistro (42)
            component.detalle = { ...mockDetalle, idUsuarioRegistro: 42 };
            component.etapaActualDto = { ...component.etapaActualDto!, autorizaUsuarioId: 99 };
            expect(component.puedeCambiarAutorizador).toBeFalse();
        });

        it('Admin_siempre_puede', () => {
            conSesion(['Admin'], 88); // 88 no registró el caso pero es admin
            component.detalle = { ...mockDetalle, idUsuarioRegistro: 42 };
            expect(component.puedeCambiarAutorizador).toBeTrue();

            conSesion(['pruebas'], 88); // pruebas ya no cuenta como admin en Ingeniería
            expect(component.puedeCambiarAutorizador).toBeFalse();
        });

        it('En_solo_lectura_nadie_puede', () => {
            conSesion(['Admin'], 42);
            component.detalle = { ...mockDetalle, idUsuarioRegistro: 42 };
            spyOnProperty(component, 'esSoloLectura', 'get').and.returnValue(true);
            expect(component.puedeCambiarAutorizador).toBeFalse();
        });

        it('El_selector_ofrece_tambien_al_usuario_actual_para_designarse', () => {
            // Decisión del dueño (25-nov): quien registró el caso puede ponerse a sí mismo como autorizador
            conSesion(['Usuario'], 42);
            component.detalle = { ...mockDetalle, idUsuarioRegistro: 42 };
            component.usuariosJr = [
                { usuarioId: 10, nombre: 'Ana' },
                { usuarioId: 42, nombre: 'Usuario Actual' },
                { usuarioId: 50, nombre: 'Carlos' }
            ];
            component.etapaActualDto = { ...component.etapaActualDto!, autorizaUsuarioId: null };
            component.form.enable({ emitEvent: false });
            component.form.patchValue({ autorizaUsuarioId: null });
            fixture.detectChanges();

            const trigger = (fixture.nativeElement as HTMLElement)
                .querySelector('mat-select[formControlName="autorizaUsuarioId"] .mat-mdc-select-trigger') as HTMLElement;
            expect(trigger).withContext('selector de autorizador en pantalla').toBeTruthy();
            trigger.click();
            fixture.detectChanges();

            const opciones = Array.from(document.querySelectorAll('mat-option')).map((o) => (o.textContent || '').trim());
            expect(opciones).toContain('Usuario Actual');
            expect(opciones).toContain('Ana');
            expect(opciones).toContain('Carlos');
        });

        it('Muestra_la_ayuda_cuando_el_campo_esta_bloqueado', () => {
            conSesion(['Usuario'], 88); // no admin, no creador -> bloqueado
            component.detalle = { ...mockDetalle, idUsuarioRegistro: 42 };
            fixture.detectChanges();

            const texto = (fixture.nativeElement as HTMLElement).textContent || '';
            expect(texto).toContain('Solo quien registró el caso o un administrador puede designar al autorizador');
        });

        it('Error_403_muestra_el_mensaje_del_API', () => {
            conSesion(['Usuario'], 42);
            component.form.patchValue({
                responsableUsuarioId: 5,
                autorizaUsuarioId: 42 // intento inválido
            });
            fixture.detectChanges();

            const mensajeApi = 'No puedes designarte como autorizador: pídeselo a un administrador';
            serviceMock.guardar.and.returnValue(throwError(() => ({
                status: 403,
                error: { mensaje: mensajeApi }
            })));

            component.guardar();
            fixture.detectChanges();

            expect(component.errorMsg).toBe(mensajeApi);
            const errorDiv = (fixture.nativeElement as HTMLElement).querySelector('.bg-red-500\\/10');
            expect(errorDiv?.textContent).toContain(mensajeApi);
            expect(component.form.get('autorizaUsuarioId')?.value).toBe(42);
        });
    });
});
