import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EtapaListaComponent } from './etapa-lista.component';
import { CotizacionEtapasService } from '../cotizacion-etapas.service';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CotizacionEtapasListItemDto } from '../cotizacion-etapas.models';

describe('EtapaListaComponent', () => {
    let component: EtapaListaComponent;
    let fixture: ComponentFixture<EtapaListaComponent>;
    let serviceMock: jasmine.SpyObj<CotizacionEtapasService>;
    let dialogMock: jasmine.SpyObj<MatDialog>;

    const mockProyectos: CotizacionEtapasListItemDto[] = [
        {
            idSeguimiento: 1,
            titulo: 'Fibra Óptica Central',
            solicitanteNombre: 'Carlos Slim',
            empresa: 'América Móvil',
            tipo: 'PROYECTO',
            sucursalId: 1,
            etapaActual: 1,
            estatusEtapa: 2,
            revisionActual: 1,
            responsableNombre: 'Juan Pérez',
            monto: 150000,
            fechaRegistro: '2026-10-24T10:00:00Z',
            cancelado: false
        },
        {
            idSeguimiento: 2,
            titulo: 'Panadería Industrial',
            solicitanteNombre: 'Ana Lopez',
            empresa: 'Bimbo',
            tipo: 'INDUSTRIAL',
            sucursalId: 2,
            etapaActual: 1,
            estatusEtapa: 1,
            revisionActual: 1,
            responsableNombre: 'Pedro Gómez',
            monto: null,
            fechaRegistro: '2026-10-24T11:00:00Z',
            cancelado: false
        }
    ];

    function setup(etapaNumber: number) {
        serviceMock = jasmine.createSpyObj('CotizacionEtapasService', ['listar', 'obtener']);
        dialogMock = jasmine.createSpyObj('MatDialog', ['open']);

        serviceMock.listar.and.returnValue(of(mockProyectos));

        TestBed.configureTestingModule({
            imports: [EtapaListaComponent, NoopAnimationsModule],
            providers: [
                { provide: CotizacionEtapasService, useValue: serviceMock },
                { provide: MatDialog, useValue: dialogMock },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            data: { etapa: etapaNumber }
                        }
                    }
                }
            ]
        });

        fixture = TestBed.createComponent(EtapaListaComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    it('en etapa 1 debe llamar a listar(1, false) y mostrar boton nuevo caso', () => {
        setup(1);
        expect(component.etapaNumero).toBe(1);
        expect(serviceMock.listar).toHaveBeenCalledWith(1, false);
        expect(component.etapaConfig?.permiteCrear).toBeTrue();
    });

    it('en etapa 2 no debe permitir crear nuevo caso', () => {
        setup(2);
        expect(component.etapaNumero).toBe(2);
        expect(serviceMock.listar).toHaveBeenCalledWith(2, false);
        expect(component.etapaConfig?.permiteCrear).toBeFalse();
    });

    it('debe filtrar los elementos por texto en solicitante, empresa o titulo', () => {
        setup(1);
        expect(component.dataSource.filteredData.length).toBe(2);

        component.aplicarFiltro('Bimbo');
        expect(component.dataSource.filteredData.length).toBe(1);
        expect(component.dataSource.filteredData[0].empresa).toBe('Bimbo');

        component.aplicarFiltro('Fibra');
        expect(component.dataSource.filteredData.length).toBe(1);
        expect(component.dataSource.filteredData[0].titulo).toBe('Fibra Óptica Central');
    });

    it('al marcar incluirProcesados debe volver a listar con flag true', () => {
        setup(1);
        component.incluirProcesados = true;
        component.cambiarIncluirProcesados();
        expect(serviceMock.listar).toHaveBeenCalledWith(1, true);
    });

    it('con un elemento con la forma real debe mostrar el título y el badge correcto en la vista', () => {
        setup(1);
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('Fibra Óptica Central');
        expect(compiled.textContent).toContain('América Móvil');
        expect(compiled.textContent).toContain('En Proceso');
    });
});
