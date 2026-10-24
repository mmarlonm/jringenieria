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
            etapaActual: 1,
            idSolicitante: 1,
            solicitanteNombre: 'Carlos Slim',
            solicitanteEmpresa: 'América Móvil',
            actividad: 'Instalación de fibra',
            tituloProyecto: 'Fibra Óptica Central',
            tipo: 'PROYECTO',
            estatusEtapaActual: 2,
            revisionActualNumero: 1,
            esAliado: false,
            cancelado: false
        },
        {
            idSeguimiento: 2,
            etapaActual: 1,
            idSolicitante: 2,
            solicitanteNombre: 'Ana Lopez',
            solicitanteEmpresa: 'Bimbo',
            actividad: 'Línea de producción',
            tituloProyecto: 'Panadería Industrial',
            tipo: 'INDUSTRIAL',
            estatusEtapaActual: 1,
            revisionActualNumero: 1,
            esAliado: false,
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
        expect(component.dataSource.filteredData[0].solicitanteEmpresa).toBe('Bimbo');

        component.aplicarFiltro('Fibra');
        expect(component.dataSource.filteredData.length).toBe(1);
        expect(component.dataSource.filteredData[0].tituloProyecto).toBe('Fibra Óptica Central');
    });

    it('al marcar incluirProcesados debe volver a listar con flag true', () => {
        setup(1);
        component.incluirProcesados = true;
        component.cambiarIncluirProcesados();
        expect(serviceMock.listar).toHaveBeenCalledWith(1, true);
    });
});
