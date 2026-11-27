import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { CotizacionDetalleDialogComponent } from './cotizacion-detalle-dialog/cotizacion-detalle-dialog.component';
import { QuotesService } from './quotes-products.service';
import { PedidosService } from 'app/modules/admin/crm/pedidos/pedidos.service';
import { RespuestaObtenerSgc } from './quotes-products.types';
import { ProcesoComercialComponent } from 'app/shared/proceso-comercial/proceso-comercial.component';
import { ProcesoComercialService } from 'app/shared/proceso-comercial/proceso-comercial.service';
import { ProcesoComercial } from 'app/shared/proceso-comercial/proceso-comercial.types';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('Cotizaciones -> Pedidos (F2)', () => {
    let fixtureDialog: ComponentFixture<CotizacionDetalleDialogComponent>;
    let dialogComp: CotizacionDetalleDialogComponent;
    let quotesServiceSpy: jasmine.SpyObj<QuotesService>;
    let pedidosServiceSpy: jasmine.SpyObj<PedidosService>;
    let routerSpy: jasmine.SpyObj<Router>;
    let dialogRefSpy: jasmine.SpyObj<MatDialogRef<CotizacionDetalleDialogComponent>>;

    const mockSgcAprobada: RespuestaObtenerSgc = {
        cotizacionProductosId: 42,
        sgc: {
            folio: 'COT-2026-0042',
            etapa: 'Ganada',
            version: 1,
            tipo: 'CS',
            total: 100000,
            moneda: 'MXN'
        } as any,
        partidas: [],
        partidasHeredadas: false,
        totales: { subtotal: 100000, iva: 16000, total: 116000 } as any,
        faltantes: [],
        estatusCotizacion: 'AprobadaPorCliente',
        puedeConvertirAPedido: true,
        pedido: null
    };

    beforeEach(async () => {
        quotesServiceSpy = jasmine.createSpyObj('QuotesService', ['getQuoteById', 'obtenerSgc', 'iniciarProceso', 'origen']);
        pedidosServiceSpy = jasmine.createSpyObj('PedidosService', ['convertirDesdeCotizacion']);
        routerSpy = jasmine.createSpyObj('Router', ['navigate']);
        dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

        quotesServiceSpy.origen.and.returnValue(of({ cotizacionProductosId: 42, requerimiento: null, lead: null } as any));

        quotesServiceSpy.getQuoteById.and.returnValue(
            of({
                id: 42,
                folioContpaq: '1234',
                total: 116000,
                moneda: 'MXN',
                createdDate: '2026-11-27T10:00:00'
            } as any)
        );
        quotesServiceSpy.obtenerSgc.and.returnValue(of(mockSgcAprobada));

        await TestBed.configureTestingModule({
            imports: [CotizacionDetalleDialogComponent, NoopAnimationsModule, MatIconTestingModule],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: { cotizacionProductosId: 42 } },
                { provide: MatDialogRef, useValue: dialogRefSpy },
                { provide: QuotesService, useValue: quotesServiceSpy },
                { provide: PedidosService, useValue: pedidosServiceSpy },
                { provide: ProcesoComercialService, useValue: { obtener: () => of({ actual: 'cotizacion', mensaje: '', pasos: [] }) } },
                { provide: Router, useValue: routerSpy }
            ]
        }).compileComponents();
    });

    it('Boton_solo_si_puedeConvertirAPedido', fakeAsync(() => {
        // Caso 1: puedeConvertirAPedido = true
        fixtureDialog = TestBed.createComponent(CotizacionDetalleDialogComponent);
        dialogComp = fixtureDialog.componentInstance;
        dialogComp.ngOnInit();
        tick();
        fixtureDialog.detectChanges();

        const el = fixtureDialog.nativeElement as HTMLElement;
        const btnConvertir = el.querySelector('[data-testid="btn-convertir-pedido"]');
        expect(btnConvertir).not.toBeNull();

        // Caso 2: puedeConvertirAPedido = false
        quotesServiceSpy.obtenerSgc.and.returnValue(
            of({
                ...mockSgcAprobada,
                puedeConvertirAPedido: false
            })
        );
        const fixture2 = TestBed.createComponent(CotizacionDetalleDialogComponent);
        const comp2 = fixture2.componentInstance;
        comp2.ngOnInit();
        tick();
        fixture2.detectChanges();

        const el2 = fixture2.nativeElement as HTMLElement;
        const btnConvertir2 = el2.querySelector('[data-testid="btn-convertir-pedido"]');
        expect(btnConvertir2).toBeNull();
    }));

    it('Convertir_confirma_llama_y_navega', fakeAsync(() => {
        fixtureDialog = TestBed.createComponent(CotizacionDetalleDialogComponent);
        dialogComp = fixtureDialog.componentInstance;
        dialogComp.ngOnInit();
        tick();
        fixtureDialog.detectChanges();

        spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true } as any));
        pedidosServiceSpy.convertirDesdeCotizacion.and.returnValue(
            of({
                id: 99,
                folio: 'PED-2026-0001'
            } as any)
        );

        dialogComp.convertirAPedido();
        tick();

        expect(Swal.fire).toHaveBeenCalled();
        expect(pedidosServiceSpy.convertirDesdeCotizacion).toHaveBeenCalledWith(42);
        expect(dialogRefSpy.close).toHaveBeenCalledWith({ recargar: true });
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/crm/pedidos', 99]);
    }));

    it('Doble_clic_no_llama_dos_veces', fakeAsync(() => {
        fixtureDialog = TestBed.createComponent(CotizacionDetalleDialogComponent);
        dialogComp = fixtureDialog.componentInstance;
        dialogComp.ngOnInit();
        tick();

        dialogComp.convirtiendoAPedido = true;
        spyOn(Swal, 'fire');

        dialogComp.convertirAPedido();
        tick();

        expect(Swal.fire).not.toHaveBeenCalled();
        expect(pedidosServiceSpy.convertirDesdeCotizacion).not.toHaveBeenCalled();
    }));

    it('Error_409_muestra_el_mensaje', fakeAsync(() => {
        fixtureDialog = TestBed.createComponent(CotizacionDetalleDialogComponent);
        dialogComp = fixtureDialog.componentInstance;
        dialogComp.ngOnInit();
        tick();

        spyOn(Swal, 'fire').and.callFake((opts: any) => {
            if (opts.title === '¿Convertir a pedido?') {
                return Promise.resolve({ isConfirmed: true } as any);
            }
            return Promise.resolve({} as any);
        });

        pedidosServiceSpy.convertirDesdeCotizacion.and.returnValue(
            throwError(() => ({
                status: 409,
                error: { mensaje: 'Solo se puede convertir una cotización «Aprobada por cliente».' }
            }))
        );

        dialogComp.convertirAPedido();
        tick();

        expect(pedidosServiceSpy.convertirDesdeCotizacion).toHaveBeenCalledWith(42);
        expect(dialogComp.convirtiendoAPedido).toBeFalse();
        expect(Swal.fire).toHaveBeenCalledWith(
            jasmine.objectContaining({
                icon: 'error',
                title: 'Error al convertir a pedido',
                text: 'Solo se puede convertir una cotización «Aprobada por cliente».'
            })
        );
        expect(routerSpy.navigate).not.toHaveBeenCalled();
    }));

    it('Chip_de_pedido_en_tarjeta_lista_y_detalle', fakeAsync(() => {
        quotesServiceSpy.obtenerSgc.and.returnValue(
            of({
                ...mockSgcAprobada,
                puedeConvertirAPedido: false,
                pedido: {
                    id: 77,
                    folio: 'PED-2026-0007',
                    estatus: 'Recibido'
                }
            })
        );

        fixtureDialog = TestBed.createComponent(CotizacionDetalleDialogComponent);
        dialogComp = fixtureDialog.componentInstance;
        dialogComp.ngOnInit();
        tick();
        fixtureDialog.detectChanges();

        const el = fixtureDialog.nativeElement as HTMLElement;
        const chip = el.querySelector('[data-testid="chip-pedido"]');
        expect(chip).not.toBeNull();
        expect(chip?.textContent).toContain('PED-2026-0007');

        // Clic en el chip navega a /crm/pedidos/77
        dialogComp.irAPedido(77);
        expect(dialogRefSpy.close).toHaveBeenCalled();
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/crm/pedidos', 77]);
    }));

    it('El_panel_muestra_el_paso_Pedido', fakeAsync(() => {
        const mockProcesoConPedido: ProcesoComercial = {
            actual: 'pedido',
            mensaje: 'Pedido creado y en proceso de validación.',
            pasos: [
                { clave: 'lead', titulo: 'Lead', estado: 'completado', detalle: 'Lead 1' },
                { clave: 'requerimiento', titulo: 'Requerimiento', estado: 'completado', detalle: 'REQ-1' },
                { clave: 'ingenieria', titulo: 'Ingeniería', estado: 'noAplica', detalle: 'N/A' },
                { clave: 'cotizacion', titulo: 'Cotización', estado: 'completado', detalle: 'COT-42' },
                { clave: 'pedido', titulo: 'Pedido', estado: 'actual', detalle: 'PED-2026-0001 · En validación', id: 1 }
            ]
        };

        const procesoServiceSpy = jasmine.createSpyObj('ProcesoComercialService', ['obtener']);
        procesoServiceSpy.obtener.and.returnValue(of(mockProcesoConPedido));

        const fixtureProceso = TestBed.resetTestingModule().configureTestingModule({
            imports: [ProcesoComercialComponent, NoopAnimationsModule, MatIconTestingModule],
            providers: [{ provide: ProcesoComercialService, useValue: procesoServiceSpy }]
        }).createComponent(ProcesoComercialComponent);

        const compProceso = fixtureProceso.componentInstance;
        compProceso.tipo = 'cotizacion';
        compProceso.id = 42;
        compProceso.ngOnChanges();
        tick();
        fixtureProceso.detectChanges();

        const el = fixtureProceso.nativeElement as HTMLElement;
        const pasos = Array.from(el.querySelectorAll('.proceso-paso'));
        expect(pasos.length).toBe(5);

        const pasoPedido = el.querySelector('.proceso-paso[data-paso="pedido"]');
        expect(pasoPedido).not.toBeNull();
        expect(pasoPedido?.getAttribute('data-estado')).toBe('actual');
        expect(pasoPedido?.textContent).toContain('Pedido');
        expect(pasoPedido?.textContent).toContain('PED-2026-0001 · En validación');
    }));
});
