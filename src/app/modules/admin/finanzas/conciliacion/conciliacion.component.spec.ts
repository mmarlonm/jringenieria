import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpClientTestingModule, HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ManualDialogComponent } from './manual-dialog/manual-dialog.component';
import { environment } from 'environments/environment';

import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';
import { Cuenta, Empresa, MovimientoConciliacion, ResumenConciliacion } from '../finanzas.types';
import { MovimientoTarjetaComponent } from './movimiento-tarjeta/movimiento-tarjeta.component';
import { PaginadorComponent } from '../shared/paginador/paginador.component';
import { ConciliacionComponent } from './conciliacion.component';

describe('ConciliacionComponent (F4 - solo lectura)', () => {
    const base = `${environment.apiUrl}/Finanzas`;

    const empresas: Empresa[] = [
        { empresaId: 3, rfc: 'AAA010101AAA', nombre: 'Empresa Ficticia', tipo: 'M', activa: true },
        { empresaId: 4, rfc: 'BBB020202BB2', nombre: 'Otra Empresa Ficticia', tipo: 'M', activa: true }
    ];

    const cuentas: Cuenta[] = [
        { cuentaId: 5, empresaId: 3, banco: 'BBVA', alias: 'Cheques principal', tipo: 'Cheques', moneda: 'MXN', terminacion: '1234', activa: true },
        { cuentaId: 6, empresaId: 3, banco: 'BBVA', alias: 'Tarjeta dólares', tipo: 'TarjetaCredito', moneda: 'USD', terminacion: '56789', activa: true }
    ];

    const resumenBase: ResumenConciliacion = {
        movimientos: { total: 10, sinConciliar: 4, conSugerencia: 3, parcial: 1, conciliado: 1, clasificado: 1 },
        cfdi: { pendiente: 5, parcial: 2, pagado: 8, pagadoEnEfectivo: 1, cancelado: 0 }
    };

    const movA: MovimientoConciliacion = {
        movimientoId: 101,
        cuentaId: 5,
        fecha: '2026-03-05T10:00:00',
        descripcion: 'ABONO CLIENTE FICTICIO',
        importe: 1500.00,
        saldo: 10500.00,
        tipoOperacion: 'SPEI recibido',
        clase: null,
        estado: 'ConSugerencia',
        pendiente: 1500.00,
        sugerencias: [
            {
                conciliacionId: 1,
                cfdiId: 50,
                uuid: '11111111-2222-3333-4444-555555555555',
                serie: 'A',
                folio: '100',
                contraparte: 'Cliente Ficticio SA de CV',
                total: 1500.00,
                saldo: 1500.00,
                moneda: 'MXN',
                regla: 'SALDO_EXACTO',
                confianza: 'Alta',
                estado: 'Sugerida',
                importeAplicado: 1500.00
            }
        ],
        confirmadas: []
    };

    const movB: MovimientoConciliacion = {
        movimientoId: 102,
        cuentaId: 6,
        fecha: '2026-03-06T12:00:00',
        descripcion: 'COMPRA PROVEEDOR USD',
        importe: -200.00,
        saldo: 5000.00,
        tipoOperacion: null,
        clase: null,
        estado: 'SinConciliar',
        pendiente: 200.00,
        sugerencias: [],
        confirmadas: []
    };

    let fixture: ComponentFixture<ConciliacionComponent>;
    let componente: ConciliacionComponent;
    let httpMock: HttpTestingController;
    const tienePermisoSignal = signal(false);
    let permisosSpy: jasmine.Spy;

    const el = (): HTMLElement => fixture.nativeElement;
    const texto = (): string => el().textContent ?? '';
    const boton = (etiqueta: string): HTMLButtonElement =>
        Array.from(el().querySelectorAll('button')).find((b) => b.textContent?.includes(etiqueta)) as HTMLButtonElement;
    const botonExacto = (etiqueta: string): HTMLButtonElement =>
        Array.from(el().querySelectorAll('button')).find((b) => b.textContent?.trim() === etiqueta) as HTMLButtonElement;

    beforeEach(async () => {
        // Mock de fecha SIN jasmine.clock().install() para no romper temporizadores de Material
        jasmine.clock().mockDate(new Date(2026, 2, 17));

        tienePermisoSignal.set(false);
        permisosSpy = jasmine.createSpy('tiene').and.callFake(() => tienePermisoSignal());

        await TestBed.configureTestingModule({
            imports: [HttpClientTestingModule, ConciliacionComponent],
            providers: [
                provideNoopAnimations(),
                {
                    provide: PermisosEspecialesService,
                    useValue: { tiene: permisosSpy }
                }
            ]
        }).compileComponents();

        httpMock = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(ConciliacionComponent);
        componente = fixture.componentInstance;
    });

    afterEach(() => {
        jasmine.clock().uninstall();
        httpMock.verify();
    });

    function inicializarConEmpresa(empresaId = 3): void {
        fixture.detectChanges();
        const reqEmpresas = httpMock.expectOne(`${base}/empresas`);
        reqEmpresas.flush(empresas);
        fixture.detectChanges();

        componente.elegirEmpresa(empresaId);
        fixture.detectChanges();

        const reqCuentas = httpMock.expectOne(req => req.url === `${base}/cuentas` && req.params.get('empresaId') === String(empresaId));
        reqCuentas.flush(cuentas);

        const reqResumen = httpMock.expectOne(req => req.url === `${base}/conciliacion/resumen` && req.params.get('empresaId') === String(empresaId));
        reqResumen.flush(resumenBase);

        const reqLista = httpMock.expectOne(req => req.url === `${base}/conciliacion/movimientos` && req.params.get('empresaId') === String(empresaId));
        reqLista.flush({ pagina: 1, tamano: 50, total: 2, items: [movA, movB] });
        fixture.detectChanges();
    }

    it('Al_iniciar_pide_las_empresas_y_sin_empresa_muestra_el_estado_vacio', () => {
        fixture.detectChanges();
        const reqEmpresas = httpMock.expectOne(`${base}/empresas`);
        reqEmpresas.flush(empresas);
        fixture.detectChanges();

        expect(texto()).toContain('Elige una empresa para ver sus movimientos');
        expect(componente.empresaId()).toBeNull();
    });

    it('Error_de_empresas_muestra_Reintentar', () => {
        fixture.detectChanges();
        const reqEmpresas = httpMock.expectOne(`${base}/empresas`);
        reqEmpresas.flush({ message: 'Error de red' }, { status: 500, statusText: 'Server Error' });
        fixture.detectChanges();

        expect(texto()).toContain('Reintentar');
        boton('Reintentar').click();
        const req2 = httpMock.expectOne(`${base}/empresas`);
        req2.flush(empresas);
        fixture.detectChanges();

        expect(componente.empresas().length).toBe(2);
    });

    it('Al_elegir_empresa_pide_cuentas_resumen_y_lista_con_el_mes_actual_por_defecto', () => {
        fixture.detectChanges();
        const reqEmpresas = httpMock.expectOne(`${base}/empresas`);
        reqEmpresas.flush(empresas);
        fixture.detectChanges();

        componente.elegirEmpresa(3);
        fixture.detectChanges();

        const reqC = httpMock.expectOne(r => r.url === `${base}/cuentas` && r.params.get('empresaId') === '3');
        reqC.flush(cuentas);

        const reqR = httpMock.expectOne(r => r.url === `${base}/conciliacion/resumen`);
        expect(reqR.request.params.get('empresaId')).toBe('3');
        expect(reqR.request.params.get('desde')).toBe('2026-03-01');
        expect(reqR.request.params.get('hasta')).toBe('2026-03-17');
        expect(reqR.request.params.has('cuentaId')).toBeFalse();
        reqR.flush(resumenBase);

        const reqL = httpMock.expectOne(r => r.url === `${base}/conciliacion/movimientos`);
        expect(reqL.request.params.get('empresaId')).toBe('3');
        expect(reqL.request.params.get('desde')).toBe('2026-03-01');
        expect(reqL.request.params.get('hasta')).toBe('2026-03-17');
        expect(reqL.request.params.get('pagina')).toBe('1');
        expect(reqL.request.params.get('tamano')).toBe('50');
        reqL.flush({ pagina: 1, tamano: 50, total: 2, items: [movA, movB] });
        fixture.detectChanges();
    });

    it('Muestra_el_resumen_y_una_tarjeta_por_movimiento_con_la_moneda_de_su_cuenta', () => {
        inicializarConEmpresa(3);

        expect(texto()).toContain('Facturas de la empresa');
        expect(texto()).toContain('Sin conciliar');

        const tarjetas = fixture.debugElement.queryAll(By.directive(MovimientoTarjetaComponent));
        expect(tarjetas.length).toBe(2);
        expect(tarjetas[0].componentInstance.moneda).toBe('MXN');
        expect(tarjetas[1].componentInstance.moneda).toBe('USD');
    });

    it('Pulsar_un_estado_del_resumen_filtra_y_pulsarlo_de_nuevo_lo_quita', () => {
        inicializarConEmpresa(3);

        componente.pulsarEstadoResumen('ConSugerencia');
        fixture.detectChanges();
        expect(componente.estado).toBe('ConSugerencia');
        const req1 = httpMock.expectOne(r => r.url === `${base}/conciliacion/movimientos` && r.params.get('estado') === 'ConSugerencia');
        req1.flush({ pagina: 1, tamano: 50, total: 1, items: [movA] });
        fixture.detectChanges();

        componente.pulsarEstadoResumen('ConSugerencia');
        fixture.detectChanges();
        expect(componente.estado).toBe('');
        const req2 = httpMock.expectOne(r => r.url === `${base}/conciliacion/movimientos` && !r.params.has('estado'));
        req2.flush({ pagina: 1, tamano: 50, total: 2, items: [movA, movB] });
        fixture.detectChanges();
    });

    it('Cambiar_un_filtro_pide_la_pagina_1_de_lista_y_resumen', () => {
        inicializarConEmpresa(3);

        componente.q = 'Ficticio';
        componente.alCambiarFiltro();
        fixture.detectChanges();

        const reqL = httpMock.expectOne(r => r.url === `${base}/conciliacion/movimientos` && r.params.get('q') === 'Ficticio' && r.params.get('pagina') === '1');
        expect(reqL.request.params.get('q')).toBe('Ficticio');
        reqL.flush({ pagina: 1, tamano: 50, total: 1, items: [movA] });
        const reqR = httpMock.expectOne(r => r.url === `${base}/conciliacion/resumen`);
        expect(reqR.request.params.get('empresaId')).toBe('3');
        reqR.flush(resumenBase);
        fixture.detectChanges();
    });

    it('Una_respuesta_tardia_de_otros_filtros_no_pisa_la_lista_actual', () => {
        inicializarConEmpresa(3);

        componente.estado = 'ConSugerencia';
        componente.alCambiarEstado('ConSugerencia');
        const primera: TestRequest = httpMock.expectOne(r => r.url === `${base}/conciliacion/movimientos` && r.params.get('estado') === 'ConSugerencia');

        componente.estado = 'Conciliado';
        componente.alCambiarEstado('Conciliado');

        expect(primera.cancelled).toBeTrue();
        const segunda = httpMock.expectOne(r => r.url === `${base}/conciliacion/movimientos` && r.params.get('estado') === 'Conciliado');
        const movConciliado = { ...movA, movimientoId: 999, descripcion: 'MOV CONCILIADO SEGUNDO', estado: 'Conciliado' as const };
        segunda.flush({ pagina: 1, tamano: 50, total: 1, items: [movConciliado] });
        fixture.detectChanges();

        expect(texto()).toContain('MOV CONCILIADO SEGUNDO');
    });

    it('Una_respuesta_tardia_del_resumen_no_pisa_el_actual', () => {
        inicializarConEmpresa(3);

        componente.desde = '2026-03-05';
        componente.alCambiarFiltro();
        const primeraR: TestRequest = httpMock.expectOne(r => r.url === `${base}/conciliacion/resumen` && r.params.get('desde') === '2026-03-05');
        const reqL1 = httpMock.expectOne(r => r.url === `${base}/conciliacion/movimientos` && r.params.get('desde') === '2026-03-05');

        componente.desde = '2026-03-10';
        componente.alCambiarFiltro();

        expect(primeraR.cancelled).toBeTrue();
        expect(reqL1.cancelled).toBeTrue();

        const segundaR = httpMock.expectOne(r => r.url === `${base}/conciliacion/resumen` && r.params.get('desde') === '2026-03-10');
        const segundaL = httpMock.expectOne(r => r.url === `${base}/conciliacion/movimientos` && r.params.get('desde') === '2026-03-10');

        const nuevoResumen: ResumenConciliacion = {
            movimientos: { total: 77, sinConciliar: 20, conSugerencia: 10, parcial: 7, conciliado: 30, clasificado: 10 },
            cfdi: { pendiente: 3, parcial: 2, pagado: 10, pagadoEnEfectivo: 1, cancelado: 1 }
        };
        segundaR.flush(nuevoResumen);
        segundaL.flush({ pagina: 1, tamano: 50, total: 0, items: [] });
        fixture.detectChanges();

        expect(componente.resumen()?.movimientos.total).toBe(77);
    });

    it('El_resumen_se_pide_con_la_cuenta_elegida_y_no_se_pide_con_un_periodo_de_mas_de_366_dias_y_en_su_lugar_dice_el_motivo', () => {
        inicializarConEmpresa(3);

        componente.elegirCuenta(5);
        fixture.detectChanges();
        const reqR1 = httpMock.expectOne(r => r.url === `${base}/conciliacion/resumen` && r.params.get('cuentaId') === '5');
        reqR1.flush(resumenBase);
        const reqL1 = httpMock.expectOne(r => r.url === `${base}/conciliacion/movimientos` && r.params.get('cuentaId') === '5');
        reqL1.flush({ pagina: 1, tamano: 50, total: 1, items: [movA] });
        fixture.detectChanges();

        componente.desde = '2025-01-01';
        componente.hasta = '2026-01-05';
        componente.alCambiarFiltro();
        fixture.detectChanges();

        httpMock.expectNone(r => r.url === `${base}/conciliacion/resumen`);
        const reqL2 = httpMock.expectOne(r => r.url === `${base}/conciliacion/movimientos` && r.params.get('desde') === '2025-01-01');
        reqL2.flush({ pagina: 1, tamano: 50, total: 0, items: [] });
        fixture.detectChanges();

        expect(componente.motivoResumenInvalido()).toBe('El periodo no puede pasar de 366 días.');
        expect(texto()).toContain('Resumen no disponible: El periodo no puede pasar de 366 días.');
    });

    it('Los_campos_de_fecha_y_texto_consultan_al_cambiar_no_por_tecla', () => {
        inicializarConEmpresa(3);

        const inputQ: HTMLInputElement = fixture.nativeElement.querySelector('input[placeholder="Descripción o referencia"]');
        inputQ.value = 'busqueda';
        inputQ.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        httpMock.expectNone(r => r.url === `${base}/conciliacion/movimientos`);

        componente.q = 'busqueda';
        inputQ.dispatchEvent(new Event('change'));
        fixture.detectChanges();

        const reqL = httpMock.expectOne(r => r.url === `${base}/conciliacion/movimientos` && r.params.get('q') === 'busqueda');
        expect(reqL.request.params.get('q')).toBe('busqueda');
        reqL.flush({ pagina: 1, tamano: 50, total: 0, items: [] });
        const reqR = httpMock.expectOne(r => r.url === `${base}/conciliacion/resumen`);
        expect(reqR.request.params.get('empresaId')).toBe('3');
        reqR.flush(resumenBase);
        fixture.detectChanges();
    });

    it('Fechas_invertidas_no_consultan_y_dicen_por_que', () => {
        inicializarConEmpresa(3);

        componente.desde = '2026-03-20';
        componente.hasta = '2026-03-10';
        componente.alCambiarFiltro();
        fixture.detectChanges();

        httpMock.expectNone(r => r.url === `${base}/conciliacion/movimientos`);
        httpMock.expectNone(r => r.url === `${base}/conciliacion/resumen`);
        expect(texto()).toContain('La fecha inicial no puede ser posterior a la final.');
    });

    it('Error_de_lista_muestra_Reintentar_y_reintenta_la_misma_pagina', () => {
        inicializarConEmpresa(3);

        componente.cargarLista(2);
        const reqFalla = httpMock.expectOne(r => r.url === `${base}/conciliacion/movimientos` && r.params.get('pagina') === '2');
        reqFalla.flush({ message: 'Error de red' }, { status: 500, statusText: 'Server Error' });
        fixture.detectChanges();

        expect(texto()).toContain('Reintentar');
        boton('Reintentar').click();
        const reqReintento = httpMock.expectOne(r => r.url === `${base}/conciliacion/movimientos` && r.params.get('pagina') === '2');
        reqReintento.flush({ pagina: 2, tamano: 50, total: 0, items: [] });
        fixture.detectChanges();
    });

    it('Lista_vacia_con_y_sin_filtros_muestra_cada_mensaje', () => {
        inicializarConEmpresa(3);

        componente.lista.set({ pagina: 1, tamano: 50, total: 0, items: [] });
        fixture.detectChanges();
        expect(texto()).toContain('No hay movimientos en este periodo');

        componente.estado = 'Conciliado';
        fixture.detectChanges();
        expect(texto()).toContain('Ningún movimiento coincide con los filtros');
    });

    it('Error_de_resumen_no_bloquea_la_lista', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(empresas);
        fixture.detectChanges();

        componente.elegirEmpresa(3);
        fixture.detectChanges();

        httpMock.expectOne(r => r.url === `${base}/cuentas`).flush(cuentas);
        const reqRes = httpMock.expectOne(r => r.url === `${base}/conciliacion/resumen`);
        reqRes.flush({ message: 'Falla resumen' }, { status: 500, statusText: 'Server Error' });
        const reqLis = httpMock.expectOne(r => r.url === `${base}/conciliacion/movimientos`);
        reqLis.flush({ pagina: 1, tamano: 50, total: 2, items: [movA, movB] });
        fixture.detectChanges();

        expect(texto()).toContain('No se pudo cargar el resumen.');
        const tarjetas = fixture.debugElement.queryAll(By.directive(MovimientoTarjetaComponent));
        expect(tarjetas.length).toBe(2);
    });

    it('Limpiar_filtros_vuelve_al_mes_actual', () => {
        inicializarConEmpresa(3);

        componente.cuentaId.set(5);
        componente.estado = 'ConSugerencia';
        componente.q = 'test';
        componente.desde = '2026-01-01';
        componente.hasta = '2026-01-31';

        boton('Limpiar filtros').click();
        fixture.detectChanges();

        expect(componente.cuentaId()).toBeNull();
        expect(componente.estado).toBe('');
        expect(componente.q).toBe('');
        expect(componente.desde).toBe('2026-03-01');
        expect(componente.hasta).toBe('2026-03-17');

        const reqL = httpMock.expectOne(r => r.url === `${base}/conciliacion/movimientos` && r.params.get('desde') === '2026-03-01' && !r.params.has('cuentaId'));
        reqL.flush({ pagina: 1, tamano: 50, total: 0, items: [] });
        const reqR = httpMock.expectOne(r => r.url === `${base}/conciliacion/resumen` && r.params.get('desde') === '2026-03-01' && !r.params.has('cuentaId'));
        reqR.flush(resumenBase);
        fixture.detectChanges();
    });

    it('El_paginador_pide_la_pagina_elegida', () => {
        inicializarConEmpresa(3);

        const paginador = fixture.debugElement.query(By.directive(PaginadorComponent)).componentInstance as PaginadorComponent;
        paginador.cambio.emit(2);
        fixture.detectChanges();

        const req = httpMock.expectOne(r => r.url === `${base}/conciliacion/movimientos` && r.params.get('pagina') === '2');
        expect(req.request.params.get('pagina')).toBe('2');
        req.flush({ pagina: 2, tamano: 50, total: 2, items: [movA, movB] });
        fixture.detectChanges();
    });

    describe('acciones (F5)', () => {
        beforeEach(() => {
            tienePermisoSignal.set(true);
        });

        it('Sin_permiso_no_hay_botones_de_escritura', () => {
            tienePermisoSignal.set(false);
            inicializarConEmpresa(3);

            expect(boton('Sugerir conciliaciones')).toBeFalsy();
            expect(boton('Confirmar Altas')).toBeFalsy();
            expect(boton('Confirmar')).toBeFalsy();
            expect(boton('Rechazar')).toBeFalsy();
            expect(boton('Aplicar a mano')).toBeFalsy();
        });

        it('Sugerir_esta_deshabilitado_con_periodo_invalido_y_dice_por_que', () => {
            inicializarConEmpresa(3);
            const btnSugerir = () => boton('Sugerir conciliaciones');

            componente.desde = '';
            fixture.detectChanges();
            expect(btnSugerir().disabled).toBeTrue();
            expect(texto()).toContain('Indica el periodo (desde y hasta).');

            componente.desde = '2026-03-20';
            componente.hasta = '2026-03-10';
            fixture.detectChanges();
            expect(btnSugerir().disabled).toBeTrue();
            expect(texto()).toContain('La fecha inicial no puede ser posterior a la final.');

            componente.desde = '2025-01-01';
            componente.hasta = '2026-01-05';
            fixture.detectChanges();
            expect(btnSugerir().disabled).toBeTrue();
            expect(texto()).toContain('El periodo no puede pasar de 366 días.');
        });

        it('Sugerir_envia_el_cuerpo_exacto_muestra_el_resultado_y_recarga', () => {
            inicializarConEmpresa(3);

            boton('Sugerir conciliaciones').click();
            fixture.detectChanges();

            const reqSug = httpMock.expectOne({ method: 'POST', url: `${base}/conciliacion/sugerir` });
            expect(reqSug.request.body).toEqual({
                empresaId: 3,
                cuentaId: null,
                desde: '2026-03-01',
                hasta: '2026-03-17'
            });
            reqSug.flush({
                movimientosAnalizados: 15,
                sugerenciasNuevas: 5,
                cfdiConsiderados: 20
            });
            fixture.detectChanges();

            expect(texto()).toContain('5 sugerencias nuevas · 15 movimientos analizados · 20 facturas consideradas');

            const reqL = httpMock.expectOne(r => r.url === `${base}/conciliacion/movimientos`);
            reqL.flush({ pagina: 1, tamano: 50, total: 2, items: [movA, movB] });
            const reqR = httpMock.expectOne(r => r.url === `${base}/conciliacion/resumen`);
            reqR.flush(resumenBase);
            fixture.detectChanges();
        });

        it('Sugerir_con_error_muestra_el_mensaje', () => {
            inicializarConEmpresa(3);

            boton('Sugerir conciliaciones').click();
            fixture.detectChanges();

            const reqSug = httpMock.expectOne({ method: 'POST', url: `${base}/conciliacion/sugerir` });
            reqSug.flush({ mensaje: 'Error al generar sugerencias' }, { status: 500, statusText: 'Server Error' });
            fixture.detectChanges();

            expect(texto()).toContain('Error al generar sugerencias');
        });

        it('Confirmar_manda_una_peticion_y_recarga', () => {
            inicializarConEmpresa(3);

            const btnConfirmar = botonExacto('Confirmar');
            expect(btnConfirmar).toBeDefined();
            btnConfirmar.click();
            fixture.detectChanges();

            const reqConf = httpMock.expectOne({ method: 'POST', url: `${base}/conciliacion/1/confirmar` });
            expect(reqConf.request.body).toBeNull();
            reqConf.flush({ ...movA.sugerencias[0], estado: 'Confirmada' });
            fixture.detectChanges();

            const reqL = httpMock.expectOne(r => r.url === `${base}/conciliacion/movimientos`);
            reqL.flush({ pagina: 1, tamano: 50, total: 2, items: [movA, movB] });
            const reqR = httpMock.expectOne(r => r.url === `${base}/conciliacion/resumen`);
            reqR.flush(resumenBase);
            fixture.detectChanges();
        });

        it('Doble_clic_en_Confirmar_manda_una_sola_peticion', () => {
            inicializarConEmpresa(3);

            componente.confirmar(1);
            componente.confirmar(1);
            fixture.detectChanges();

            const reqs = httpMock.match({ method: 'POST', url: `${base}/conciliacion/1/confirmar` });
            expect(reqs.length).toBe(1);
            reqs[0].flush({ ...movA.sugerencias[0], estado: 'Confirmada' });
            fixture.detectChanges();

            httpMock.expectOne(r => r.url === `${base}/conciliacion/movimientos`).flush({ pagina: 1, tamano: 50, total: 0, items: [] });
            httpMock.expectOne(r => r.url === `${base}/conciliacion/resumen`).flush(resumenBase);
        });

        it('Doble_clic_en_Rechazar_manda_una_sola_peticion', () => {
            inicializarConEmpresa(3);

            componente.rechazar(1);
            componente.rechazar(1);
            fixture.detectChanges();

            const reqs = httpMock.match({ method: 'POST', url: `${base}/conciliacion/1/rechazar` });
            expect(reqs.length).toBe(1);
            reqs[0].flush(null);
            fixture.detectChanges();

            httpMock.expectOne(r => r.url === `${base}/conciliacion/movimientos`).flush({ pagina: 1, tamano: 50, total: 0, items: [] });
            httpMock.expectOne(r => r.url === `${base}/conciliacion/resumen`).flush(resumenBase);
        });

        it('Doble_clic_en_Deshacer_manda_una_sola_peticion', () => {
            const movConConfirmada: MovimientoConciliacion = {
                ...movA,
                sugerencias: [],
                confirmadas: [{ ...movA.sugerencias[0], conciliacionId: 44, estado: 'Confirmada' }]
            };
            fixture.detectChanges();
            httpMock.expectOne(`${base}/empresas`).flush(empresas);
            fixture.detectChanges();
            componente.elegirEmpresa(3);
            fixture.detectChanges();
            httpMock.expectOne(r => r.url === `${base}/cuentas`).flush(cuentas);
            httpMock.expectOne(r => r.url === `${base}/conciliacion/resumen`).flush(resumenBase);
            httpMock.expectOne(r => r.url === `${base}/conciliacion/movimientos`).flush({ pagina: 1, tamano: 50, total: 1, items: [movConConfirmada] });
            fixture.detectChanges();

            componente.deshacer(44);
            componente.deshacer(44);
            fixture.detectChanges();

            const reqs = httpMock.match({ method: 'POST', url: `${base}/conciliacion/44/deshacer` });
            expect(reqs.length).toBe(1);
            reqs[0].flush(null);
            fixture.detectChanges();

            httpMock.expectOne(r => r.url === `${base}/conciliacion/movimientos`).flush({ pagina: 1, tamano: 50, total: 0, items: [] });
            httpMock.expectOne(r => r.url === `${base}/conciliacion/resumen`).flush(resumenBase);
        });

        it('Confirmar_con_409_muestra_el_mensaje_del_API_y_recarga', () => {
            inicializarConEmpresa(3);

            componente.confirmar(1);
            fixture.detectChanges();

            const reqConf = httpMock.expectOne({ method: 'POST', url: `${base}/conciliacion/1/confirmar` });
            reqConf.flush({ mensaje: 'La factura ya fue pagada por otra vía.' }, { status: 409, statusText: 'Conflict' });
            fixture.detectChanges();

            expect(texto()).toContain('La factura ya fue pagada por otra vía.');

            httpMock.expectOne(r => r.url === `${base}/conciliacion/movimientos`).flush({ pagina: 1, tamano: 50, total: 0, items: [] });
            httpMock.expectOne(r => r.url === `${base}/conciliacion/resumen`).flush(resumenBase);
            fixture.detectChanges();
        });

        it('Lote_pide_confirmacion_antes_de_enviar_y_Cancelar_no_envia', () => {
            inicializarConEmpresa(3);

            const btnLote = boton('Confirmar Altas');
            expect(btnLote).toBeDefined();
            btnLote.click();
            fixture.detectChanges();

            expect(texto()).toContain('Se confirmarán 1 sugerencias de confianza Alta');
            expect(texto()).toContain('No se pueden confirmar solas');

            boton('Cancelar').click();
            fixture.detectChanges();

            httpMock.expectNone({ method: 'POST', url: `${base}/conciliacion/confirmar-lote` });
            expect(texto()).not.toContain('No se pueden confirmar solas');
        });

        it('Lote_envia_los_ids_de_las_Altas_y_muestra_confirmadas_y_fallidas_con_motivo', () => {
            inicializarConEmpresa(3);

            boton('Confirmar Altas').click();
            fixture.detectChanges();

            const franja = el().querySelector('.bg-emerald-50');
            const btnConfirmarLote = Array.from(franja?.querySelectorAll('button') ?? []).find(b => b.textContent?.trim() === 'Confirmar');
            expect(btnConfirmarLote).toBeDefined();
            btnConfirmarLote!.click();
            fixture.detectChanges();

            const reqLote = httpMock.expectOne({ method: 'POST', url: `${base}/conciliacion/confirmar-lote` });
            expect(reqLote.request.body).toEqual({ ids: [1] });
            reqLote.flush({
                confirmadas: [],
                fallidas: [{ conciliacionId: 1, motivo: 'Factura cancelada en el SAT' }]
            });
            fixture.detectChanges();

            expect(texto()).toContain('Confirmadas: 0');
            expect(texto()).toContain('No se pudieron confirmar');
            expect(texto()).toContain('Factura cancelada en el SAT');
            expect(texto()).toContain('ABONO CLIENTE FICTICIO');

            httpMock.expectOne(r => r.url === `${base}/conciliacion/movimientos`).flush({ pagina: 1, tamano: 50, total: 0, items: [] });
            httpMock.expectOne(r => r.url === `${base}/conciliacion/resumen`).flush(resumenBase);
        });

        it('Lote_no_se_envia_dos_veces_con_doble_clic', () => {
            inicializarConEmpresa(3);

            componente.confirmandoLoteFranja.set(true);
            fixture.detectChanges();

            componente.ejecutarConfirmarLote();
            componente.ejecutarConfirmarLote();
            fixture.detectChanges();

            const reqs = httpMock.match({ method: 'POST', url: `${base}/conciliacion/confirmar-lote` });
            expect(reqs.length).toBe(1);
            reqs[0].flush({ confirmadas: [1], fallidas: [] });
            fixture.detectChanges();

            httpMock.expectOne(r => r.url === `${base}/conciliacion/movimientos`).flush({ pagina: 1, tamano: 50, total: 0, items: [] });
            httpMock.expectOne(r => r.url === `${base}/conciliacion/resumen`).flush(resumenBase);
        });

        it('Aplicar_a_mano_abre_el_dialogo_y_recarga_si_devuelve_un_vinculo', () => {
            inicializarConEmpresa(3);

            const vinculoCreado = { ...movA.sugerencias[0], conciliacionId: 99, regla: 'MANUAL', estado: 'Confirmada' as const };
            const dialogSpy = spyOn(TestBed.inject(MatDialog), 'open').and.returnValue({
                afterClosed: () => of(vinculoCreado)
            } as any);

            componente.aplicarManual(movA);
            fixture.detectChanges();

            expect(dialogSpy).toHaveBeenCalledWith(ManualDialogComponent, {
                width: '40rem',
                maxWidth: '95vw',
                data: { movimiento: movA, moneda: 'MXN' }
            });

            httpMock.expectOne(r => r.url === `${base}/conciliacion/movimientos`).flush({ pagina: 1, tamano: 50, total: 0, items: [] });
            httpMock.expectOne(r => r.url === `${base}/conciliacion/resumen`).flush(resumenBase);
        });

        it('Aplicar_a_mano_cancelado_no_recarga', () => {
            inicializarConEmpresa(3);

            const dialogSpy = spyOn(TestBed.inject(MatDialog), 'open').and.returnValue({
                afterClosed: () => of(undefined)
            } as any);

            componente.aplicarManual(movA);
            fixture.detectChanges();

            expect(dialogSpy).toHaveBeenCalledTimes(1);
            httpMock.expectNone(r => r.url === `${base}/conciliacion/movimientos`);
            httpMock.expectNone(r => r.url === `${base}/conciliacion/resumen`);
        });
    });
});
