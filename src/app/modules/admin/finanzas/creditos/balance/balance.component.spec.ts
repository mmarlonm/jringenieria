import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { SimpleChange } from '@angular/core';
import { environment } from 'environments/environment';
import { BalanceCreditosComponent } from './balance.component';
import { BalanceCreditos } from '../../finanzas.types';

describe('BalanceCreditosComponent', () => {
    let fixture: ComponentFixture<BalanceCreditosComponent>;
    let componente: BalanceCreditosComponent;
    let httpMock: HttpTestingController;
    const base = `${environment.apiUrl}/Finanzas`;

    const mockBalance: BalanceCreditos = {
        empresaId: null,
        empresasIncluidas: 2,
        monedas: [
            {
                moneda: 'MXN',
                recibidos: { creditos: 3, capitalOriginal: 300000, saldoActual: 240000, proximoPago: 15000 },
                recibidosFinancieros: { creditos: 2, capitalOriginal: 200000, saldoActual: 160000, proximoPago: 10000 },
                recibidosProveedores: { creditos: 1, capitalOriginal: 100000, saldoActual: 80000, proximoPago: 5000 },
                otorgados: { creditos: 1, capitalOriginal: 50000, saldoActual: 40000, proximoPago: 3000 },
                diferencia: { creditos: 2, capitalOriginal: 250000, saldoActual: 200000, proximoPago: 12000 },
                relacion: 0.1667
            }
        ]
    };

    const mockBalanceSinRelacion: BalanceCreditos = {
        empresaId: 1,
        empresasIncluidas: 1,
        monedas: [
            {
                moneda: 'USD',
                recibidos: { creditos: 0, capitalOriginal: 0, saldoActual: 0, proximoPago: 0 },
                recibidosFinancieros: { creditos: 0, capitalOriginal: 0, saldoActual: 0, proximoPago: 0 },
                recibidosProveedores: { creditos: 0, capitalOriginal: 0, saldoActual: 0, proximoPago: 0 },
                otorgados: { creditos: 1, capitalOriginal: 10000, saldoActual: 8000, proximoPago: 500 },
                diferencia: { creditos: -1, capitalOriginal: -10000, saldoActual: -8000, proximoPago: -500 },
                relacion: null
            }
        ]
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [BalanceCreditosComponent, HttpClientTestingModule],
            providers: [provideNoopAnimations()]
        }).compileComponents();

        fixture = TestBed.createComponent(BalanceCreditosComponent);
        componente = fixture.componentInstance;
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('Pide_el_balance_de_todas_las_empresas_y_de_una_sola_cuando_cambia_empresaId', () => {
        componente.empresaId = null;
        fixture.detectChanges();

        const reqTodas = httpMock.expectOne((r) => r.url === `${base}/creditos/balance`);
        expect(reqTodas.request.params.has('empresaId')).toBeFalse();
        reqTodas.flush(mockBalance);

        // Cambia a empresaId = 2
        componente.empresaId = 2;
        componente.ngOnChanges({
            empresaId: new SimpleChange(null, 2, false)
        });
        fixture.detectChanges();

        const req2 = httpMock.expectOne((r) => r.url === `${base}/creditos/balance`);
        expect(req2.request.params.get('empresaId')).toBe('2');
        req2.flush({ ...mockBalance, empresaId: 2, empresasIncluidas: 1 });
    });

    it('Muestra_una_tabla_por_moneda_con_las_cinco_filas_y_los_importes_formateados', () => {
        fixture.detectChanges();
        const req = httpMock.expectOne((r) => r.url === `${base}/creditos/balance`);
        req.flush(mockBalance);
        fixture.detectChanges();

        const tablas = fixture.debugElement.queryAll(By.css('[data-testid="balance-moneda"]'));
        expect(tablas.length).toBe(1);

        const textoTabla = tablas[0].nativeElement.textContent;
        expect(textoTabla).toContain('Recibidos financieros');
        expect(textoTabla).toContain('Recibidos de proveedores');
        expect(textoTabla).toContain('Créditos recibidos (pasivo)');
        expect(textoTabla).toContain('Créditos otorgados (activo)');
        expect(textoTabla).toContain('Diferencia neta');

        // Formato de importes
        expect(textoTabla).toContain('$240,000.00 MXN');
        expect(textoTabla).toContain('$160,000.00 MXN');
        expect(textoTabla).toContain('$80,000.00 MXN');
        expect(textoTabla).toContain('$40,000.00 MXN');
        expect(textoTabla).toContain('$200,000.00 MXN');
    });

    it('La_relacion_se_muestra_en_porcentaje_y_nula_como_guion', () => {
        // Con relacion 0.1667 (16.67 %)
        fixture.detectChanges();
        httpMock.expectOne((r) => r.url === `${base}/creditos/balance`).flush(mockBalance);
        fixture.detectChanges();

        const relacionEl = fixture.debugElement.query(By.css('[data-testid="balance-relacion"]'));
        expect(relacionEl.nativeElement.textContent).toContain('16.67 %');

        // Con relacion null (—)
        componente.empresaId = 1;
        componente.ngOnChanges({ empresaId: new SimpleChange(null, 1, false) });
        fixture.detectChanges();

        httpMock.expectOne((r) => r.url === `${base}/creditos/balance`).flush(mockBalanceSinRelacion);
        fixture.detectChanges();

        const relacionElNull = fixture.debugElement.query(By.css('[data-testid="balance-relacion"]'));
        expect(relacionElNull.nativeElement.textContent).toContain('—');
    });

    it('Sin_monedas_muestra_Sin_creditos_activos', () => {
        fixture.detectChanges();
        httpMock.expectOne((r) => r.url === `${base}/creditos/balance`).flush({
            empresaId: null,
            empresasIncluidas: 2,
            monedas: []
        });
        fixture.detectChanges();

        const vacio = fixture.debugElement.query(By.css('[data-testid="balance-vacio"]'));
        expect(vacio).toBeTruthy();
        expect(vacio.nativeElement.textContent).toContain('Sin créditos activos');
    });

    it('Error_muestra_el_mensaje', () => {
        fixture.detectChanges();
        const req = httpMock.expectOne((r) => r.url === `${base}/creditos/balance`);
        req.flush({ mensaje: 'Error al cargar balance' }, { status: 500, statusText: 'Error' });
        fixture.detectChanges();

        const errorEl = fixture.debugElement.query(By.css('[data-testid="error-balance"]'));
        expect(errorEl).toBeTruthy();
        expect(errorEl.nativeElement.textContent).toContain('Error al cargar balance');
    });

    it('La_respuesta_tardia_no_pisa_a_la_actual', () => {
        fixture.detectChanges();
        const req1 = httpMock.expectOne((r) => r.url === `${base}/creditos/balance`);

        // Cambia antes de que termine req1
        componente.empresaId = 2;
        componente.ngOnChanges({ empresaId: new SimpleChange(null, 2, false) });
        fixture.detectChanges();

        const req2 = httpMock.expectOne((r) => r.url === `${base}/creditos/balance`);
        expect(req1.cancelled).toBeTrue();

        req2.flush(mockBalanceSinRelacion);
        fixture.detectChanges();

        expect(componente.balance()).toEqual(mockBalanceSinRelacion);
    });
});

