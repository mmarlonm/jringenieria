import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EtapaDetalleDialogComponent } from './etapa-detalle-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CotizacionEtapasService } from '../cotizacion-etapas.service';
import { EngineeringService } from '../../engineering.service';
import { UsersService } from 'app/modules/admin/security/users/users.service';
import { SubcontratacionService } from '../../subcontratacion.service';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CotizacionEtapasDetalleDto, ESTATUS_ETAPA } from '../cotizacion-etapas.models';

describe('EtapaDetalleDialogComponent', () => {
    let component: EtapaDetalleDialogComponent;
    let fixture: ComponentFixture<EtapaDetalleDialogComponent>;
    let serviceMock: jasmine.SpyObj<CotizacionEtapasService>;
    let engineeringMock: jasmine.SpyObj<EngineeringService>;
    let usersMock: jasmine.SpyObj<UsersService>;
    let subcontratacionMock: jasmine.SpyObj<SubcontratacionService>;
    let dialogRefMock: jasmine.SpyObj<MatDialogRef<EtapaDetalleDialogComponent>>;

    const mockDetalle: CotizacionEtapasDetalleDto = {
        idSeguimiento: 10,
        idSolicitante: 1,
        solicitanteNombre: 'Cliente Corp',
        solicitanteEmpresa: 'Empresa SA',
        actividad: 'Actividad descripción',
        tituloProyecto: 'Proyecto Prueba',
        tipo: 'PROYECTO',
        etapaActual: 1,
        cancelado: false,
        etapas: [
            {
                idEtapa: 101,
                idSeguimiento: 10,
                etapa: 1,
                estatus: ESTATUS_ETAPA.EnProceso,
                esAliado: false,
                autorizadorDesignadoUsuarioId: 99, // Otro usuario
                revisiones: [
                    {
                        idRevision: 1,
                        idEtapa: 101,
                        numero: 1,
                        resultado: ESTATUS_ETAPA.EnProceso,
                        historica: false,
                        fechaCreacion: new Date().toISOString()
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
        engineeringMock = jasmine.createSpyObj('EngineeringService', ['descargarArchivoEjecucion']);
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
                { provide: EngineeringService, useValue: engineeringMock },
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
        expect(component.etapaActualDto?.idEtapa).toBe(101);
    });

    it('con autorizador designado distinto al usuario actual, puedeAutorizarAccion es false', () => {
        expect(component.puedeAutorizarAccion).toBeFalse();
    });

    it('con revision 2 y sin queCambio el guardado debe estar deshabilitado', () => {
        component.etapaActualDto = {
            ...mockDetalle.etapas[0],
            revisiones: [
                {
                    idRevision: 1,
                    idEtapa: 101,
                    numero: 1,
                    resultado: ESTATUS_ETAPA.Rechazada,
                    historica: false,
                    fechaCreacion: new Date().toISOString()
                },
                {
                    idRevision: 2,
                    idEtapa: 101,
                    numero: 2,
                    resultado: ESTATUS_ETAPA.EnProceso,
                    queCambio: null,
                    historica: false,
                    fechaCreacion: new Date().toISOString()
                }
            ]
        };
        component.form.patchValue({ queCambioUltimaRevision: '' });

        expect(component.puedeGuardarRevision()).toBeFalse();

        component.form.patchValue({ queCambioUltimaRevision: 'Se ajustaron las especificaciones técnicas' });
        expect(component.puedeGuardarRevision()).toBeTrue();
    });

    it('iniciar revision solo debe estar disponible cuando la ultima revision esta Rechazada', () => {
        // En progreso: no disponible
        expect(component.puedeIniciarRevision()).toBeFalse();

        // Ultima rechazada: disponible
        component.etapaActualDto = {
            ...mockDetalle.etapas[0],
            revisiones: [
                {
                    idRevision: 1,
                    idEtapa: 101,
                    numero: 1,
                    resultado: ESTATUS_ETAPA.Rechazada,
                    historica: false,
                    fechaCreacion: new Date().toISOString()
                }
            ]
        };

        expect(component.puedeIniciarRevision()).toBeTrue();
    });
});
