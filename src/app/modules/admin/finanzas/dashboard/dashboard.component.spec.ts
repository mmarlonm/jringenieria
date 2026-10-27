import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations, provideAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { MatSelect } from '@angular/material/select';
import { environment } from 'environments/environment';
import { DashboardFinanzasComponent } from './dashboard.component';
import { Dashboard, Empresa } from '../finanzas.types';
import { ORDEN_TARJETAS_DASHBOARD } from '../finanzas.utils';

describe('DashboardFinanzasComponent', () => {
    let component: DashboardFinanzasComponent;
    let fixture: ComponentFixture<DashboardFinanzasComponent>;
    let httpMock: HttpTestingController;

    const base = `${environment.apiUrl}/Finanzas`;

    const mockEmpresas: Empresa[] = [
        { empresaId: 1, rfc: 'AAA010101AAA', nombre: 'Empresa A', tipo: 'M', activa: true },
        { empresaId: 2, rfc: 'BBB020202BB2', nombre: 'Empresa B', tipo: 'M', activa: true }
    ];

    function crearMockDashboard(sobreescrituras?: Partial<Dashboard>): Dashboard {
        return {
            fechaCorte: '2026-10-26T12:00:00Z',
            empresaId: null,
            empresasIncluidas: 2,
            indicadores: [
                {
                    clave: 'SaldoBancos',
                    nombre: 'Saldo bancos',
                    tipo: 'Dinero',
                    definicion: 'Suma del último saldo',
                    origen: 'Bancos',
                    frecuencia: 'Diario',
                    observaciones: 'Las tarjetas de crédito no se suman',
                    disponible: true,
                    pendienteDe: null,
                    valores: [
                        { moneda: 'MXN', valor: 1234.5 },
                        { moneda: 'USD', valor: 200 }
                    ],
                    datosAl: '2026-10-05',
                    calidad: ['Incluye 2 de 2 cuentas activas.']
                },
                {
                    clave: 'PorCobrar',
                    nombre: 'Por cobrar',
                    tipo: 'Dinero',
                    definicion: 'Facturas vigentes menos lo conciliado',
                    origen: 'Facturas emitidas y conciliación',
                    frecuencia: 'Diario',
                    observaciones: 'Aproximado',
                    disponible: true,
                    pendienteDe: null,
                    valores: [{ moneda: 'MXN', valor: 5000 }],
                    datosAl: '2026-10-20',
                    calidad: ['Basado en 5 facturas pendientes o parciales.']
                },
                {
                    clave: 'PorPagar',
                    nombre: 'Por pagar',
                    tipo: 'Dinero',
                    definicion: 'Obligaciones comerciales',
                    origen: 'Compras/Pagos',
                    frecuencia: 'Diario',
                    observaciones: 'Créditos en renglón separado',
                    disponible: false,
                    pendienteDe: 'Pagos',
                    valores: [],
                    datosAl: null,
                    calidad: ['Se activa con el módulo Pagos.']
                },
                {
                    clave: 'DeudaFinanciera',
                    nombre: 'Deuda financiera',
                    tipo: 'Dinero',
                    definicion: 'Saldo insoluto',
                    origen: 'Créditos',
                    frecuencia: 'Mensual',
                    observaciones: 'No sumar con CxP',
                    disponible: false,
                    pendienteDe: 'Créditos',
                    valores: [],
                    datosAl: null,
                    calidad: ['Se activa con el módulo Créditos.']
                },
                {
                    clave: 'Pagos30Dias',
                    nombre: 'Pagos 30 días',
                    tipo: 'Dinero',
                    definicion: 'Pagos comerciales',
                    origen: 'Pagos',
                    frecuencia: 'Diario',
                    observaciones: 'No incluye crédito',
                    disponible: false,
                    pendienteDe: 'Pagos',
                    valores: [],
                    datosAl: null,
                    calidad: ['Se activa con el módulo Pagos.']
                },
                {
                    clave: 'Cobros30Dias',
                    nombre: 'Cobros 30 días',
                    tipo: 'Dinero',
                    definicion: 'Saldo de facturas a cobrar',
                    origen: 'Cobranza',
                    frecuencia: 'Diario',
                    observaciones: 'No ponderado',
                    disponible: false,
                    pendienteDe: 'Cobranza',
                    valores: [],
                    datosAl: null,
                    calidad: ['Se activa con el módulo Cobranza.']
                },
                {
                    clave: 'ProyectosActivos',
                    nombre: 'Proyectos activos',
                    tipo: 'Cantidad',
                    definicion: 'Número de obras vigentes',
                    origen: 'Proyectos',
                    frecuencia: 'Semanal',
                    observaciones: 'No incluye propuestas',
                    disponible: false,
                    pendienteDe: 'Proyectos',
                    valores: [],
                    datosAl: null,
                    calidad: ['Se activa con el módulo Proyectos.']
                },
                {
                    clave: 'Saldo13Semanas',
                    nombre: 'Saldo a 13 semanas',
                    tipo: 'Dinero',
                    definicion: 'Saldo proyectado',
                    origen: 'Flujo',
                    frecuencia: 'Diario',
                    observaciones: 'Sujeto a calidad de fechas',
                    disponible: false,
                    pendienteDe: 'Flujo',
                    valores: [],
                    datosAl: null,
                    calidad: ['Se activa con el módulo Flujo.']
                },
                {
                    clave: 'MargenEstimado',
                    nombre: 'Margen estimado agregado',
                    tipo: 'Porcentaje',
                    definicion: 'Ingreso contratado menos costo esperado',
                    origen: 'Proyectos',
                    frecuencia: 'Semanal',
                    observaciones: 'No equivale a margen contable reconocido',
                    disponible: false,
                    pendienteDe: 'Proyectos',
                    valores: [],
                    datosAl: null,
                    calidad: ['Se activa con el módulo Proyectos.']
                }
            ],
            ...sobreescrituras
        };
    }

    describe('con provideNoopAnimations', () => {
        beforeEach(async () => {
            await TestBed.configureTestingModule({
                imports: [DashboardFinanzasComponent, HttpClientTestingModule],
                providers: [provideNoopAnimations()]
            }).compileComponents();

            fixture = TestBed.createComponent(DashboardFinanzasComponent);
            component = fixture.componentInstance;
            httpMock = TestBed.inject(HttpTestingController);
        });

        afterEach(() => {
            httpMock.verify();
        });

        it('Al_iniciar_pide_las_empresas_y_el_tablero_de_todas_las_empresas', () => {
            fixture.detectChanges();

            const reqEmpresas = httpMock.expectOne(`${base}/empresas`);
            expect(reqEmpresas.request.method).toBe('GET');
            reqEmpresas.flush(mockEmpresas);

            const reqDash = httpMock.expectOne((r) => r.url === `${base}/dashboard`);
            expect(reqDash.request.method).toBe('GET');
            expect(reqDash.request.params.has('empresaId')).toBeFalse();
            reqDash.flush(crearMockDashboard());
        });

        it('Muestra_ocho_tarjetas_en_el_orden_del_libro', () => {
            fixture.detectChanges();
            httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
            httpMock.expectOne((r) => r.url === `${base}/dashboard`).flush(crearMockDashboard());
            fixture.detectChanges();

            const tarjetas = fixture.debugElement.queryAll(By.css('[data-testid="tarjeta"]'));
            expect(tarjetas.length).toBe(8);

            const claves = tarjetas.map((t) => t.nativeElement.getAttribute('data-clave'));
            expect(claves).toEqual([...ORDEN_TARJETAS_DASHBOARD]);
            expect(claves).not.toContain('MargenEstimado');
        });

        it('Una_tarjeta_disponible_muestra_un_renglon_por_moneda_con_formato', () => {
            fixture.detectChanges();
            httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
            httpMock.expectOne((r) => r.url === `${base}/dashboard`).flush(crearMockDashboard());
            fixture.detectChanges();

            const tarjetaSaldo = fixture.debugElement.query(By.css('[data-clave="SaldoBancos"]'));
            const renglones = tarjetaSaldo.queryAll(By.css('[data-testid="tarjeta-valor"]'));
            expect(renglones.length).toBe(2);
            expect(renglones[0].nativeElement.textContent).toContain('$1,234.50 MXN');
            expect(renglones[1].nativeElement.textContent).toContain('$200.00 USD');
        });

        it('Una_tarjeta_pendiente_dice_Pendiente_y_el_modulo_y_nunca_cero', () => {
            fixture.detectChanges();
            httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
            httpMock.expectOne((r) => r.url === `${base}/dashboard`).flush(crearMockDashboard());
            fixture.detectChanges();

            const tarjetaPorPagar = fixture.debugElement.query(By.css('[data-clave="PorPagar"]'));
            const pendiente = tarjetaPorPagar.query(By.css('[data-testid="tarjeta-pendiente"]'));
            expect(pendiente).toBeTruthy();
            expect(pendiente.nativeElement.textContent).toContain('Pendiente');
            expect(pendiente.nativeElement.textContent).toContain('Se activa con el módulo Pagos');

            const valor = tarjetaPorPagar.query(By.css('[data-testid="tarjeta-valor"]'));
            expect(valor).toBeFalsy();
            expect(tarjetaPorPagar.nativeElement.textContent).not.toContain('0.00');
        });

        it('Disponible_sin_valores_muestra_guion_y_la_primera_frase_de_calidad', () => {
            const mock = crearMockDashboard();
            const saldo = mock.indicadores.find((i) => i.clave === 'SaldoBancos')!;
            saldo.valores = [];
            saldo.calidad = ['No hay cuentas activas registradas.'];

            fixture.detectChanges();
            httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
            httpMock.expectOne((r) => r.url === `${base}/dashboard`).flush(mock);
            fixture.detectChanges();

            const tarjetaSaldo = fixture.debugElement.query(By.css('[data-clave="SaldoBancos"]'));
            const vacio = tarjetaSaldo.query(By.css('[data-testid="tarjeta-vacio"]'));
            expect(vacio).toBeTruthy();
            expect(vacio.nativeElement.textContent).toContain('—');
            expect(tarjetaSaldo.nativeElement.textContent).toContain('No hay cuentas activas registradas.');
        });

        it('Por_cobrar_lleva_la_etiqueta_Aproximado_y_las_demas_no', () => {
            fixture.detectChanges();
            httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
            httpMock.expectOne((r) => r.url === `${base}/dashboard`).flush(crearMockDashboard());
            fixture.detectChanges();

            const tarjetaCobrar = fixture.debugElement.query(By.css('[data-clave="PorCobrar"]'));
            expect(tarjetaCobrar.query(By.css('[data-testid="etiqueta-aproximado"]'))).toBeTruthy();
            expect(tarjetaCobrar.query(By.css('[data-testid="etiqueta-aproximado"]')).nativeElement.textContent).toContain('Aproximado');

            const otrasTarjetas = fixture.debugElement.queryAll(By.css('[data-testid="tarjeta"]:not([data-clave="PorCobrar"])'));
            for (const t of otrasTarjetas) {
                expect(t.query(By.css('[data-testid="etiqueta-aproximado"]'))).toBeFalsy();
            }
        });

        it('Muestra_Datos_al_con_formato_dd_MM_yyyy', () => {
            fixture.detectChanges();
            httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
            httpMock.expectOne((r) => r.url === `${base}/dashboard`).flush(crearMockDashboard());
            fixture.detectChanges();

            const tarjetaSaldo = fixture.debugElement.query(By.css('[data-clave="SaldoBancos"]'));
            const datosAl = tarjetaSaldo.query(By.css('[data-testid="tarjeta-datos-al"]'));
            expect(datosAl).toBeTruthy();
            expect(datosAl.nativeElement.textContent).toContain('Datos al 05/10/2026');
        });

        it('Elegir_una_empresa_pide_el_tablero_con_empresaId_y_elegir_Todas_lo_pide_sin_parametro', () => {
            fixture.detectChanges();
            httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
            httpMock.expectOne((r) => r.url === `${base}/dashboard`).flush(crearMockDashboard());

            component.elegirEmpresa(2);
            const reqEmpresa2 = httpMock.expectOne((r) => r.url === `${base}/dashboard`);
            expect(reqEmpresa2.request.params.get('empresaId')).toBe('2');
            reqEmpresa2.flush(crearMockDashboard({ empresaId: 2 }));
            expect(component.empresaId()).toBe(2);

            component.elegirEmpresa(0);
            const reqTodas = httpMock.expectOne((r) => r.url === `${base}/dashboard`);
            expect(reqTodas.request.params.has('empresaId')).toBeFalse();
            reqTodas.flush(crearMockDashboard({ empresaId: null }));
            expect(component.empresaId()).toBeNull();
        });

        it('La_respuesta_tardia_de_la_empresa_anterior_no_pisa_a_la_actual', () => {
            fixture.detectChanges();
            httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
            httpMock.expectOne((r) => r.url === `${base}/dashboard`).flush(crearMockDashboard());

            component.elegirEmpresa(1);
            const req1 = httpMock.expectOne((r) => r.url === `${base}/dashboard` && r.params.get('empresaId') === '1');

            component.elegirEmpresa(2);
            expect(req1.cancelled).toBeTrue();

            const req2 = httpMock.expectOne((r) => r.url === `${base}/dashboard` && r.params.get('empresaId') === '2');
            const mock2 = crearMockDashboard({ empresaId: 2 });
            req2.flush(mock2);

            expect(component.datos()).toEqual(mock2);
        });

        it('Si_falla_el_tablero_muestra_el_error_y_Reintentar_lo_vuelve_a_pedir', () => {
            fixture.detectChanges();
            httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
            httpMock.expectOne((r) => r.url === `${base}/dashboard`).flush('Error interno', { status: 500, statusText: 'Server Error' });
            fixture.detectChanges();

            const bloqueError = fixture.debugElement.query(By.css('[data-testid="error-tablero"]'));
            expect(bloqueError).toBeTruthy();

            const botonReintentar = fixture.debugElement.query(By.css('[data-testid="boton-reintentar"]'));
            expect(botonReintentar).toBeTruthy();

            botonReintentar.nativeElement.click();
            const nuevaReq = httpMock.expectOne((r) => r.url === `${base}/dashboard`);
            nuevaReq.flush(crearMockDashboard());
        });

        it('Muestra_la_tabla_de_definiciones_con_los_nueve_indicadores', () => {
            fixture.detectChanges();
            httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
            httpMock.expectOne((r) => r.url === `${base}/dashboard`).flush(crearMockDashboard());
            fixture.detectChanges();

            const filas = fixture.debugElement.queryAll(By.css('[data-testid="fila-definicion"]'));
            expect(filas.length).toBe(9);

            const filaPorPagar = filas.find((f) => f.nativeElement.textContent.includes('Por pagar'));
            expect(filaPorPagar).toBeTruthy();
            expect(filaPorPagar!.nativeElement.textContent).toContain('Pendiente de Pagos');
        });

        it('Reserva_la_seccion_de_proyeccion_de_tesoreria', () => {
            fixture.detectChanges();
            httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
            httpMock.expectOne((r) => r.url === `${base}/dashboard`).flush(crearMockDashboard());
            fixture.detectChanges();

            const proy = fixture.debugElement.query(By.css('[data-testid="proyeccion-reservada"]'));
            expect(proy).toBeTruthy();
            expect(proy.nativeElement.textContent).toContain('Se activará con el módulo Flujo de 13 semanas');
        });

        it('Las_tarjetas_son_la_misma_lista_mientras_los_datos_no_cambian', () => {
            fixture.detectChanges();
            httpMock.expectOne(`${base}/empresas`).flush(mockEmpresas);
            httpMock.expectOne((r) => r.url === `${base}/dashboard`).flush(crearMockDashboard());
            fixture.detectChanges();

            const a = component.tarjetas();
            fixture.detectChanges();
            expect(component.tarjetas()).toBe(a);
        });
    });

    describe('con provideAnimations y autoDetectChanges', () => {
        beforeEach(async () => {
            await TestBed.configureTestingModule({
                imports: [DashboardFinanzasComponent, HttpClientTestingModule],
                providers: [provideAnimations()]
            }).compileComponents();

            fixture = TestBed.createComponent(DashboardFinanzasComponent);
            component = fixture.componentInstance;
            httpMock = TestBed.inject(HttpTestingController);
        });

        afterEach(() => {
            httpMock.verify();
        });

        it('Elegir_empresa_con_deteccion_automatica_y_animaciones_reales_no_entra_en_ciclo', async () => {
            fixture.autoDetectChanges(true);

            const reqs = httpMock.match(() => true);
            for (const r of reqs) {
                if (r.request.url.includes('/empresas')) {
                    r.flush(mockEmpresas);
                } else if (r.request.url.includes('/dashboard')) {
                    r.flush(crearMockDashboard());
                }
            }

            await fixture.whenStable();

            const selector = fixture.debugElement.query(By.directive(MatSelect));
            expect(selector).toBeTruthy();

            const trigger = fixture.debugElement.query(By.css('.mat-mdc-select-trigger'));
            trigger.nativeElement.click();
            await fixture.whenStable();

            const matSelectInstance = selector.componentInstance as MatSelect;
            const options = matSelectInstance.options.toArray();
            expect(options.length).toBeGreaterThan(1);
            options[1]._getHostElement().click();
            await fixture.whenStable();

            const pendingReqs = httpMock.match(() => true);
            for (const r of pendingReqs) {
                r.flush(crearMockDashboard({ empresaId: 1 }));
            }

            await fixture.whenStable();
            expect(httpMock.match(() => true).length).toBe(0);
        });
    });
});
