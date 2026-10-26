import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { environment } from 'environments/environment';
import { CfdiCandidato, MovimientoConciliacion, Vinculo } from '../../finanzas.types';
import { ManualDialogComponent, ManualDialogData } from './manual-dialog.component';

describe('ManualDialogComponent', () => {
    const base = `${environment.apiUrl}/Finanzas`;
    const movimiento: MovimientoConciliacion = {
        movimientoId: 10,
        cuentaId: 1,
        fecha: '2026-01-15',
        descripcion: 'Abono cliente ficticio',
        importe: 5000,
        saldo: null,
        tipoOperacion: null,
        clase: null,
        estado: 'SinConciliar',
        pendiente: 5000,
        sugerencias: [],
        confirmadas: []
    };
    const data: ManualDialogData = { movimiento, moneda: 'MXN' };

    const candidatos: CfdiCandidato[] = [
        {
            cfdiId: 101,
            uuid: '11111111-2222-3333-4444-555555555555',
            serie: 'F',
            folio: '1001',
            fechaEmision: '2026-01-10',
            contraparte: 'Cliente Ficticio SA de CV',
            tipoComprobante: 'I',
            metodoPago: 'PPD',
            total: 6000,
            saldo: 4000,
            moneda: 'MXN'
        },
        {
            cfdiId: 102,
            uuid: '22222222-3333-4444-5555-666666666666',
            serie: null,
            folio: '2002',
            fechaEmision: '2026-01-12',
            contraparte: 'Otro Cliente Ficticio SA de CV',
            tipoComprobante: 'P',
            metodoPago: null,
            total: 2000,
            saldo: 2000,
            moneda: 'MXN'
        }
    ];

    let fixture: ComponentFixture<ManualDialogComponent>;
    let componente: ManualDialogComponent;
    let httpMock: HttpTestingController;
    let dialogRef: { close: jasmine.Spy; disableClose?: boolean };

    beforeEach(() => {
        dialogRef = { close: jasmine.createSpy('close') };
        TestBed.configureTestingModule({
            imports: [ManualDialogComponent, HttpClientTestingModule],
            providers: [
                provideNoopAnimations(),
                { provide: MatDialogRef, useValue: dialogRef },
                { provide: MAT_DIALOG_DATA, useValue: data }
            ]
        });
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    function crearComponente(): void {
        fixture = TestBed.createComponent(ManualDialogComponent);
        componente = fixture.componentInstance;
        fixture.detectChanges();
    }

    const botonAplicar = (): HTMLButtonElement =>
        Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find((b) => b.textContent?.includes('Aplicar'))!;

    it('Al_abrir_pide_los_candidatos_sin_q_y_los_lista', () => {
        crearComponente();

        const req = httpMock.expectOne((r) => r.url === `${base}/conciliacion/cfdi-candidatos`);
        expect(req.request.method).toBe('GET');
        expect(req.request.params.get('movimientoId')).toBe('10');
        expect(req.request.params.has('q')).toBeFalse();

        req.flush(candidatos);
        fixture.detectChanges();

        const texto = fixture.nativeElement.textContent;
        expect(texto).toContain('F-1001');
        expect(texto).toContain('Cliente Ficticio SA de CV');
        expect(texto).toContain('2002');
        expect(texto).toContain('Otro Cliente Ficticio SA de CV');
    });

    it('Buscar_pide_de_nuevo_con_q_recortado_y_cancela_la_anterior', () => {
        crearComponente();

        const primera: TestRequest = httpMock.expectOne((r) => r.url === `${base}/conciliacion/cfdi-candidatos`);

        componente.buscar('  1001  ');

        expect(primera.cancelled).toBeTrue();
        const segunda = httpMock.expectOne((r) => r.url === `${base}/conciliacion/cfdi-candidatos`);
        expect(segunda.request.params.get('q')).toBe('1001');
        segunda.flush([candidatos[0]]);
        fixture.detectChanges();

        const texto = fixture.nativeElement.textContent;
        expect(texto).toContain('F-1001');
        expect(texto).not.toContain('Otro Cliente Ficticio SA de CV');
    });

    it('Sin_candidatos_muestra_el_estado_vacio', () => {
        crearComponente();

        httpMock.expectOne((r) => r.url === `${base}/conciliacion/cfdi-candidatos`).flush([]);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('Ninguna factura coincide');
    });

    it('Error_de_candidatos_muestra_Reintentar_y_reintenta', () => {
        crearComponente();

        httpMock.expectOne((r) => r.url === `${base}/conciliacion/cfdi-candidatos`).flush(null, { status: 500, statusText: 'Server Error' });
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('Ocurrió un error inesperado.');
        const botonReintentar = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find((b) => b.textContent?.includes('Reintentar'));
        expect(botonReintentar).toBeTruthy();

        botonReintentar!.click();
        const reintento = httpMock.expectOne((r) => r.url === `${base}/conciliacion/cfdi-candidatos`);
        reintento.flush(candidatos);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('F-1001');
    });

    it('Elegir_candidato_llena_el_importe_con_el_menor_entre_pendiente_y_saldo', () => {
        crearComponente();
        httpMock.expectOne((r) => r.url === `${base}/conciliacion/cfdi-candidatos`).flush(candidatos);
        fixture.detectChanges();

        // pendiente = 5000, candidato[0].saldo = 4000 -> menor es 4000
        componente.elegirCandidato(candidatos[0]);
        fixture.detectChanges();

        expect(componente.importe()).toBe(4000);
        expect(componente.candidatoSeleccionado()).toBe(candidatos[0]);
    });

    it('Aplicar_esta_deshabilitado_sin_candidato_con_importe_cero_negativo_o_mayor_al_maximo', () => {
        crearComponente();
        httpMock.expectOne((r) => r.url === `${base}/conciliacion/cfdi-candidatos`).flush(candidatos);
        fixture.detectChanges();

        expect(botonAplicar().disabled).toBeTrue();

        // Elegir candidato con saldo 4000 (menor que pendiente 5000)
        componente.elegirCandidato(candidatos[0]);
        fixture.detectChanges();
        expect(botonAplicar().disabled).toBeFalse();

        // Importe <= 0
        componente.importe.set(0);
        fixture.detectChanges();
        expect(botonAplicar().disabled).toBeTrue();

        componente.importe.set(-10);
        fixture.detectChanges();
        expect(botonAplicar().disabled).toBeTrue();

        // Mayor al máximo (4000): 4000.02 es > 4000.01 (un centavo de más sí se acepta, dos centavos no)
        componente.importe.set(4000.02);
        fixture.detectChanges();
        expect(botonAplicar().disabled).toBeTrue();

        componente.importe.set(4000.01);
        fixture.detectChanges();
        expect(botonAplicar().disabled).toBeFalse();

        // Casos de coma flotante indicados en el plan:
        // Caso 100.00
        componente.candidatoSeleccionado.set({ ...candidatos[0], saldo: 100.00 });
        componente.importe.set(100.01);
        expect(componente.esValido()).toBeTrue();
        componente.importe.set(100.02);
        expect(componente.esValido()).toBeFalse();

        // Caso 0.07 (0.07 + 0.01 = 0.08000000000000002)
        componente.candidatoSeleccionado.set({ ...candidatos[0], saldo: 0.07 });
        componente.importe.set(0.08);
        expect(componente.esValido()).toBeTrue();
        componente.importe.set(0.09);
        expect(componente.esValido()).toBeFalse();

        // Caso 1234.57
        componente.candidatoSeleccionado.set({ ...candidatos[0], saldo: 1234.57 });
        componente.importe.set(1234.58);
        expect(componente.esValido()).toBeTrue();
        componente.importe.set(1234.59);
        expect(componente.esValido()).toBeFalse();
    });

    it('Aplicar_envia_el_cuerpo_exacto_y_cierra_con_el_vinculo', () => {
        crearComponente();
        httpMock.expectOne((r) => r.url === `${base}/conciliacion/cfdi-candidatos`).flush(candidatos);
        fixture.detectChanges();

        componente.elegirCandidato(candidatos[0]);
        fixture.detectChanges();

        botonAplicar().click();

        const req = httpMock.expectOne(`${base}/conciliacion/manual`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({
            movimientoId: 10,
            cfdiId: 101,
            importeAplicado: 4000
        });
        expect(dialogRef.disableClose).toBeTrue();

        const vinculoCreado: Vinculo = {
            conciliacionId: 50,
            cfdiId: 101,
            uuid: candidatos[0].uuid,
            serie: 'F',
            folio: '1001',
            contraparte: candidatos[0].contraparte,
            total: 6000,
            saldo: 0,
            moneda: 'MXN',
            regla: 'MANUAL',
            confianza: null,
            estado: 'Confirmada',
            importeAplicado: 4000
        };

        req.flush(vinculoCreado);
        expect(dialogRef.close).toHaveBeenCalledOnceWith(vinculoCreado);
    });

    it('Doble_clic_en_Aplicar_manda_una_sola_peticion', () => {
        crearComponente();
        httpMock.expectOne((r) => r.url === `${base}/conciliacion/cfdi-candidatos`).flush(candidatos);
        fixture.detectChanges();

        componente.elegirCandidato(candidatos[0]);
        fixture.detectChanges();

        botonAplicar().click();
        botonAplicar().click();

        const req = httpMock.expectOne(`${base}/conciliacion/manual`);
        expect(req.request.method).toBe('POST');
    });

    it('Error_409_muestra_el_mensaje_no_cierra_y_vuelve_a_habilitar', () => {
        crearComponente();
        httpMock.expectOne((r) => r.url === `${base}/conciliacion/cfdi-candidatos`).flush(candidatos);
        fixture.detectChanges();

        componente.elegirCandidato(candidatos[0]);
        fixture.detectChanges();

        botonAplicar().click();

        httpMock.expectOne(`${base}/conciliacion/manual`).flush(
            { mensaje: 'La factura ya no tiene saldo disponible.' },
            { status: 409, statusText: 'Conflict' }
        );
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('La factura ya no tiene saldo disponible.');
        expect(dialogRef.close).not.toHaveBeenCalled();
        expect(dialogRef.disableClose).toBeFalse();
        expect(componente.guardando()).toBeFalse();
        expect(botonAplicar().disabled).toBeFalse();
    });
});
