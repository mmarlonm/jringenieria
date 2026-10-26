import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';
import { environment } from 'environments/environment';
import { Empresa, PaqueteDespacho, VistaPreviaPaquete } from '../finanzas.types';
import { DespachoComponent } from './despacho.component';

describe('DespachoComponent', () => {
    let fixture: ComponentFixture<DespachoComponent>;
    let componente: DespachoComponent;
    let httpMock: HttpTestingController;
    let tienePermisoSignal: ReturnType<typeof signal<boolean>>;
    let permisosSpy: jasmine.Spy;

    const base = `${environment.apiUrl}/Finanzas`;

    const empresaA: Empresa = { empresaId: 1, nombre: 'Empresa Alfa', rfc: 'AAA010101AAA', tipo: 'M', activa: true };
    const empresaB: Empresa = { empresaId: 2, nombre: 'Empresa Beta', rfc: 'BBB020202BBB', tipo: 'M', activa: true };
    const empresas: Empresa[] = [empresaA, empresaB];

    const vistaPreviaBase: VistaPreviaPaquete = {
        empresaId: 1,
        anio: 2025,
        mes: 12,
        cfdiEmitidos: 15,
        cfdiRecibidos: 8,
        movimientos: 23,
        movimientosPendientes: 4,
        cfdiPendientes: 2,
        cfdiSinDatosOriginales: 0,
        cuentas: [
            { cuentaId: 10, etiqueta: 'BBVA ····1234 · MXN', movimientos: 23 }
        ]
    };

    const paqueteA: PaqueteDespacho = {
        paqueteId: 101,
        empresaId: 1,
        anio: 2025,
        mes: 12,
        usuarioId: 5,
        fecha: '2026-01-20T10:00:00',
        cfdiEmitidos: 15,
        cfdiRecibidos: 8,
        movimientos: 23,
        pendientes: 6
    };

    beforeEach(async () => {
        jasmine.clock().mockDate(new Date(2026, 0, 15));

        tienePermisoSignal = signal(true);
        permisosSpy = jasmine.createSpy('tiene').and.callFake((permiso: string) => {
            if (permiso === 'finanzas.exportar') {
                return tienePermisoSignal();
            }
            return false;
        });

        await TestBed.configureTestingModule({
            imports: [HttpClientTestingModule, DespachoComponent],
            providers: [
                provideNoopAnimations(),
                {
                    provide: PermisosEspecialesService,
                    useValue: { tiene: permisosSpy }
                }
            ]
        }).compileComponents();

        httpMock = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(DespachoComponent);
        componente = fixture.componentInstance;
    });

    afterEach(() => {
        jasmine.clock().uninstall();
        httpMock.verify();
    });

    function inicializarConEmpresa(empresaId = 1): void {
        fixture.detectChanges();
        const reqEmp = httpMock.expectOne(`${base}/empresas`);
        reqEmp.flush(empresas);
        fixture.detectChanges();

        componente.elegirEmpresa(empresaId);
        fixture.detectChanges();

        const reqVp = httpMock.expectOne(req =>
            req.url === `${base}/despacho/vista-previa` &&
            req.params.get('empresaId') === String(empresaId) &&
            req.params.get('anio') === '2025' &&
            req.params.get('mes') === '12'
        );
        reqVp.flush(vistaPreviaBase);

        const reqHist = httpMock.expectOne(req =>
            req.url === `${base}/despacho/historial` &&
            req.params.get('empresaId') === String(empresaId) &&
            req.params.get('pagina') === '1' &&
            req.params.get('tamano') === '10'
        );
        reqHist.flush({ pagina: 1, tamano: 10, total: 1, items: [paqueteA] });
        fixture.detectChanges();
    }

    it('Sin_empresa_muestra_el_estado_vacio', () => {
        fixture.detectChanges();
        const reqEmp = httpMock.expectOne(`${base}/empresas`);
        reqEmp.flush(empresas);
        fixture.detectChanges();

        expect(componente.empresaId()).toBeNull();
        const texto = fixture.nativeElement.textContent;
        expect(texto).toContain('Selecciona una empresa para consultar la vista previa');
        httpMock.expectNone(req => req.url.includes('despacho/vista-previa'));
        httpMock.expectNone(req => req.url.includes('despacho/historial'));
    });

    it('Por_defecto_elige_el_mes_anterior_y_pide_la_vista_previa', () => {
        expect(componente.anio()).toBe(2025);
        expect(componente.mes()).toBe(12);

        inicializarConEmpresa(1);

        expect(componente.vistaPrevia()).toEqual(vistaPreviaBase);
        expect(componente.historial()?.items.length).toBe(1);
    });

    it('Muestra_los_recuadros_y_el_aviso_de_CFDI_sin_datos', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(empresas);
        fixture.detectChanges();

        componente.elegirEmpresa(1);
        fixture.detectChanges();

        const reqVp = httpMock.expectOne(req => req.url === `${base}/despacho/vista-previa`);
        reqVp.flush({
            ...vistaPreviaBase,
            cfdiSinDatosOriginales: 3
        });

        httpMock.expectOne(req => req.url === `${base}/despacho/historial`).flush({
            pagina: 1, tamano: 10, total: 0, items: []
        });
        fixture.detectChanges();

        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('15'); // emitidas
        expect(el.textContent).toContain('8');  // recibidas
        expect(el.textContent).toContain('23'); // movimientos
        expect(el.textContent).toContain('BBVA ····1234 · MXN');
        expect(el.textContent).toContain('4');  // mov pendientes
        expect(el.textContent).toContain('2');  // cfdi pendientes
        expect(el.textContent).toContain('3 facturas se importaron sin todos los datos del SAT');
    });

    it('Cambiar_de_periodo_cancela_la_vista_previa_anterior_y_la_tardia_no_pisa', () => {
        inicializarConEmpresa(1);

        // Cambiar mes a Noviembre (11)
        componente.cambiarMes(11);
        fixture.detectChanges();

        const primera = httpMock.expectOne(req =>
            req.url === `${base}/despacho/vista-previa` &&
            req.params.get('mes') === '11'
        );

        // Cambiar mes a Octubre (10) antes de responder la primera
        componente.cambiarMes(10);
        fixture.detectChanges();

        const segunda = httpMock.expectOne(req =>
            req.url === `${base}/despacho/vista-previa` &&
            req.params.get('mes') === '10'
        );

        // La primera petición fue cancelada por cambio de periodo
        expect(primera.cancelled).toBeTrue();

        // Respondemos únicamente la segunda
        segunda.flush({
            ...vistaPreviaBase,
            mes: 10,
            cfdiEmitidos: 99
        });
        fixture.detectChanges();

        expect(componente.vistaPrevia()?.cfdiEmitidos).toBe(99);
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('99');
    });

    it('Sin_permiso_no_hay_boton_de_generar', () => {
        tienePermisoSignal.set(false);
        inicializarConEmpresa(1);

        const el = fixture.nativeElement as HTMLElement;
        const boton = el.querySelector('button[mat-flat-button]');
        expect(boton).toBeNull();
        expect(el.textContent).not.toContain('Generar y descargar paquete (.xlsx)');
    });

    it('Generar_descarga_con_el_nombre_esperado_y_recarga_el_historial', () => {
        tienePermisoSignal.set(true);
        inicializarConEmpresa(1);

        const mockUrl = 'blob:http://localhost/dummy-uuid';
        spyOn(URL, 'createObjectURL').and.returnValue(mockUrl);
        spyOn(URL, 'revokeObjectURL');
        let downloadAttr = '';
        spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
            downloadAttr = this.download;
        });

        componente.generar();
        fixture.detectChanges();

        const reqGen = httpMock.expectOne({
            url: `${base}/despacho/generar`,
            method: 'POST'
        });
        expect(reqGen.request.body).toEqual({
            empresaId: 1,
            anio: 2025,
            mes: 12
        });

        const fakeBlob = new Blob(['xlsx-content'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        reqGen.flush(fakeBlob);
        fixture.detectChanges();

        expect(URL.createObjectURL).toHaveBeenCalledWith(fakeBlob);
        expect(downloadAttr).toBe('PaqueteDespacho_2025-12_AAA010101AAA.xlsx');
        expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);

        // Verifica que recarga el historial en página 1
        const reqHist = httpMock.expectOne(req =>
            req.url === `${base}/despacho/historial` &&
            req.params.get('empresaId') === '1' &&
            req.params.get('pagina') === '1'
        );
        reqHist.flush({ pagina: 1, tamano: 10, total: 2, items: [paqueteA, { ...paqueteA, paqueteId: 102 }] });
        fixture.detectChanges();

        expect(componente.historial()?.total).toBe(2);
    });

    it('Doble_clic_en_Generar_manda_una_sola_peticion', () => {
        tienePermisoSignal.set(true);
        inicializarConEmpresa(1);

        componente.generar();
        componente.generar(); // Segundo clic inmediato

        const matches = httpMock.match(`${base}/despacho/generar`);
        expect(matches.length).toBe(1);

        matches[0].flush(new Blob(['test']));
        httpMock.expectOne(req => req.url === `${base}/despacho/historial`).flush({
            pagina: 1, tamano: 10, total: 1, items: [paqueteA]
        });
    });

    it('Error_en_blob_se_muestra_legible', async () => {
        tienePermisoSignal.set(true);
        inicializarConEmpresa(1);

        componente.generar();
        fixture.detectChanges();

        const reqGen = httpMock.expectOne(`${base}/despacho/generar`);
        const jsonBlob = new Blob([JSON.stringify({ mensaje: 'El mes no es válido.' })], { type: 'application/json' });
        reqGen.flush(jsonBlob, { status: 400, statusText: 'Bad Request' });

        await new Promise(resolve => setTimeout(resolve, 50));
        fixture.detectChanges();

        expect(componente.errorGenerar()).toBe('El mes no es válido.');
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('El mes no es válido.');
    });

    it('Historial_vacio_y_con_filas', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(empresas);
        fixture.detectChanges();

        componente.elegirEmpresa(1);
        fixture.detectChanges();

        httpMock.expectOne(req => req.url === `${base}/despacho/vista-previa`).flush(vistaPreviaBase);

        // Historial vacío
        const reqHist1 = httpMock.expectOne(req => req.url === `${base}/despacho/historial`);
        reqHist1.flush({ pagina: 1, tamano: 10, total: 0, items: [] });
        fixture.detectChanges();

        let el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('No se han generado paquetes para esta empresa.');

        // Cambiar página o recargar con filas
        componente.cargarHistorial(1);
        fixture.detectChanges();

        const reqHist2 = httpMock.expectOne(req => req.url === `${base}/despacho/historial`);
        reqHist2.flush({ pagina: 1, tamano: 10, total: 1, items: [paqueteA] });
        fixture.detectChanges();

        el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).not.toContain('No se han generado paquetes para esta empresa.');
        expect(el.textContent).toContain('Diciembre 2025');
        expect(el.textContent).toContain('15');
        expect(el.textContent).toContain('8');
        expect(el.textContent).toContain('23');
        expect(el.textContent).toContain('6');
    });
});
