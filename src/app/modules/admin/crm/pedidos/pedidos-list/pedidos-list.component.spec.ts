import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { PedidosListComponent } from './pedidos-list.component';
import { PedidosService } from '../pedidos.service';
import { PedidoKpis, PedidoListaRespuesta, PedidoResumen } from '../pedidos.types';
import { defaultNavigation } from 'app/mock-api/common/navigation/data';
import pedidosRoutes from '../pedidos.routes';

describe('PedidosListComponent (F1)', () => {
    let component: PedidosListComponent;
    let fixture: ComponentFixture<PedidosListComponent>;
    let pedidosServiceSpy: jasmine.SpyObj<PedidosService>;
    let routerSpy: jasmine.SpyObj<Router>;

    const mockPedidos: PedidoResumen[] = [
        {
            id: 1,
            folio: 'PED-2026-0001',
            estatus: 'Recibido',
            tipo: 'CS',
            tipoServicio: 'Suministro',
            prioridad: 'Media',
            clienteNombre: 'Cliente Prueba 1',
            unidadId: 1,
            sucursalNombre: 'Matriz',
            moneda: 'MXN',
            montoPedido: 150000,
            responsableUsuarioId: 10,
            responsableNombre: 'Juan Perez',
            cotizacionProductosId: 100,
            cotizacionFolio: 'COT-2026-0001',
            requerimientoId: 50,
            requerimientoFolio: 'REQ-2026-0001',
            numeroOC: 'OC-12345',
            fechaRegistro: '2026-11-27T10:00:00Z',
            alertas: ['Sin respaldo documental']
        },
        {
            id: 2,
            folio: 'PED-2026-0002',
            estatus: 'Liberado',
            tipo: 'CT',
            tipoServicio: 'Proyecto',
            prioridad: 'Alta',
            clienteNombre: 'Cliente Prueba 2',
            unidadId: 2,
            sucursalNombre: 'Norte',
            moneda: 'USD',
            montoPedido: 25000,
            responsableUsuarioId: 11,
            responsableNombre: 'Maria Lopez',
            cotizacionProductosId: 101,
            cotizacionFolio: 'COT-2026-0002',
            requerimientoId: null,
            requerimientoFolio: null,
            numeroOC: null,
            fechaRegistro: '2026-11-27T11:00:00Z',
            alertas: []
        }
    ];

    const mockKpis: PedidoKpis = {
        total: 2,
        porEstatus: [
            {
                estatus: 'Recibido',
                cantidad: 1,
                importes: [{ moneda: 'MXN', importe: 150000 }]
            },
            {
                estatus: 'Liberado',
                cantidad: 1,
                importes: [{ moneda: 'USD', importe: 25000 }]
            }
        ],
        porResponsable: [
            {
                usuarioId: 10,
                nombre: 'Juan Perez',
                cantidad: 1,
                importes: [{ moneda: 'MXN', importe: 150000 }]
            },
            {
                usuarioId: 11,
                nombre: 'Maria Lopez',
                cantidad: 1,
                importes: [{ moneda: 'USD', importe: 25000 }]
            }
        ],
        porSucursal: [
            {
                unidadId: 1,
                nombre: 'Matriz',
                cantidad: 1,
                importes: [{ moneda: 'MXN', importe: 150000 }]
            },
            {
                unidadId: 2,
                nombre: 'Norte',
                cantidad: 1,
                importes: [{ moneda: 'USD', importe: 25000 }]
            }
        ]
    };

    beforeEach(async () => {
        pedidosServiceSpy = jasmine.createSpyObj('PedidosService', [
            'obtenerCatalogos',
            'listar',
            'obtenerKpis',
            'exportarExcel'
        ]);
        routerSpy = jasmine.createSpyObj('Router', ['navigate']);

        pedidosServiceSpy.obtenerCatalogos.and.returnValue(
            of({
                estatus: [{ codigo: 'Recibido', nombre: 'Recibido' }],
                tipos: [{ codigo: 'CS', nombre: 'Pedido simple' }],
                tiposServicio: [{ codigo: 'Suministro', nombre: 'Logística / Almacén', area: 'Logística' }],
                prioridades: [{ codigo: 'Media', nombre: 'Media' }],
                tiposArchivo: [],
                areasValidacion: [],
                puntosVerificacion: [],
                estatusFacturacion: [],
                tiposBitacora: []
            })
        );
        pedidosServiceSpy.listar.and.returnValue(
            of<PedidoListaRespuesta>({
                total: 2,
                items: mockPedidos
            })
        );
        pedidosServiceSpy.obtenerKpis.and.returnValue(of<PedidoKpis>(mockKpis));

        await TestBed.configureTestingModule({
            imports: [PedidosListComponent, NoopAnimationsModule],
            providers: [
                { provide: PedidosService, useValue: pedidosServiceSpy },
                { provide: Router, useValue: routerSpy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(PedidosListComponent);
        component = fixture.componentInstance;
    });

    it('Filtros_de_fecha_por_omision_del_mes', () => {
        component.ngOnInit();
        const now = new Date();
        const anio = now.getFullYear();
        const mes = String(now.getMonth() + 1).padStart(2, '0');
        const ultimoDia = new Date(anio, now.getMonth() + 1, 0).getDate();

        expect(component.filtros.desde).toBe(`${anio}-${mes}-01`);
        expect(component.filtros.hasta).toBe(`${anio}-${mes}-${String(ultimoDia).padStart(2, '0')}`);
    });

    it('Lista_pide_pagina_y_filtros_al_API', fakeAsync(() => {
        component.ngOnInit();
        tick();

        expect(pedidosServiceSpy.listar).toHaveBeenCalledWith(
            jasmine.objectContaining({
                page: 1,
                size: 25,
                desde: component.filtros.desde,
                hasta: component.filtros.hasta
            })
        );
        expect(component.items.length).toBe(2);
        expect(component.total).toBe(2);

        // Cambiar página
        component.cambiarPagina({ pageIndex: 1, pageSize: 50, length: 100 });
        expect(pedidosServiceSpy.listar).toHaveBeenCalledWith(
            jasmine.objectContaining({
                page: 2,
                size: 50
            })
        );
    }));

    it('Kpis_por_estatus_vendedor_y_sucursal', fakeAsync(() => {
        component.ngOnInit();
        tick();

        expect(pedidosServiceSpy.obtenerKpis).toHaveBeenCalled();
        expect(component.kpis).toBeDefined();
        expect(component.kpis?.total).toBe(2);
        expect(component.kpis?.porEstatus.length).toBe(2);
        expect(component.kpis?.porResponsable.length).toBe(2);
        expect(component.kpis?.porSucursal.length).toBe(2);
    }));

    it('Importes_separados_por_moneda', () => {
        const importesMultiples = [
            { moneda: 'MXN', importe: 125000.5 },
            { moneda: 'USD', importe: 4500 }
        ];

        const formateado = component.formatearImportes(importesMultiples);
        expect(formateado).toContain('MXN');
        expect(formateado).toContain('USD');
        expect(formateado).toContain('125,000.50');
        expect(formateado).toContain('4,500.00');

        const vacio = component.formatearImportes([]);
        expect(vacio).toBe('$0.00');
    });

    it('Exporta_dos_hojas', () => {
        component.items = mockPedidos;
        component.kpis = mockKpis;
        component.exportarExcel();

        expect(pedidosServiceSpy.exportarExcel).toHaveBeenCalledWith(mockPedidos, mockKpis);
    });

    it('Estado_vacio', fakeAsync(() => {
        pedidosServiceSpy.listar.and.returnValue(of<PedidoListaRespuesta>({ total: 0, items: [] }));
        component.ngOnInit();
        tick();
        fixture.detectChanges();
        flush();

        expect(component.items.length).toBe(0);
        const compiled = fixture.nativeElement as HTMLElement;
        const emptyState = compiled.querySelector('[data-testid="estado-vacio"]');
        expect(emptyState).not.toBeNull();
        expect(emptyState?.textContent).toContain('No se encontraron pedidos');
    }));

    it('Menu_y_ruta_de_pedidos', () => {
        // Verificar que el menú incluye comercializacion.pedidos después de dashboards.quote-products
        const items = defaultNavigation.find((n: any) => n.id === 'comercializacion')?.children || [];
        const indexCotizaciones = items.findIndex((i: any) => i.id === 'dashboards.quote-products');
        const indexPedidos = items.findIndex((i: any) => i.id === 'comercializacion.pedidos');

        expect(indexCotizaciones).toBeGreaterThanOrEqual(0);
        expect(indexPedidos).toBe(indexCotizaciones + 1);
        expect(items[indexPedidos].link).toBe('/crm/pedidos');
        expect(items[indexPedidos].title).toBe('Pedidos (SGC-PRO-COM-04)');

        // Verificar rutas del módulo pedidos
        expect(pedidosRoutes.length).toBe(2);
        expect(pedidosRoutes[0].path).toBe('');
        expect(pedidosRoutes[1].path).toBe(':id');
    });
});
