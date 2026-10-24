import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NuevoCasoDialogComponent } from './nuevo-caso-dialog.component';
import { MatDialogRef } from '@angular/material/dialog';
import { CotizacionEtapasService } from '../cotizacion-etapas.service';
import { EngineeringService } from '../../engineering.service';
import { UsersService } from 'app/modules/admin/security/users/users.service';
import { SubcontratacionService } from '../../subcontratacion.service';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('NuevoCasoDialogComponent', () => {
    let component: NuevoCasoDialogComponent;
    let fixture: ComponentFixture<NuevoCasoDialogComponent>;
    let dialogRefMock: jasmine.SpyObj<MatDialogRef<NuevoCasoDialogComponent>>;
    let cotizacionServiceMock: jasmine.SpyObj<CotizacionEtapasService>;
    let engineeringServiceMock: jasmine.SpyObj<EngineeringService>;
    let usersServiceMock: jasmine.SpyObj<UsersService>;
    let subcontratacionServiceMock: jasmine.SpyObj<SubcontratacionService>;

    beforeEach(async () => {
        dialogRefMock = jasmine.createSpyObj('MatDialogRef', ['close']);
        cotizacionServiceMock = jasmine.createSpyObj('CotizacionEtapasService', ['crear']);
        engineeringServiceMock = jasmine.createSpyObj('EngineeringService', ['getSolicitantes']);
        usersServiceMock = jasmine.createSpyObj('UsersService', ['getUsers']);
        subcontratacionServiceMock = jasmine.createSpyObj('SubcontratacionService', ['getPersonal']);

        engineeringServiceMock.getSolicitantes.and.returnValue(of([
            { idSolicitante: 1, nombreCompleto: 'Juan Solicitante', empresa: 'Empresa A', activo: true }
        ]));
        usersServiceMock.getUsers.and.returnValue(of([
            { id: 10, nombre: 'Ingeniero JR' }
        ]));
        subcontratacionServiceMock.getPersonal.and.returnValue(of([
            { idPersonal: 20, idSubcontratista: 1, nombre: 'Aliado Sub', activo: true }
        ]));

        await TestBed.configureTestingModule({
            imports: [NuevoCasoDialogComponent, NoopAnimationsModule],
            providers: [
                { provide: MatDialogRef, useValue: dialogRefMock },
                { provide: CotizacionEtapasService, useValue: cotizacionServiceMock },
                { provide: EngineeringService, useValue: engineeringServiceMock },
                { provide: UsersService, useValue: usersServiceMock },
                { provide: SubcontratacionService, useValue: subcontratacionServiceMock }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(NuevoCasoDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('el formulario es invalido sin solicitante, sucursal, titulo o descripcion y no permite enviar', () => {
        component.form.patchValue({
            idSolicitante: null,
            sucursalId: null,
            titulo: '',
            descripcion: '',
            tipo: 'Construcción e instalación'
        });
        expect(component.form.valid).toBeFalse();

        component.guardar();
        expect(cotizacionServiceMock.crear).not.toHaveBeenCalled();
    });

    it('valida limites de longitud maxima de 500 caracteres en titulo y descripcion', () => {
        const textoLargo = 'a'.repeat(501);
        component.form.patchValue({
            idSolicitante: 1,
            sucursalId: 1,
            titulo: textoLargo,
            descripcion: 'Descripcion corta',
            tipo: 'Construcción e instalación'
        });
        expect(component.form.get('titulo')?.hasError('maxlength')).toBeTrue();
        expect(component.form.valid).toBeFalse();

        component.form.patchValue({
            titulo: 'Titulo valido',
            descripcion: textoLargo
        });
        expect(component.form.get('descripcion')?.hasError('maxlength')).toBeTrue();
        expect(component.form.valid).toBeFalse();
    });

    it('con datos validos llama a service.crear con payload canonico y cierra el dialogo', () => {
        cotizacionServiceMock.crear.and.returnValue(of({ idSeguimiento: 100 } as any));

        component.form.patchValue({
            idSolicitante: 1,
            sucursalId: 2,
            titulo: 'Proyecto Instalación',
            descripcion: 'Actividad descripción',
            tipo: 'Construcción e instalación',
            responsableUsuarioId: 10,
            esAliado: false
        });

        expect(component.form.valid).toBeTrue();
        component.guardar();

        expect(cotizacionServiceMock.crear).toHaveBeenCalledWith(jasmine.objectContaining({
            idSolicitante: 1,
            sucursalId: 2,
            titulo: 'Proyecto Instalación',
            descripcion: 'Actividad descripción',
            tipo: 'Construcción e instalación',
            responsableUsuarioId: 10,
            responsableAliadoId: null,
            esAliado: false
        }));
        expect(dialogRefMock.close).toHaveBeenCalledWith(jasmine.objectContaining({ idSeguimiento: 100 }));
    });
});
