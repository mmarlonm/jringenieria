import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EtapaListaComponent } from './etapa-lista.component';
import { CotizacionEtapasService } from '../cotizacion-etapas.service';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { of, Subject } from 'rxjs';
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

    it('La_lista_muestra_Pendiente_del_cliente_para_el_estatus_6', () => {
        setup(5);
        const badge = component.getEstatusBadge(6);
        expect(badge.texto).toBe('Pendiente del cliente');
        expect(badge.clases).toContain('text-purple-800');
    });

    // ───── Un clic abre un solo diálogo (antes se apilaban dos) ─────

    function dialogoQueSeCierraCuando(): Subject<unknown> {
        const alCerrar = new Subject<unknown>();
        dialogMock.open.and.returnValue({ afterClosed: () => alCerrar.asObservable() } as any);
        return alCerrar;
    }

    it('un clic en el icono «Abrir expediente» abre un solo diálogo', () => {
        setup(2);
        dialogoQueSeCierraCuando();

        const icono = (fixture.nativeElement as HTMLElement).querySelector('td.mat-column-acciones button') as HTMLButtonElement;
        icono.click();

        expect(dialogMock.open).toHaveBeenCalledTimes(1);
    });

    it('un clic en la fila abre el expediente', () => {
        setup(2);
        dialogoQueSeCierraCuando();

        const celda = (fixture.nativeElement as HTMLElement).querySelector('td.mat-column-idSeguimiento') as HTMLElement;
        celda.click();

        expect(dialogMock.open).toHaveBeenCalledTimes(1);
    });

    it('mientras hay un expediente abierto no se abre otro, y al cerrarse se puede abrir de nuevo', () => {
        setup(2);
        const alCerrar = dialogoQueSeCierraCuando();

        component.abrirDetalle(1);
        component.abrirDetalle(1);
        expect(dialogMock.open).toHaveBeenCalledTimes(1);

        alCerrar.next(false);
        component.abrirDetalle(2);
        expect(dialogMock.open).toHaveBeenCalledTimes(2);
    });

    it('mientras hay un «Nuevo caso» abierto no se abre otro', () => {
        setup(1);
        const alCerrar = dialogoQueSeCierraCuando();

        component.abrirNuevoCaso();
        component.abrirNuevoCaso();
        expect(dialogMock.open).toHaveBeenCalledTimes(1);

        alCerrar.next(undefined);
        component.abrirNuevoCaso();
        expect(dialogMock.open).toHaveBeenCalledTimes(2);
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

    describe('KPIs por estatus (F2)', () => {
        const mockCasosKpis: CotizacionEtapasListItemDto[] = [
            { idSeguimiento: 1, titulo: 'C1', solicitanteNombre: 'A', empresa: 'E', tipo: 'P', etapaActual: 1, estatusEtapa: 1, revisionActual: 1, fechaRegistro: '2026-11-01', cancelado: false },
            { idSeguimiento: 2, titulo: 'C2', solicitanteNombre: 'B', empresa: 'E', tipo: 'P', etapaActual: 1, estatusEtapa: 2, revisionActual: 1, fechaRegistro: '2026-11-02', cancelado: false },
            { idSeguimiento: 3, titulo: 'C3', solicitanteNombre: 'C', empresa: 'E', tipo: 'P', etapaActual: 1, estatusEtapa: 3, revisionActual: 1, fechaRegistro: '2026-11-03', cancelado: false },
            { idSeguimiento: 4, titulo: 'C4', solicitanteNombre: 'D', empresa: 'E', tipo: 'P', etapaActual: 1, estatusEtapa: 4, revisionActual: 1, fechaRegistro: '2026-11-04', cancelado: false },
            { idSeguimiento: 5, titulo: 'C5', solicitanteNombre: 'E', empresa: 'E', tipo: 'P', etapaActual: 1, estatusEtapa: 5, revisionActual: 1, fechaRegistro: '2026-11-05', cancelado: false },
            { idSeguimiento: 6, titulo: 'C6', solicitanteNombre: 'F', empresa: 'E', tipo: 'P', etapaActual: 5, estatusEtapa: 6, revisionActual: 1, fechaRegistro: '2026-11-06', cancelado: false },
            { idSeguimiento: 7, titulo: 'C7', solicitanteNombre: 'G', empresa: 'E', tipo: 'P', etapaActual: 1, estatusEtapa: 1, revisionActual: 1, fechaRegistro: '2026-11-07', cancelado: true }
        ];

        function setupConCasos(etapaNumber: number, casos: CotizacionEtapasListItemDto[] = mockCasosKpis) {
            serviceMock = jasmine.createSpyObj('CotizacionEtapasService', ['listar', 'obtener']);
            dialogMock = jasmine.createSpyObj('MatDialog', ['open']);
            serviceMock.listar.and.returnValue(of(casos));

            TestBed.configureTestingModule({
                imports: [EtapaListaComponent, NoopAnimationsModule],
                providers: [
                    { provide: CotizacionEtapasService, useValue: serviceMock },
                    { provide: MatDialog, useValue: dialogMock },
                    {
                        provide: ActivatedRoute,
                        useValue: { snapshot: { data: { etapa: etapaNumber } } }
                    }
                ]
            });

            fixture = TestBed.createComponent(EtapaListaComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
        }

        it('Muestra_tarjetas_de_KPIs_con_los_conteos_correctos', () => {
            setupConCasos(5);
            expect(component.kpiTotal).toBe(7);
            expect(component.kpiPendiente).toBe(1);
            expect(component.kpiEnProceso).toBe(1);
            expect(component.kpiAutorizada).toBe(1);
            expect(component.kpiRechazada).toBe(1);
            expect(component.kpiNoAplica).toBe(1);
            expect(component.kpiAutorizadaInterna).toBe(1);
            expect(component.kpiCancelados).toBe(1);

            const compiled = fixture.nativeElement as HTMLElement;
            expect(compiled.querySelector('[data-testid="kpi-total-valor"]')?.textContent?.trim()).toBe('7');
            expect(compiled.querySelector('[data-testid="kpi-pendiente-valor"]')?.textContent?.trim()).toBe('1');
            expect(compiled.querySelector('[data-testid="kpi-cancelados-valor"]')?.textContent?.trim()).toBe('1');
        });

        it('En_etapa_1_no_muestra_tarjeta_Autorizada_interna', () => {
            setupConCasos(1);
            const compiled = fixture.nativeElement as HTMLElement;
            expect(compiled.querySelector('[data-testid="kpi-autorizada-interna"]')).toBeNull();
        });

        it('En_etapa_5_muestra_tarjeta_Autorizada_interna', () => {
            setupConCasos(5);
            const compiled = fixture.nativeElement as HTMLElement;
            expect(compiled.querySelector('[data-testid="kpi-autorizada-interna"]')).not.toBeNull();
            expect(compiled.querySelector('[data-testid="kpi-autorizada-interna-valor"]')?.textContent?.trim()).toBe('1');
        });

        it('Clic_en_tarjeta_filtra_la_tabla_y_otro_clic_lo_quita', () => {
            setupConCasos(1);
            expect(component.dataSource.data.length).toBe(7);

            // Clic en Pendiente
            const kpiPendiente = fixture.nativeElement.querySelector('[data-testid="kpi-pendiente"]') as HTMLElement;
            kpiPendiente.click();
            fixture.detectChanges();

            expect(component.filtroEstatusKpi).toBe('PENDIENTE');
            expect(component.dataSource.data.length).toBe(1);
            expect(component.dataSource.data[0].idSeguimiento).toBe(1);

            // Otro clic lo quita
            kpiPendiente.click();
            fixture.detectChanges();

            expect(component.filtroEstatusKpi).toBeNull();
            expect(component.dataSource.data.length).toBe(7);
        });

        it('Clic_en_Cancelados_filtra_los_cancelados', () => {
            setupConCasos(1);
            const kpiCancelados = fixture.nativeElement.querySelector('[data-testid="kpi-cancelados"]') as HTMLElement;
            kpiCancelados.click();
            fixture.detectChanges();

            expect(component.filtroEstatusKpi).toBe('CANCELADOS');
            expect(component.dataSource.data.length).toBe(1);
            expect(component.dataSource.data[0].idSeguimiento).toBe(7);
            expect(component.dataSource.data[0].cancelado).toBeTrue();
        });

        it('Clic_en_Total_quita_cualquier_filtro', () => {
            setupConCasos(1);
            component.seleccionarFiltroKpi('EN_PROCESO');
            expect(component.dataSource.data.length).toBe(1);

            const kpiTotal = fixture.nativeElement.querySelector('[data-testid="kpi-total"]') as HTMLElement;
            kpiTotal.click();
            fixture.detectChanges();

            expect(component.filtroEstatusKpi).toBeNull();
            expect(component.dataSource.data.length).toBe(7);
        });

        it('Recargar_con_incluirProcesados_actualiza_los_conteos', () => {
            setupConCasos(1, [mockCasosKpis[0]]);
            expect(component.kpiTotal).toBe(1);

            serviceMock.listar.and.returnValue(of(mockCasosKpis));
            component.incluirProcesados = true;
            component.cambiarIncluirProcesados();
            fixture.detectChanges();

            expect(serviceMock.listar).toHaveBeenCalledWith(1, true);
            expect(component.kpiTotal).toBe(7);
        });

        it('Lista_de_etapa_muestra_chip_En_cambio', () => {
            setup(1);
            component.dataSource.data = [
                {
                    ...mockProyectos[0],
                    enCambioIngenieria: true
                }
            ];
            fixture.detectChanges();

            const chip = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="chip-en-cambio"]');
            expect(chip).not.toBeNull();
            expect(chip?.textContent?.trim()).toBe('En cambio');
        });
    });
});
