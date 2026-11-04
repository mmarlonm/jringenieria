import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { environment } from 'environments/environment';
import { CreditoDialogComponent } from './credito-dialog.component';
import { Credito, Cuenta, Empresa } from '../../finanzas.types';

describe('CreditoDialogComponent', () => {
    let fixture: ComponentFixture<CreditoDialogComponent>;
    let componente: CreditoDialogComponent;
    let httpMock: HttpTestingController;
    let dialogRefSpy: jasmine.SpyObj<MatDialogRef<CreditoDialogComponent, Credito>>;
    const base = `${environment.apiUrl}/Finanzas`;

    const mockEmpresas: Empresa[] = [
        { empresaId: 1, rfc: 'AAA010101AAA', nombre: 'Empresa Uno', tipo: 'M', activa: true },
        { empresaId: 2, rfc: 'BBB020202BBB', nombre: 'Empresa Dos', tipo: 'M', activa: true }
    ];

    const mockCuentasEmpresa1: Cuenta[] = [
        { cuentaId: 10, empresaId: 1, banco: 'BBVA', alias: 'Cuenta 1', tipo: 'Cheques', moneda: 'MXN', terminacion: '1111', activa: true }
    ];
    const mockCuentasEmpresa2: Cuenta[] = [
        { cuentaId: 20, empresaId: 2, banco: 'BBVA', alias: 'Cuenta 2', tipo: 'Cheques', moneda: 'MXN', terminacion: '2222', activa: true }
    ];

    const mockCredito: Credito = {
        creditoId: 5,
        empresaId: 1,
        sentido: 'Recibido',
        tipo: 'Simple',
        contraparte: 'Banco Santander',
        moneda: 'MXN',
        montoOriginal: 100000,
        saldoCapital: 80000,
        tasaAnual: 0.155,
        vencimientoFinal: '2028-12-31',
        cuentaId: 10,
        estado: 'Activo',
        notas: 'Notas credito',
        fechaActualizacion: '2026-11-04T00:00:00',
        proximoVencimiento: '2026-12-01',
        proximoPago: 5000,
        pagosPendientes: 12,
        pagosTotales: 24
    };

    function configurar(datos: { credito?: Credito } = {}): void {
        dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

        TestBed.configureTestingModule({
            imports: [CreditoDialogComponent, HttpClientTestingModule],
            providers: [
                provideNoopAnimations(),
                { provide: MatDialogRef, useValue: dialogRefSpy },
                { provide: MAT_DIALOG_DATA, useValue: datos }
            ]
        });

        httpMock = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(CreditoDialogComponent);
        componente = fixture.componentInstance;
    }

    afterEach(() => {
        httpMock.verify();
    });

    it('Crear_manda_el_dto_con_la_tasa_como_fraccion_y_cierra_con_el_credito', () => {
        configurar();
        fixture.detectChanges();

        const reqEmp = httpMock.expectOne(`${base}/empresas`);
        reqEmp.flush(mockEmpresas);

        componente.form.patchValue({
            empresaId: 1,
            sentido: 'Recibido',
            tipo: 'Simple',
            contraparte: 'Banco Santander',
            moneda: 'MXN',
            montoOriginal: 100000,
            saldoCapital: 80000,
            tasaAnual: 15.5,
            vencimientoFinal: '2028-12-31',
            cuentaId: 10,
            estado: 'Activo',
            notas: 'Nota'
        });

        // La seleccion de empresaId 1 dispara la carga de cuentas de esa empresa
        const reqCuentas = httpMock.expectOne((r) => r.url === `${base}/cuentas` && r.params.get('empresaId') === '1');
        reqCuentas.flush(mockCuentasEmpresa1);
        fixture.detectChanges();

        expect(componente.form.valid).toBeTrue();

        componente.guardar();

        const reqPost = httpMock.expectOne(`${base}/creditos`);
        expect(reqPost.request.method).toBe('POST');
        expect(reqPost.request.body).toEqual({
            empresaId: 1,
            sentido: 'Recibido',
            tipo: 'Simple',
            contraparte: 'Banco Santander',
            moneda: 'MXN',
            montoOriginal: 100000,
            saldoCapital: 80000,
            tasaAnual: 0.155, // 15.5 / 100
            vencimientoFinal: '2028-12-31',
            cuentaId: 10,
            estado: 'Activo',
            notas: 'Nota'
        });

        reqPost.flush(mockCredito);
        expect(dialogRefSpy.close).toHaveBeenCalledWith(mockCredito);
    });

    it('Editar_muestra_la_tasa_en_porcentaje_y_deshabilita_la_empresa', () => {
        configurar({ credito: mockCredito });
        fixture.detectChanges();

        const reqEmp = httpMock.expectOne(`${base}/empresas`);
        reqEmp.flush(mockEmpresas);

        const reqCuentas = httpMock.expectOne((r) => r.url === `${base}/cuentas` && r.params.get('empresaId') === '1');
        reqCuentas.flush(mockCuentasEmpresa1);
        fixture.detectChanges();

        expect(componente.form.get('empresaId')?.disabled).toBeTrue();
        expect(componente.form.get('tasaAnual')?.value).toBe(15.5);
    });

    it('No_deja_guardar_con_datos_invalidos', () => {
        configurar();
        fixture.detectChanges();

        const reqEmp = httpMock.expectOne(`${base}/empresas`);
        reqEmp.flush(mockEmpresas);

        // Monto 0
        componente.form.patchValue({
            empresaId: 1,
            contraparte: 'Banco',
            montoOriginal: 0,
            saldoCapital: 0,
            tasaAnual: 10
        });
        const reqCuentas = httpMock.expectOne((r) => r.url === `${base}/cuentas` && r.params.get('empresaId') === '1');
        reqCuentas.flush(mockCuentasEmpresa1);
        fixture.detectChanges();

        expect(componente.form.invalid).toBeTrue();

        // Tasa 101
        componente.form.patchValue({
            montoOriginal: 1000,
            tasaAnual: 101
        });
        expect(componente.form.invalid).toBeTrue();

        // Contraparte vacia
        componente.form.patchValue({
            tasaAnual: 15,
            contraparte: ''
        });
        expect(componente.form.invalid).toBeTrue();

        componente.guardar();
        // No debe mandar peticion
        httpMock.expectNone(`${base}/creditos`);
    });

    it('Solo_ofrece_las_cuentas_de_la_empresa_elegida', () => {
        configurar();
        fixture.detectChanges();

        const reqEmp = httpMock.expectOne(`${base}/empresas`);
        reqEmp.flush(mockEmpresas);

        // Elegir empresa 2
        componente.form.patchValue({ empresaId: 2 });
        const reqCuentas = httpMock.expectOne((r) => r.url === `${base}/cuentas` && r.params.get('empresaId') === '2');
        reqCuentas.flush(mockCuentasEmpresa2);
        fixture.detectChanges();

        expect(componente.cuentas()).toEqual(mockCuentasEmpresa2);
    });

    it('Si_el_API_rechaza_muestra_el_mensaje_y_no_cierra', () => {
        configurar();
        fixture.detectChanges();

        const reqEmp = httpMock.expectOne(`${base}/empresas`);
        reqEmp.flush(mockEmpresas);

        componente.form.patchValue({
            empresaId: 1,
            sentido: 'Recibido',
            tipo: 'Simple',
            contraparte: 'Banco Santander',
            moneda: 'MXN',
            montoOriginal: 100000,
            saldoCapital: 80000,
            tasaAnual: 15.5
        });

        const reqCuentas = httpMock.expectOne((r) => r.url === `${base}/cuentas` && r.params.get('empresaId') === '1');
        reqCuentas.flush(mockCuentasEmpresa1);
        fixture.detectChanges();

        componente.guardar();

        const reqPost = httpMock.expectOne(`${base}/creditos`);
        reqPost.flush({ mensaje: 'Error al guardar crédito' }, { status: 400, statusText: 'Bad Request' });
        fixture.detectChanges();

        expect(componente.error()).toBe('Error al guardar crédito');
        expect(dialogRefSpy.close).not.toHaveBeenCalled();
    });
});

