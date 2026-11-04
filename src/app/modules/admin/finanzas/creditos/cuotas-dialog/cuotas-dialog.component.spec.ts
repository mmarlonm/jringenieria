import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { of } from 'rxjs';
import { environment } from 'environments/environment';
import { CuotasDialogComponent } from './cuotas-dialog.component';
import { Credito, CreditoPago } from '../../finanzas.types';
import { fechaLocalISO } from '../../finanzas.utils';

describe('CuotasDialogComponent', () => {
    let fixture: ComponentFixture<CuotasDialogComponent>;
    let componente: CuotasDialogComponent;
    let httpMock: HttpTestingController;
    let dialogRefSpy: jasmine.SpyObj<MatDialogRef<CuotasDialogComponent, boolean>>;
    let confirmSpy: jasmine.Spy;
    const base = `${environment.apiUrl}/Finanzas`;

    const mockCredito: Credito = {
        creditoId: 10,
        empresaId: 1,
        sentido: 'Recibido',
        tipo: 'Simple',
        contraparte: 'Banco Uno',
        moneda: 'MXN',
        montoOriginal: 100000,
        saldoCapital: 80000,
        tasaAnual: 0.155,
        vencimientoFinal: '2028-12-31',
        cuentaId: null,
        estado: 'Activo',
        notas: null,
        fechaActualizacion: '2026-11-04T00:00:00',
        proximoVencimiento: '2026-11-15',
        proximoPago: 4500,
        pagosPendientes: 2,
        pagosTotales: 2
    };

    const mockPagos: CreditoPago[] = [
        {
            pagoId: 1,
            creditoId: 10,
            vencimiento: '2026-11-15T00:00:00',
            capital: 4000,
            interes: 500,
            total: 4500,
            estado: 'Pendiente',
            fechaPago: null
        },
        {
            pagoId: 2,
            creditoId: 10,
            vencimiento: '2026-12-15T00:00:00',
            capital: 4000,
            interes: 450,
            total: 4450,
            estado: 'Pendiente',
            fechaPago: null
        }
    ];

    beforeEach(async () => {
        dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
        const confirmServiceMock = {
            open: () => ({ afterClosed: () => of('confirmed') })
        };

        await TestBed.configureTestingModule({
            imports: [CuotasDialogComponent, HttpClientTestingModule],
            providers: [
                provideNoopAnimations(),
                { provide: MatDialogRef, useValue: dialogRefSpy },
                { provide: MAT_DIALOG_DATA, useValue: { credito: mockCredito } },
                { provide: FuseConfirmationService, useValue: confirmServiceMock }
            ]
        }).compileComponents();

        const confirmService = TestBed.inject(FuseConfirmationService);
        confirmSpy = spyOn(confirmService, 'open').and.callThrough();

        fixture = TestBed.createComponent(CuotasDialogComponent);
        componente = fixture.componentInstance;
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('Muestra_las_cuotas_ordenadas_con_su_total', () => {
        fixture.detectChanges();

        const req = httpMock.expectOne(`${base}/creditos/10/pagos`);
        expect(req.request.method).toBe('GET');
        req.flush(mockPagos);
        fixture.detectChanges();

        expect(componente.cuotas().length).toBe(2);

        const filas = fixture.debugElement.queryAll(By.css('[data-testid="fila-cuota"]'));
        expect(filas.length).toBe(2);

        const textoFila1 = filas[0].nativeElement.textContent;
        expect(textoFila1).toContain('15/11/2026');
        expect(textoFila1).toContain('$4,000.00 MXN');
        expect(textoFila1).toContain('$500.00 MXN');
        expect(textoFila1).toContain('$4,500.00 MXN');
        expect(textoFila1).toContain('Pendiente');
    });

    it('Agregar_cuota_manda_POST_y_recarga_la_tabla', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/creditos/10/pagos`).flush(mockPagos);
        fixture.detectChanges();

        componente.nuevaVencimiento.set('2027-01-15');
        componente.nuevaCapital.set(4000);
        componente.nuevaInteres.set(400);

        componente.agregarCuota();

        const reqPost = httpMock.expectOne(`${base}/creditos/10/pagos`);
        expect(reqPost.request.method).toBe('POST');
        expect(reqPost.request.body).toEqual({
            vencimiento: '2027-01-15',
            capital: 4000,
            interes: 400,
            estado: 'Pendiente',
            fechaPago: null
        });

        const nuevaCuota: CreditoPago = {
            pagoId: 3,
            creditoId: 10,
            vencimiento: '2027-01-15',
            capital: 4000,
            interes: 400,
            total: 4400,
            estado: 'Pendiente',
            fechaPago: null
        };
        reqPost.flush(nuevaCuota);

        // Recarga de cuotas
        const reqRecarga = httpMock.expectOne(`${base}/creditos/10/pagos`);
        reqRecarga.flush([...mockPagos, nuevaCuota]);
        fixture.detectChanges();

        expect(componente.cuotas().length).toBe(3);
        expect(componente.huboCambios()).toBeTrue();
    });

    it('Marcar_pagada_manda_PUT_con_estado_y_fecha_de_hoy', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/creditos/10/pagos`).flush(mockPagos);
        fixture.detectChanges();

        const hoy = fechaLocalISO(new Date());

        componente.marcarPagada(mockPagos[0]);

        const reqPut = httpMock.expectOne(`${base}/creditos/10/pagos/1`);
        expect(reqPut.request.method).toBe('PUT');
        expect(reqPut.request.body).toEqual({
            vencimiento: '2026-11-15',
            capital: 4000,
            interes: 500,
            estado: 'Pagada',
            fechaPago: hoy
        });

        const pagadaActualizada: CreditoPago = {
            ...mockPagos[0],
            estado: 'Pagada',
            fechaPago: hoy
        };
        reqPut.flush(pagadaActualizada);

        // Recarga de cuotas
        httpMock.expectOne(`${base}/creditos/10/pagos`).flush([pagadaActualizada, mockPagos[1]]);
        fixture.detectChanges();

        expect(componente.huboCambios()).toBeTrue();
    });

    it('Editar_cuota_manda_PUT', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/creditos/10/pagos`).flush(mockPagos);
        fixture.detectChanges();

        componente.iniciarEdicion(mockPagos[0]);
        componente.editCapital.set(4200);
        componente.editInteres.set(300);

        componente.guardarEdicion(mockPagos[0]);

        const reqPut = httpMock.expectOne(`${base}/creditos/10/pagos/1`);
        expect(reqPut.request.method).toBe('PUT');
        expect(reqPut.request.body).toEqual({
            vencimiento: '2026-11-15',
            capital: 4200,
            interes: 300,
            estado: 'Pendiente',
            fechaPago: null
        });

        reqPut.flush({ ...mockPagos[0], capital: 4200, interes: 300, total: 4500 });

        httpMock.expectOne(`${base}/creditos/10/pagos`).flush([]);
        expect(componente.huboCambios()).toBeTrue();
    });

    it('Eliminar_cuota_confirma_con_texto_fijo_y_manda_DELETE', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/creditos/10/pagos`).flush(mockPagos);
        fixture.detectChanges();

        componente.eliminarCuota(mockPagos[0]);

        expect(confirmSpy).toHaveBeenCalled();
        const conf = confirmSpy.calls.mostRecent().args[0]!;
        expect(conf.message).toBe('¿Eliminar esta cuota? No se puede deshacer.');

        const reqDel = httpMock.expectOne(`${base}/creditos/10/pagos/1`);
        expect(reqDel.request.method).toBe('DELETE');
        reqDel.flush(null, { status: 204, statusText: 'No Content' });

        httpMock.expectOne(`${base}/creditos/10/pagos`).flush([mockPagos[1]]);
        expect(componente.huboCambios()).toBeTrue();
    });

    it('Una_cuota_invalida_no_se_manda', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/creditos/10/pagos`).flush(mockPagos);
        fixture.detectChanges();

        componente.nuevaVencimiento.set('2027-01-15');
        componente.nuevaCapital.set(0);
        componente.nuevaInteres.set(0);

        componente.agregarCuota();

        httpMock.expectNone(`${base}/creditos/10/pagos`);
    });

    it('Si_el_API_rechaza_muestra_el_mensaje', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/creditos/10/pagos`).flush(mockPagos);
        fixture.detectChanges();

        componente.nuevaVencimiento.set('2027-01-15');
        componente.nuevaCapital.set(1000);
        componente.nuevaInteres.set(100);

        componente.agregarCuota();

        const reqPost = httpMock.expectOne(`${base}/creditos/10/pagos`);
        reqPost.flush({ mensaje: 'Error al agregar cuota' }, { status: 400, statusText: 'Bad Request' });
        fixture.detectChanges();

        expect(componente.error()).toBe('Error al agregar cuota');
    });

    it('Cerrar_devuelve_true_solo_si_hubo_cambios', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/creditos/10/pagos`).flush(mockPagos);

        // Sin cambios: devuelve false
        componente.cerrar();
        expect(dialogRefSpy.close).toHaveBeenCalledWith(false);

        // Con cambios: devuelve true
        componente.huboCambios.set(true);
        componente.cerrar();
        expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
    });

    describe('doble clic', () => {
        const cargarCuotas = () => {
            fixture.detectChanges();
            httpMock.expectOne(`${base}/creditos/10/pagos`).flush(mockPagos);
        };

        it('Un_doble_clic_en_Agregar_cuota_manda_una_sola_peticion', () => {
            cargarCuotas();
            componente.nuevaVencimiento.set('2027-01-15');
            componente.nuevaCapital.set(4000);
            componente.nuevaInteres.set(400);

            componente.agregarCuota();
            componente.agregarCuota();

            const posts = httpMock.match((r) => r.method === 'POST');
            expect(posts.length).toBe(1);
            posts[0].flush({ ...mockPagos[0], pagoId: 3 });
            httpMock.expectOne(`${base}/creditos/10/pagos`).flush(mockPagos);
        });

        it('Un_doble_clic_en_Marcar_pagada_manda_un_solo_PUT', () => {
            cargarCuotas();

            componente.marcarPagada(mockPagos[0]);
            componente.marcarPagada(mockPagos[0]);

            const puts = httpMock.match((r) => r.method === 'PUT');
            expect(puts.length).toBe(1);
            puts[0].flush({ ...mockPagos[0], estado: 'Pagada' });
            httpMock.expectOne(`${base}/creditos/10/pagos`).flush(mockPagos);
        });

        it('Un_doble_clic_en_Eliminar_cuota_manda_un_solo_DELETE', () => {
            cargarCuotas();

            componente.eliminarCuota(mockPagos[0]);
            componente.eliminarCuota(mockPagos[0]);

            const deletes = httpMock.match((r) => r.method === 'DELETE');
            expect(deletes.length).toBe(1);
            deletes[0].flush(null);
            httpMock.expectOne(`${base}/creditos/10/pagos`).flush(mockPagos);
        });

        it('Si_el_API_rechaza_marcar_pagada_se_puede_reintentar', () => {
            cargarCuotas();

            componente.marcarPagada(mockPagos[0]);
            httpMock.expectOne((r) => r.method === 'PUT').flush({ mensaje: 'caído' }, { status: 500, statusText: 'Server Error' });
            expect(componente.error()).toBe('caído');

            componente.marcarPagada(mockPagos[0]);
            const reintento = httpMock.expectOne((r) => r.method === 'PUT');
            reintento.flush({ ...mockPagos[0], estado: 'Pagada' });
            httpMock.expectOne(`${base}/creditos/10/pagos`).flush(mockPagos);
        });

        it('Si_se_cancela_la_confirmacion_de_eliminar_se_puede_volver_a_intentar', () => {
            cargarCuotas();
            confirmSpy.and.returnValue({ afterClosed: () => of('cancelled') } as never);

            componente.eliminarCuota(mockPagos[0]);
            expect(httpMock.match((r) => r.method === 'DELETE').length).toBe(0);

            confirmSpy.and.returnValue({ afterClosed: () => of('confirmed') } as never);
            componente.eliminarCuota(mockPagos[0]);
            httpMock.expectOne((r) => r.method === 'DELETE').flush(null);
            httpMock.expectOne(`${base}/creditos/10/pagos`).flush(mockPagos);
        });
    });


    it('Las_acciones_de_cada_cuota_estan_en_la_primera_columna', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/creditos/10/pagos`).flush(mockPagos);
        fixture.detectChanges();

        const primeras = fixture.debugElement.queryAll(By.css('tbody tr td:first-child'));
        expect(primeras.length).toBe(mockPagos.length);
        for (const celda of primeras) {
            const titulos = Array.from((celda.nativeElement as HTMLElement).querySelectorAll('button')).map(
                (b) => b.getAttribute('title') || b.textContent?.trim()
            );
            expect(titulos).toContain('Editar cuota');
            expect(titulos).toContain('Eliminar cuota');
        }
    });

    it('Mientras_se_procesa_una_accion_los_botones_de_la_fila_quedan_deshabilitados', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/creditos/10/pagos`).flush(mockPagos);
        fixture.detectChanges();

        componente.marcarPagada(mockPagos[0]);
        fixture.detectChanges();

        const botones = fixture.debugElement.queryAll(By.css('tbody tr td:first-child button'));
        expect(botones.length).toBeGreaterThan(0);
        expect(botones.every((b) => (b.nativeElement as HTMLButtonElement).disabled)).toBeTrue();

        httpMock.expectOne((r) => r.method === 'PUT').flush({ ...mockPagos[0], estado: 'Pagada' });
        httpMock.expectOne(`${base}/creditos/10/pagos`).flush(mockPagos);
    });
});

