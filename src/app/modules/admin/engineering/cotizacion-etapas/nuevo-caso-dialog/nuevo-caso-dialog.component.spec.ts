import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NuevoCasoDialogComponent } from './nuevo-caso-dialog.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { CotizacionEtapasService } from '../cotizacion-etapas.service';
import { EngineeringService } from '../../engineering.service';
import { UsersService } from 'app/modules/admin/security/users/users.service';
import { SubcontratacionService } from '../../subcontratacion.service';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { SolicitanteDialogComponent } from '../../solicitantes/solicitante-dialog/solicitante-dialog.component';

describe('NuevoCasoDialogComponent', () => {
    let component: NuevoCasoDialogComponent;
    let fixture: ComponentFixture<NuevoCasoDialogComponent>;
    let dialogRefMock: jasmine.SpyObj<MatDialogRef<NuevoCasoDialogComponent>>;
    let cotizacionServiceMock: jasmine.SpyObj<CotizacionEtapasService>;
    let engineeringServiceMock: jasmine.SpyObj<EngineeringService>;
    let usersServiceMock: jasmine.SpyObj<UsersService>;
    let subcontratacionServiceMock: jasmine.SpyObj<SubcontratacionService>;
    let matDialogMock: jasmine.SpyObj<MatDialog>;
    let subDialogRefMock: jasmine.SpyObj<MatDialogRef<any>>;

    beforeEach(async () => {
        dialogRefMock = jasmine.createSpyObj('MatDialogRef', ['close']);
        cotizacionServiceMock = jasmine.createSpyObj('CotizacionEtapasService', ['crear']);
        engineeringServiceMock = jasmine.createSpyObj('EngineeringService', ['getSolicitantes', 'saveSolicitante']);
        usersServiceMock = jasmine.createSpyObj('UsersService', ['getUsers']);
        subcontratacionServiceMock = jasmine.createSpyObj('SubcontratacionService', ['getPersonal']);
        matDialogMock = jasmine.createSpyObj('MatDialog', ['open']);
        subDialogRefMock = jasmine.createSpyObj('MatDialogRef', ['afterClosed', 'close']);

        matDialogMock.open.and.returnValue(subDialogRefMock);
        subDialogRefMock.afterClosed.and.returnValue(of(undefined));

        engineeringServiceMock.getSolicitantes.and.returnValue(of([
            { idSolicitante: 1, nombreCompleto: 'Juan Solicitante', empresa: 'Empresa A', activo: true }
        ]));
        engineeringServiceMock.saveSolicitante.and.returnValue(of({
            success: true,
            message: 'Solicitante guardado correctamente.',
            idSolicitante: 15
        }));
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
                { provide: SubcontratacionService, useValue: subcontratacionServiceMock },
                { provide: MatDialog, useValue: matDialogMock }
            ]
        }).overrideComponent(NuevoCasoDialogComponent, {
            set: {
                providers: [
                    { provide: MatDialog, useValue: matDialogMock }
                ]
            }
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

    it('Boton_agregar_solicitante_visible_junto_al_selector', () => {
        const btn = fixture.debugElement.query(By.css('[data-testid="btn-agregar-solicitante"]'));
        expect(btn).toBeTruthy();
        const icon = btn.query(By.css('mat-icon'));
        expect(icon).toBeTruthy();
        expect(icon.nativeElement.textContent.trim()).toBe('person_add');
        expect(btn.attributes['matTooltip'] || btn.nativeElement.getAttribute('mattooltip') || btn.attributes['mattooltip']).toBe('Agregar nuevo solicitante');
    });

    it('Cancelar_el_dialogo_no_llama_al_API', () => {
        subDialogRefMock.afterClosed.and.returnValue(of(undefined));
        component.agregarSolicitante();
        expect(matDialogMock.open).toHaveBeenCalledWith(SolicitanteDialogComponent, {
            width: '100%',
            maxWidth: '500px',
            autoFocus: false
        });
        expect(engineeringServiceMock.saveSolicitante).not.toHaveBeenCalled();
        expect(component.creandoSolicitante).toBeFalse();
    });

    it('Al_guardar_crea_con_id_0_recarga_y_selecciona_el_nuevo', () => {
        const nuevoDatos = {
            idSolicitante: 0,
            nombreCompleto: 'Carlos Ramirez',
            celular: '1234567890',
            empresa: 'Empresa Test',
            area: 'Mantenimiento'
        };
        subDialogRefMock.afterClosed.and.returnValue(of(nuevoDatos));
        engineeringServiceMock.saveSolicitante.and.returnValue(of({
            success: true,
            message: 'Solicitante guardado correctamente.',
            idSolicitante: 15
        }));
        engineeringServiceMock.getSolicitantes.and.returnValue(of([
            { idSolicitante: 1, nombreCompleto: 'Juan Solicitante', empresa: 'Empresa A', activo: true },
            { idSolicitante: 15, nombreCompleto: 'CARLOS RAMIREZ', empresa: 'EMPRESA TEST', activo: true }
        ]));

        expect(engineeringServiceMock.getSolicitantes).toHaveBeenCalledTimes(1);

        component.agregarSolicitante();

        expect(engineeringServiceMock.saveSolicitante).toHaveBeenCalledWith(jasmine.objectContaining({
            idSolicitante: 0,
            nombreCompleto: 'Carlos Ramirez',
            empresa: 'Empresa Test',
            activo: true
        }));
        expect(engineeringServiceMock.getSolicitantes).toHaveBeenCalledTimes(2);
        expect(component.form.get('idSolicitante')?.value).toBe(15);
        expect(component.form.get('idSolicitante')?.touched).toBeTrue();
        expect(component.creandoSolicitante).toBeFalse();
    });

    it('Si_falla_la_recarga_agrega_el_nuevo_en_mayusculas_y_lo_selecciona', () => {
        const nuevoDatos = {
            idSolicitante: 0,
            nombreCompleto: '  mario lopez  ',
            celular: '4421112233',
            empresa: '  industrias acme  ',
            area: 'planta 2'
        };
        subDialogRefMock.afterClosed.and.returnValue(of(nuevoDatos));
        engineeringServiceMock.saveSolicitante.and.returnValue(of({
            success: true,
            message: 'Solicitante guardado correctamente.',
            idSolicitante: 42
        }));
        engineeringServiceMock.getSolicitantes.and.returnValue(throwError(() => new Error('Error al recargar')));

        component.agregarSolicitante();

        const agregado = component.solicitantes.find((s) => s.idSolicitante === 42);
        expect(agregado).toBeTruthy();
        expect(agregado?.nombreCompleto).toBe('MARIO LOPEZ');
        expect(agregado?.empresa).toBe('INDUSTRIAS ACME');
        expect(agregado?.celular).toBe('4421112233');
        expect(agregado?.area).toBe('planta 2');
        expect(agregado?.activo).toBeTrue();

        expect(component.form.get('idSolicitante')?.value).toBe(42);
        expect(component.form.get('idSolicitante')?.touched).toBeTrue();
        expect(component.creandoSolicitante).toBeFalse();
    });

    it('Error_al_crear_muestra_mensaje_fijo_sin_texto_del_API', () => {
        subDialogRefMock.afterClosed.and.returnValue(of({
            idSolicitante: 0,
            nombreCompleto: 'Error Solicitante',
            empresa: 'Empresa Error'
        }));
        const detalleTecnico = 'detalle técnico de base de datos o servidor';
        engineeringServiceMock.saveSolicitante.and.returnValue(throwError(() => ({
            status: 500,
            error: { message: `Error al guardar solicitante: ${detalleTecnico}` }
        })));

        component.agregarSolicitante();
        fixture.detectChanges();

        expect(component.errorMsg).toBe('No se pudo crear el solicitante.');
        expect(component.errorMsg).not.toContain(detalleTecnico);

        const errorDiv = fixture.debugElement.query(By.css('.bg-red-500\\/10'));
        expect(errorDiv).toBeTruthy();
        expect(errorDiv.nativeElement.textContent).toContain('No se pudo crear el solicitante.');
        expect(errorDiv.nativeElement.textContent).not.toContain(detalleTecnico);

        expect(component.creandoSolicitante).toBeFalse();
        expect(component.form.get('idSolicitante')?.value).toBeNull();
    });

    it('Boton_deshabilitado_mientras_se_crea', () => {
        const btnDebug = fixture.debugElement.query(By.css('[data-testid="btn-agregar-solicitante"]'));
        expect(btnDebug).toBeTruthy();
        expect(btnDebug.nativeElement.disabled).toBeFalse();

        component.creandoSolicitante = true;
        fixture.detectChanges();
        expect(btnDebug.nativeElement.disabled).toBeTrue();

        component.creandoSolicitante = false;
        component.guardando = true;
        fixture.detectChanges();
        expect(btnDebug.nativeElement.disabled).toBeTrue();

        component.guardando = false;
        fixture.detectChanges();
        expect(btnDebug.nativeElement.disabled).toBeFalse();
    });
});
