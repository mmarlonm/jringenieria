import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations, provideAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { MatSelect } from '@angular/material/select';
import { environment } from 'environments/environment';
import { CobranzaComponent } from './cobranza.component';
import { Cobranza, Empresa, FacturaCobranza } from '../finanzas.types';

describe('CobranzaComponent', () => {
    let fixture: ComponentFixture<CobranzaComponent>;
    let componente: CobranzaComponent;
    let httpMock: HttpTestingController;
    const base = `${environment.apiUrl}/Finanzas`;

    const mockEmpresas: Empresa[] = [
        { empresaId: 1, rfc: 'AAA010101AAA', nombre: 'Empresa Uno', tipo: 'M', activa: true },
        { empresaId: 2, rfc: 'BBB020202BBB', nombre: 'Empresa Dos', tipo: 'M', activa: true }
    ];

    const facturaAtrasada: FacturaCobranza = {
        cfdiId: 101,
        uuid: '11111111-1111-1111-1111-111111111111',
        serie: 'F',
        folio: '1001',
        fechaEmision: '2026-09-01T00:00:00',
        cliente: 'Cliente Atrasado SA',
        rfcCliente: 'CAT010101CAT',
        moneda: 'MXN',
        total: 10000,
        cobrado: 2000,
        notasCredito: 0,
        saldo: 8000,
        estadoPago: 'Parcial',
        fechaVencimiento: '2026-10-01T00:00:00',
        cobroEsperado: '2026-10-15T00:00:00',
        fechaEfectiva: '2026-10-15T00:00:00',
        atrasada: true,
        diasAtraso: 20,
        estatus: 'EnGestion',
        responsable: 'Carlos López',
        probabilidad: 0.7,
        observaciones: 'Llamar el lunes'
    };

    const facturaAlCorriente: FacturaCobranza = {
        cfdiId: 102,
        uuid: '22222222-2222-2222-2222-222222222222',
        serie: 'F',
        folio: '1002',
        fechaEmision: '2026-11-01T00:00:00',
        cliente: 'Cliente Futuro SA',
        rfcCliente: 'CFU020202CFU',
        moneda: 'MXN',
        total: 5000,
        cobrado: 0,
        notasCredito: 0,
        saldo: 5000,
        estadoPago: 'Pendiente',
        fechaVencimiento: '2026-11-20T00:00:00',
        cobroEsperado: '2026-11-20T00:00:00',
        fechaEfectiva: '2026-11-20T00:00:00',
        atrasada: false,
        diasAtraso: null,
        estatus: 'Programado',
        responsable: 'Ana Ruiz',
        probabilidad: 0.9,
        observaciones: null
    };

    const mockCobranza: Cobranza = {
        hoy: '2026-11-04',
        empresaId: null,
        empresasIncluidas: 2,
        resumen: [
            {
                moneda: 'MXN',
                facturas: 2,
                saldoAbierto: 13000,
                atrasado: 8000,
                proximos30: 5000,
                despues: 0,
                sinFecha: 0
            }
        ],
        facturas: {
            pagina: 1,
            tamano: 50,
            total: 2,
            items: [facturaAtrasada, facturaAlCorriente]
        }
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CobranzaComponent, HttpClientTestingModule],
            providers: [provideNoopAnimations()]
        }).compileComponents();

        fixture = TestBed.createComponent(CobranzaComponent);
        componente = fixture.componentInstance;
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('Carga_empresas_y_la_primera_pagina_al_iniciar', () => {
        fixture.detectChanges();

        const reqEmp = httpMock.expectOne(`${base}/empresas`);
        expect(reqEmp.request.method).toBe('GET');
        reqEmp.flush(mockEmpresas);

        const reqCob = httpMock.expectOne((r) => r.url === `${base}/cobranza`);
        expect(reqCob.request.method).toBe('GET');
        expect(reqCob.request.params.get('pagina')).toBe('1');
        expect(reqCob.request.params.get('estado')).toBe('Abiertas');
        expect(reqCob.request.params.has('empresaId')).toBeFalse();
        reqCob.flush(mockCobranza);

        fixture.detectChanges();
        expect(componente.empresas()).toEqual(mockEmpresas);
        expect(componente.filas()).toEqual([facturaAtrasada, facturaAlCorriente]);
    });

    it('Elegir_Todas_las_empresas_usa_el_centinela_cero_y_pide_sin_empresaId', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
        httpMock.expectOne((r) => r.url === `${base}/cobranza`).flush(mockCobranza);

        componente.elegirEmpresa(2);
        const req2 = httpMock.expectOne((r) => r.url === `${base}/cobranza`);
        expect(req2.request.params.get('empresaId')).toBe('2');
        req2.flush(mockCobranza);

        componente.elegirEmpresa(0);
        const reqTodas = httpMock.expectOne((r) => r.url === `${base}/cobranza`);
        expect(reqTodas.request.params.has('empresaId')).toBeFalse();
        reqTodas.flush(mockCobranza);
    });

    it('Cambiar_estado_o_estatus_vuelve_a_la_pagina_1_y_pide_con_el_filtro', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
        httpMock.expectOne((r) => r.url === `${base}/cobranza`).flush(mockCobranza);

        // Simulamos estar en página 2
        componente.cambiarPagina(2);
        const reqPag2 = httpMock.expectOne((r) => r.url === `${base}/cobranza`);
        expect(reqPag2.request.params.get('pagina')).toBe('2');
        reqPag2.flush({ ...mockCobranza, facturas: { ...mockCobranza.facturas, pagina: 2 } });

        // Cambiar estado debe volver a página 1
        componente.cambiarEstado('Pagadas');
        const reqEstado = httpMock.expectOne((r) => r.url === `${base}/cobranza`);
        expect(reqEstado.request.params.get('pagina')).toBe('1');
        expect(reqEstado.request.params.get('estado')).toBe('Pagadas');
        reqEstado.flush(mockCobranza);

        // Cambiar estatus debe volver a página 1
        componente.cambiarEstatus('Programado');
        const reqEstatus = httpMock.expectOne((r) => r.url === `${base}/cobranza`);
        expect(reqEstatus.request.params.get('pagina')).toBe('1');
        expect(reqEstatus.request.params.get('estatus')).toBe('Programado');
        reqEstatus.flush(mockCobranza);
    });

    it('Buscar_manda_q_recortado_y_Limpiar_restablece_todo', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
        httpMock.expectOne((r) => r.url === `${base}/cobranza`).flush(mockCobranza);

        componente.q.set('   cliente SA   ');
        componente.buscar();

        const reqBuscar = httpMock.expectOne((r) => r.url === `${base}/cobranza`);
        expect(reqBuscar.request.params.get('q')).toBe('cliente SA');
        expect(reqBuscar.request.params.get('pagina')).toBe('1');
        reqBuscar.flush(mockCobranza);

        componente.limpiar();
        const reqLimpiar = httpMock.expectOne((r) => r.url === `${base}/cobranza`);
        expect(reqLimpiar.request.params.has('q')).toBeFalse();
        expect(reqLimpiar.request.params.get('estado')).toBe('Abiertas');
        expect(reqLimpiar.request.params.has('empresaId')).toBeFalse();
        expect(reqLimpiar.request.params.has('estatus')).toBeFalse();
        expect(componente.q()).toBe('');
        reqLimpiar.flush(mockCobranza);
    });

    it('Una_respuesta_tardia_de_otro_filtro_no_pisa_a_la_actual', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
        const reqInicial = httpMock.expectOne((r) => r.url === `${base}/cobranza`);

        componente.cambiarEstado('Pagadas');
        const reqNueva = httpMock.expectOne((r) => r.url === `${base}/cobranza` && r.params.get('estado') === 'Pagadas');

        expect(reqInicial.cancelled).toBeTrue();
        reqNueva.flush(mockCobranza);
        fixture.detectChanges();

        expect(componente.filas().length).toBe(2);
    });

    it('El_resumen_muestra_una_tarjeta_por_moneda_con_sus_cuatro_tramos', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
        httpMock.expectOne((r) => r.url === `${base}/cobranza`).flush(mockCobranza);
        fixture.detectChanges();

        const tarjetas = fixture.debugElement.queryAll(By.css('[data-testid="tarjeta-resumen"]'));
        expect(tarjetas.length).toBe(1);

        const textoTarjeta = tarjetas[0].nativeElement.textContent;
        expect(textoTarjeta).toContain('MXN');
        expect(textoTarjeta).toContain('$13,000.00 MXN');
        expect(textoTarjeta).toContain('$8,000.00 MXN'); // Atrasado
        expect(textoTarjeta).toContain('$5,000.00 MXN'); // Próximos 30 días
    });

    it('La_tabla_trae_las_acciones_en_la_primera_columna_y_marca_Atrasada_con_los_dias', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
        httpMock.expectOne((r) => r.url === `${base}/cobranza`).flush(mockCobranza);
        fixture.detectChanges();

        const primeraCelda = fixture.debugElement.query(By.css('tbody tr td:first-child'));
        expect(primeraCelda).toBeTruthy();
        expect(primeraCelda.nativeElement.getAttribute('data-testid')).toBe('acciones-cobranza');

        const btnEditar = primeraCelda.query(By.css('button[aria-label="Editar seguimiento"]'));
        expect(btnEditar).toBeTruthy();

        // Verificar etiqueta Atrasada
        const filas = fixture.debugElement.queryAll(By.css('[data-testid="fila-factura"]'));
        expect(filas.length).toBe(2);

        const etiquetaAtrasada0 = filas[0].query(By.css('[data-testid="etiqueta-atrasada"]'));
        expect(etiquetaAtrasada0).toBeTruthy();
        expect(etiquetaAtrasada0.nativeElement.textContent).toContain('Atrasada 20 d');

        const etiquetaAtrasada1 = filas[1].query(By.css('[data-testid="etiqueta-atrasada"]'));
        expect(etiquetaAtrasada1).toBeNull();
    });

    it('Muestra_vacio_error_con_Reintentar_y_cargando', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);

        // 1. Error con Reintentar
        const reqError = httpMock.expectOne((r) => r.url === `${base}/cobranza`);
        reqError.flush({ mensaje: 'Error al cargar cartera' }, { status: 500, statusText: 'Server Error' });
        fixture.detectChanges();

        const bannerError = fixture.debugElement.query(By.css('[data-testid="error-cobranza"]'));
        expect(bannerError).toBeTruthy();
        expect(bannerError.nativeElement.textContent).toContain('Error al cargar cartera');

        const btnReintentar = fixture.debugElement.query(By.css('[data-testid="boton-reintentar"]'));
        expect(btnReintentar).toBeTruthy();

        // Reintentar
        btnReintentar.nativeElement.click();
        const reqReintento = httpMock.expectOne((r) => r.url === `${base}/cobranza`);

        // 2. Cargando
        fixture.detectChanges();
        expect(componente.cargando()).toBeTrue();

        // 3. Vacío
        const cobranzaVacia: Cobranza = {
            hoy: '2026-11-04',
            empresaId: null,
            empresasIncluidas: 2,
            resumen: [],
            facturas: { pagina: 1, tamano: 50, total: 0, items: [] }
        };
        reqReintento.flush(cobranzaVacia);
        fixture.detectChanges();

        expect(fixture.debugElement.query(By.css('[data-testid="error-cobranza"]'))).toBeNull();
        expect(fixture.debugElement.query(By.css('[data-testid="vacio-cobranza"]'))).toBeTruthy();
    });

    it('El_paginador_pide_la_pagina_elegida_conservando_los_filtros', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
        httpMock.expectOne((r) => r.url === `${base}/cobranza`).flush(mockCobranza);

        componente.empresaId.set(2);
        componente.estado.set('Todas');
        componente.cambiarPagina(3);

        const req = httpMock.expectOne((r) => r.url === `${base}/cobranza`);
        expect(req.request.params.get('pagina')).toBe('3');
        expect(req.request.params.get('empresaId')).toBe('2');
        expect(req.request.params.get('estado')).toBe('Todas');
        req.flush(mockCobranza);
    });
});

describe('CobranzaComponent - deteccion automatica y animaciones reales', () => {
    let fixture: ComponentFixture<CobranzaComponent>;
    let httpMock: HttpTestingController;
    const base = `${environment.apiUrl}/Finanzas`;

    const mockEmpresas: Empresa[] = [
        { empresaId: 1, rfc: 'AAA010101AAA', nombre: 'Empresa Uno', tipo: 'M', activa: true },
        { empresaId: 2, rfc: 'BBB020202BBB', nombre: 'Empresa Dos', tipo: 'M', activa: true }
    ];

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CobranzaComponent, HttpClientTestingModule],
            providers: [provideAnimations()]
        }).compileComponents();

        fixture = TestBed.createComponent(CobranzaComponent);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('Elegir_empresa_con_animaciones_reales_no_cae_en_un_ciclo_de_deteccion_de_cambios', async () => {
        fixture.autoDetectChanges(true);

        const reqs = httpMock.match(() => true);
        for (const r of reqs) {
            if (r.request.url.includes('/empresas')) {
                r.flush(mockEmpresas);
            } else if (r.request.url.includes('/cobranza')) {
                r.flush({
                    hoy: '2026-11-04',
                    empresaId: null,
                    empresasIncluidas: 2,
                    resumen: [],
                    facturas: { pagina: 1, tamano: 50, total: 0, items: [] }
                });
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

        // Opción 1 es la primera empresa real (Opción 0 es "Todas")
        options[1]._getHostElement().click();
        await fixture.whenStable();

        const pendingReqs = httpMock.match(() => true);
        for (const r of pendingReqs) {
            r.flush({
                hoy: '2026-11-04',
                empresaId: 1,
                empresasIncluidas: 1,
                resumen: [],
                facturas: { pagina: 1, tamano: 50, total: 0, items: [] }
            });
        }

        await fixture.whenStable();
        expect(httpMock.match(() => true).length).toBe(0);
    });
});
