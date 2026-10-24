import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EtapaDetalleDialogComponent } from './etapa-detalle-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CotizacionEtapasService } from '../cotizacion-etapas.service';
import { UsersService } from 'app/modules/admin/security/users/users.service';
import { SubcontratacionService } from '../../subcontratacion.service';
import { of } from 'rxjs';
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
                return JSON.stringify({ usuario: { id: 42, rol: 'USUARIO' } });
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
