import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations, provideAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSelect } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { of } from 'rxjs';
import { environment } from 'environments/environment';
import { CreditosComponent } from './creditos.component';
import { Credito, Empresa } from '../finanzas.types';
import { BalanceCreditosComponent } from './balance/balance.component';
import { CuotasDialogComponent } from './cuotas-dialog/cuotas-dialog.component';

describe('CreditosComponent', () => {
    let fixture: ComponentFixture<CreditosComponent>;
    let componente: CreditosComponent;
    let httpMock: HttpTestingController;
    const base = `${environment.apiUrl}/Finanzas`;

    const mockEmpresas: Empresa[] = [
        { empresaId: 1, rfc: 'AAA010101AAA', nombre: 'Empresa Uno', tipo: 'M', activa: true },
        { empresaId: 2, rfc: 'BBB020202BBB', nombre: 'Empresa Dos', tipo: 'M', activa: true }
    ];

    const creditoVencido: Credito = {
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
        proximoVencimiento: '2020-01-01', // vencido
        proximoPago: 4500,
        pagosPendientes: 5,
        pagosTotales: 10
    };

    const creditoNoVencido: Credito = {
        creditoId: 20,
        empresaId: 2,
        sentido: 'Otorgado',
        tipo: 'Arrendamiento',
        contraparte: 'Cliente Dos',
        moneda: 'USD',
        montoOriginal: 50000,
        saldoCapital: 40000,
        tasaAnual: 0.12,
        vencimientoFinal: '2029-06-30',
        cuentaId: null,
        estado: 'Activo',
        notas: 'Nota dos',
        fechaActualizacion: '2026-11-04T00:00:00',
        proximoVencimiento: '2030-01-01', // futuro
        proximoPago: 2000,
        pagosPendientes: 8,
        pagosTotales: 12
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CreditosComponent, HttpClientTestingModule],
            providers: [
                provideNoopAnimations(),
                {
                    provide: FuseConfirmationService,
                    useValue: { open: () => ({ afterClosed: () => of('confirmed') }) }
                },
                {
                    provide: MatSnackBar,
                    useValue: { open: jasmine.createSpy('open') }
                },
                {
                    provide: MatDialog,
                    useValue: { open: () => ({ afterClosed: () => of(undefined) }) }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(CreditosComponent);
        componente = fixture.componentInstance;
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        const reqsBalance = httpMock.match((r) => r.url === `${base}/creditos/balance`);
        for (const req of reqsBalance) {
            if (!req.cancelled) {
                req.flush({ empresaId: null, empresasIncluidas: 1, monedas: [] });
            }
        }
        httpMock.verify();
    });

    it('Al_iniciar_pide_empresas_y_creditos_de_todas_las_empresas_activos', () => {
        fixture.detectChanges();

        const reqEmp = httpMock.expectOne(`${base}/empresas`);
        expect(reqEmp.request.method).toBe('GET');
        reqEmp.flush(mockEmpresas);

        const reqCred = httpMock.expectOne((r) => r.url === `${base}/creditos`);
        expect(reqCred.request.method).toBe('GET');
        expect(reqCred.request.params.get('estado')).toBe('Activo');
        expect(reqCred.request.params.has('empresaId')).toBeFalse();
        reqCred.flush([creditoVencido]);

        fixture.detectChanges();
        expect(componente.empresas()).toEqual(mockEmpresas);
        expect(componente.creditos()).toEqual([creditoVencido]);
    });

    it('Muestra_una_fila_por_credito_con_importes_y_tasa_formateados', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
        httpMock.expectOne((r) => r.url === `${base}/creditos`).flush([creditoVencido]);
        fixture.detectChanges();

        const filas = fixture.debugElement.queryAll(By.css('[data-testid="fila-credito"]'));
        expect(filas.length).toBe(1);

        const textoFila = filas[0].nativeElement.textContent;
        expect(textoFila).toContain('Banco Uno');
        expect(textoFila).toContain('$100,000.00 MXN');
        expect(textoFila).toContain('$80,000.00 MXN');
        expect(textoFila).toContain('15.50%');
    });

    it('Las_acciones_estan_en_la_primera_columna', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
        httpMock.expectOne((r) => r.url === `${base}/creditos`).flush([creditoVencido]);
        fixture.detectChanges();

        const primeraCelda = fixture.debugElement.query(By.css('tbody tr td:first-child'));
        expect(primeraCelda).toBeTruthy();
        expect(primeraCelda.nativeElement.getAttribute('data-testid')).toBe('acciones-credito');

        const btnCalendario = primeraCelda.query(By.css('button[aria-label="Ver calendario de pagos"]'));
        const btnEditar = primeraCelda.query(By.css('button[aria-label="Editar crédito"]'));
        const btnEliminar = primeraCelda.query(By.css('button[aria-label="Eliminar crédito"]'));

        expect(btnCalendario).toBeTruthy();
        expect(btnEditar).toBeTruthy();
        expect(btnEliminar).toBeTruthy();
    });

    it('Un_proximo_pago_anterior_a_hoy_lleva_la_etiqueta_Vencida_y_uno_posterior_no', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
        httpMock.expectOne((r) => r.url === `${base}/creditos`).flush([creditoVencido, creditoNoVencido]);
        fixture.detectChanges();

        const celdasProximo = fixture.debugElement.queryAll(By.css('[data-testid="proximo-pago"]'));
        expect(celdasProximo.length).toBe(2);

        // creditoVencido tiene vencimiento en 2020: debe tener etiqueta-vencida con texto "Vencida"
        const etiquetaVencida0 = celdasProximo[0].query(By.css('[data-testid="etiqueta-vencida"]'));
        expect(etiquetaVencida0).toBeTruthy();
        expect(etiquetaVencida0.nativeElement.textContent).toContain('Vencida');

        // creditoNoVencido tiene vencimiento en 2030: NO debe tener etiqueta-vencida
        const etiquetaVencida1 = celdasProximo[1].query(By.css('[data-testid="etiqueta-vencida"]'));
        expect(etiquetaVencida1).toBeNull();
    });

    it('Elegir_empresa_y_Todas_cambian_el_parametro_empresaId', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
        httpMock.expectOne((r) => r.url === `${base}/creditos`).flush([]);

        // Elegir empresa 2
        componente.elegirEmpresa(2);
        const req2 = httpMock.expectOne((r) => r.url === `${base}/creditos`);
        expect(req2.request.params.get('empresaId')).toBe('2');
        req2.flush([]);

        // Elegir 0 (Todas)
        componente.elegirEmpresa(0);
        const reqTodas = httpMock.expectOne((r) => r.url === `${base}/creditos`);
        expect(reqTodas.request.params.has('empresaId')).toBeFalse();
        reqTodas.flush([]);
    });

    it('Los_filtros_mandan_sentido_y_estado', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
        httpMock.expectOne((r) => r.url === `${base}/creditos`).flush([]);

        componente.cambiarSentido('Recibido');
        const reqSentido = httpMock.expectOne((r) => r.url === `${base}/creditos`);
        expect(reqSentido.request.params.get('sentido')).toBe('Recibido');
        expect(reqSentido.request.params.get('estado')).toBe('Activo');
        reqSentido.flush([]);

        componente.cambiarEstado('Liquidado');
        const reqEstado = httpMock.expectOne((r) => r.url === `${base}/creditos`);
        expect(reqEstado.request.params.get('sentido')).toBe('Recibido');
        expect(reqEstado.request.params.get('estado')).toBe('Liquidado');
        reqEstado.flush([]);
    });

    it('La_respuesta_tardia_de_la_consulta_anterior_no_pisa_a_la_actual', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
        const reqInicial = httpMock.expectOne((r) => r.url === `${base}/creditos`);

        // Llamar a cargar nuevamente antes de responder la primera
        componente.cambiarSentido('Recibido');
        const reqNueva = httpMock.expectOne((r) => r.url === `${base}/creditos` && r.params.get('sentido') === 'Recibido');

        expect(reqInicial.cancelled).toBeTrue();
        // Respondemos la nueva; no hacemos flush de la cancelada
        reqNueva.flush([creditoVencido]);
        fixture.detectChanges();

        expect(componente.creditos()).toEqual([creditoVencido]);
    });

    it('Eliminar_confirma_con_texto_fijo_llama_DELETE_avisa_y_recarga', () => {
        const confirmService = TestBed.inject(FuseConfirmationService);
        const snackBar = TestBed.inject(MatSnackBar);
        const spyOpen = spyOn(confirmService, 'open').and.returnValue({ afterClosed: () => of('confirmed') } as never);

        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
        httpMock.expectOne((r) => r.url === `${base}/creditos`).flush([creditoVencido]);
        fixture.detectChanges();

        componente.eliminar(creditoVencido);

        expect(spyOpen).toHaveBeenCalled();
        const conf = spyOpen.calls.mostRecent().args[0]!;
        expect(conf.message).toBe('¿Eliminar este crédito? Se borrarán también todas sus cuotas. No se puede deshacer.');

        const reqDel = httpMock.expectOne(`${base}/creditos/${creditoVencido.creditoId}`);
        expect(reqDel.request.method).toBe('DELETE');
        reqDel.flush(null, { status: 204, statusText: 'No Content' });

        expect(snackBar.open).toHaveBeenCalledWith('Crédito eliminado.', jasmine.any(String), jasmine.any(Object));

        // Recarga la lista
        httpMock.expectOne((r) => r.url === `${base}/creditos`).flush([]);
    });

    it('Eliminar_cancelado_no_manda_nada', () => {
        const confirmService = TestBed.inject(FuseConfirmationService);
        spyOn(confirmService, 'open').and.returnValue({ afterClosed: () => of('cancelled') } as never);

        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
        httpMock.expectOne((r) => r.url === `${base}/creditos`).flush([creditoVencido]);
        fixture.detectChanges();

        componente.eliminar(creditoVencido);
        // No se debe mandar DELETE
        httpMock.expectNone(`${base}/creditos/${creditoVencido.creditoId}`);
    });

    it('Si_el_API_rechaza_eliminar_muestra_su_mensaje', () => {
        const confirmService = TestBed.inject(FuseConfirmationService);
        const snackBar = TestBed.inject(MatSnackBar);
        spyOn(confirmService, 'open').and.returnValue({ afterClosed: () => of('confirmed') } as never);

        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
        httpMock.expectOne((r) => r.url === `${base}/creditos`).flush([creditoVencido]);
        fixture.detectChanges();

        componente.eliminar(creditoVencido);

        const reqDel = httpMock.expectOne(`${base}/creditos/${creditoVencido.creditoId}`);
        reqDel.flush({ mensaje: 'No se puede eliminar el crédito' }, { status: 400, statusText: 'Bad Request' });

        expect(snackBar.open).toHaveBeenCalledWith('No se puede eliminar el crédito', jasmine.any(String), jasmine.any(Object));
    });

    it('Error_de_carga_muestra_Reintentar', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);

        const reqCred = httpMock.expectOne((r) => r.url === `${base}/creditos`);
        reqCred.flush({ mensaje: 'Error al cargar créditos' }, { status: 500, statusText: 'Server Error' });
        fixture.detectChanges();

        const bannerError = fixture.debugElement.query(By.css('[data-testid="error-creditos"]'));
        expect(bannerError).toBeTruthy();
        expect(bannerError.nativeElement.textContent).toContain('Error al cargar créditos');

        const btnReintentar = fixture.debugElement.query(By.css('[data-testid="boton-reintentar"]'));
        expect(btnReintentar).toBeTruthy();

        btnReintentar.nativeElement.click();
        const reqReintento = httpMock.expectOne((r) => r.url === `${base}/creditos`);
        reqReintento.flush([creditoVencido]);
        fixture.detectChanges();

        expect(fixture.debugElement.query(By.css('[data-testid="error-creditos"]'))).toBeNull();
        expect(fixture.debugElement.queryAll(By.css('[data-testid="fila-credito"]')).length).toBe(1);
    });

    it('Sin_creditos_muestra_el_estado_vacio', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
        httpMock.expectOne((r) => r.url === `${base}/creditos`).flush([]);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('Aún no hay créditos con estos filtros');
    });

    it('Las_filas_son_la_misma_lista_mientras_los_datos_no_cambian', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
        httpMock.expectOne((r) => r.url === `${base}/creditos`).flush([creditoVencido]);
        fixture.detectChanges();

        const lista1 = componente.filasCreditos();
        const lista2 = componente.filasCreditos();
        expect(lista1).toBe(lista2); // misma referencia
    });

    it('Ver_calendario_abre_el_dialogo_y_si_hubo_cambios_recarga_la_lista', () => {
        const dialog = TestBed.inject(MatDialog);
        const spyDialog = spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(true) } as never);

        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
        httpMock.expectOne((r) => r.url === `${base}/creditos`).flush([creditoVencido]);
        fixture.detectChanges();

        componente.verCalendario(creditoVencido);

        expect(spyDialog).toHaveBeenCalled();
        const config = spyDialog.calls.mostRecent().args[1] as { data?: { credito?: Credito } };
        expect(config.data?.credito).toEqual(creditoVencido);

        // Recarga la lista
        httpMock.expectOne((r) => r.url === `${base}/creditos`).flush([creditoVencido]);
    });

    it('El_balance_sigue_a_la_empresa_elegida', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
        httpMock.expectOne((r) => r.url === `${base}/creditos`).flush([]);

        // Balance inicial sin empresa
        const reqBalInicial = httpMock.expectOne((r) => r.url === `${base}/creditos/balance`);
        expect(reqBalInicial.request.params.has('empresaId')).toBeFalse();
        reqBalInicial.flush({ empresaId: null, empresasIncluidas: 2, monedas: [] });

        // Elegir empresa 2
        componente.elegirEmpresa(2);
        fixture.detectChanges();

        httpMock.expectOne((r) => r.url === `${base}/creditos`).flush([]);
        const reqBalEmpresa2 = httpMock.expectOne((r) => r.url === `${base}/creditos/balance`);
        expect(reqBalEmpresa2.request.params.get('empresaId')).toBe('2');
        reqBalEmpresa2.flush({ empresaId: 2, empresasIncluidas: 1, monedas: [] });

        const balanceComp = fixture.debugElement.query(By.directive(BalanceCreditosComponent));
        expect(balanceComp).toBeTruthy();
        expect(balanceComp.componentInstance.empresaId).toBe(2);
    });
});

describe('CreditosComponent - deteccion automatica y animaciones reales', () => {
    let fixture: ComponentFixture<CreditosComponent>;
    let httpMock: HttpTestingController;
    const base = `${environment.apiUrl}/Finanzas`;

    const mockEmpresas: Empresa[] = [
        { empresaId: 1, rfc: 'AAA010101AAA', nombre: 'Empresa Uno', tipo: 'M', activa: true },
        { empresaId: 2, rfc: 'BBB020202BBB', nombre: 'Empresa Dos', tipo: 'M', activa: true }
    ];

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CreditosComponent, HttpClientTestingModule],
            providers: [
                provideAnimations(),
                {
                    provide: FuseConfirmationService,
                    useValue: { open: () => ({ afterClosed: () => of('confirmed') }) }
                },
                {
                    provide: MatSnackBar,
                    useValue: { open: jasmine.createSpy('open') }
                },
                {
                    provide: MatDialog,
                    useValue: { open: () => ({ afterClosed: () => of(undefined) }) }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(CreditosComponent);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        const reqsBalance = httpMock.match((r) => r.url === `${base}/creditos/balance`);
        for (const req of reqsBalance) {
            if (!req.cancelled) {
                req.flush({ empresaId: null, empresasIncluidas: 1, monedas: [] });
            }
        }
        httpMock.verify();
    });

    it('Elegir_empresa_con_deteccion_automatica_y_animaciones_reales_no_entra_en_ciclo', async () => {
        fixture.autoDetectChanges(true);

        const reqs = httpMock.match(() => true);
        for (const r of reqs) {
            if (r.request.url.includes('/empresas')) {
                r.flush(mockEmpresas);
            } else if (r.request.url.includes('/creditos/balance')) {
                r.flush({ empresaId: null, empresasIncluidas: 2, monedas: [] });
            } else if (r.request.url.includes('/creditos')) {
                r.flush([]);
            }
        }

        await fixture.whenStable();

        const selector = fixture.debugElement.query(By.css('[data-testid="selector-empresa"]'));
        expect(selector).toBeTruthy();

        const trigger = selector.query(By.css('.mat-mdc-select-trigger'));
        trigger.nativeElement.click();
        await fixture.whenStable();

        const matSelectInstance = selector.componentInstance as MatSelect;
        const options = matSelectInstance.options.toArray();
        expect(options.length).toBeGreaterThan(1);

        // Indice 1 es la primera empresa real (indice 0 es "Todas")
        options[1]._getHostElement().click();
        await fixture.whenStable();

        const pendingReqs = httpMock.match(() => true);
        for (const r of pendingReqs) {
            r.flush([]);
        }

        await fixture.whenStable();
        expect(httpMock.match(() => true).length).toBe(0);
    });
});

