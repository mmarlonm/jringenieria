import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MinutasService } from './minutas.service';
import { MinutaDialogComponent } from './minuta-dialog.component';
import { MinutaCatalogos } from './minutas.types';

describe('MinutaDialogComponent', () => {
    let fixture: ComponentFixture<MinutaDialogComponent>;
    let component: MinutaDialogComponent;
    let minutasServiceMock: jasmine.SpyObj<MinutasService>;
    let dialogRefMock: jasmine.SpyObj<MatDialogRef<MinutaDialogComponent>>;

    const catalogosMock: MinutaCatalogos = {
        sucursales: [
            { sucursalId: 1, nombre: 'Puebla' },
            { sucursalId: 2, nombre: 'Querétaro' }
        ],
        usuarios: [
            { usuarioId: 10, nombre: 'Usuario Prueba' }
        ],
        areas: [
            { clave: 'COM', nombre: 'Ventas / Comercial' },
            { clave: 'CMP', nombre: 'Compras' }
        ]
    };

    function configurar(data: any): void {
        minutasServiceMock = jasmine.createSpyObj('MinutasService', ['crear', 'actualizar', 'obtenerCatalogos']);
        minutasServiceMock.obtenerCatalogos.and.returnValue(of(catalogosMock));
        minutasServiceMock.crear.and.returnValue(of({} as any));
        minutasServiceMock.actualizar.and.returnValue(of({} as any));
        dialogRefMock = jasmine.createSpyObj('MatDialogRef', ['close']);

        TestBed.configureTestingModule({
            imports: [MinutaDialogComponent, NoopAnimationsModule, MatIconTestingModule],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: data },
                { provide: MatDialogRef, useValue: dialogRefMock },
                { provide: MinutasService, useValue: minutasServiceMock }
            ]
        });

        fixture = TestBed.createComponent(MinutaDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    it('debe tener COM como Ventas / Comercial y CMP como Compras en areasDisponibles', () => {
        configurar({ catalogos: catalogosMock });

        const comArea = component.areasDisponibles.find(a => a.clave === 'COM');
        expect(comArea).toBeDefined();
        expect(comArea?.nombre).toContain('Ventas / Comercial');

        const cmpArea = component.areasDisponibles.find(a => a.clave === 'CMP');
        expect(cmpArea).toBeDefined();
        expect(cmpArea?.nombre).toBe('Compras');
    });

    it('al seleccionar el area COM el titulo sugerido inicia con MIN-COM-', () => {
        configurar({ catalogos: catalogosMock });

        component.form.get('area')?.setValue('COM');
        component.onAreaChange('COM');
        fixture.detectChanges();

        expect(component.tituloSugerido).toMatch(/^MIN-COM-\d{6}$/);
    });

    it('al editar una minuta con area legacy VEN se mapea automaticamente a COM', () => {
        const minutaLegacy: any = {
            minutaId: 101,
            titulo: 'MIN-VEN-191126',
            area: 'VEN',
            sucursalId: null,
            fechaReunion: '2026-11-19T00:00:00',
            esPublica: true
        };

        configurar({ minuta: minutaLegacy, catalogos: catalogosMock });

        expect(component.form.get('area')?.value).toBe('COM');
    });

    it('permite seleccionar Todas las sucursales (sucursalId 0) y muestra Todas las sucursales', () => {
        configurar({ catalogos: catalogosMock });

        component.form.get('sucursalId')?.setValue(0);
        fixture.detectChanges();

        expect(component.form.get('sucursalId')?.value).toBe(0);
        expect(component.obtenerNombreSucursal(0)).toBe('Todas las sucursales');
        expect(component.compareSucursal(0, 0)).toBeTrue();
        expect(component.compareSucursal(0, null)).toBeTrue();
    });

    it('al guardar con Todas las sucursales envia sucursalId 0 al backend', () => {
        configurar({ catalogos: catalogosMock });

        component.form.patchValue({
            area: 'COM',
            titulo: 'MIN-COM-191126',
            sucursalId: null,
            fechaReunion: '2026-11-19',
            esPublica: true
        });

        const file = new File(['dummy content'], 'minuta.pdf', { type: 'application/pdf' });
        component.archivoSeleccionado = file;

        component.guardar();

        expect(minutasServiceMock.crear).toHaveBeenCalled();
        const formData: FormData = minutasServiceMock.crear.calls.mostRecent().args[0];
        expect(formData.get('sucursalId')).toBe('0');
        expect(formData.get('area')).toBe('COM');
    });
});
