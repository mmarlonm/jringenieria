import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { environment } from 'environments/environment';
import { SeguimientoDialogComponent } from './seguimiento-dialog.component';
import { FacturaCobranza, Seguimiento } from '../../finanzas.types';

describe('SeguimientoDialogComponent', () => {
    let fixture: ComponentFixture<SeguimientoDialogComponent>;
    let componente: SeguimientoDialogComponent;
    let httpMock: HttpTestingController;
    let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SeguimientoDialogComponent, Seguimiento>>;
    const base = `${environment.apiUrl}/Finanzas`;

    const facturaMock: FacturaCobranza = {
        cfdiId: 42,
        uuid: '12345678-1234-1234-1234-123456789abc',
        serie: 'F',
        folio: '100',
        fechaEmision: '2026-10-01T00:00:00',
        cliente: 'Cliente Prueba SA',
        rfcCliente: 'CPR010101ABC',
        moneda: 'MXN',
        total: 10000,
        cobrado: 0,
        notasCredito: 0,
        saldo: 10000,
        estadoPago: 'Pendiente',
        fechaVencimiento: '2026-11-15T00:00:00',
        cobroEsperado: '2026-11-20T00:00:00',
        fechaEfectiva: '2026-11-20T00:00:00',
        atrasada: false,
        diasAtraso: null,
        estatus: 'Programado',
        responsable: 'María Pérez',
        probabilidad: 0.85,
        observaciones: 'Pago confirmado por teléfono'
    };

    function configurar(datos: { factura: FacturaCobranza } = { factura: facturaMock }): void {
        dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

        TestBed.configureTestingModule({
            imports: [SeguimientoDialogComponent, HttpClientTestingModule],
            providers: [
                provideNoopAnimations(),
                { provide: MatDialogRef, useValue: dialogRefSpy },
                { provide: MAT_DIALOG_DATA, useValue: datos }
            ]
        });

        httpMock = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(SeguimientoDialogComponent);
        componente = fixture.componentInstance;
    }

    afterEach(() => {
        httpMock.verify();
    });

    it('Abre_con_los_valores_actuales_de_la_factura_y_la_probabilidad_en_porcentaje', () => {
        configurar();
        fixture.detectChanges();

        expect(componente.form.get('fechaVencimiento')?.value).toBe('2026-11-15');
        expect(componente.form.get('cobroEsperado')?.value).toBe('2026-11-20');
        expect(componente.form.get('estatus')?.value).toBe('Programado');
        expect(componente.form.get('responsable')?.value).toBe('María Pérez');
        expect(componente.form.get('probabilidad')?.value).toBe(85);
        expect(componente.form.get('observaciones')?.value).toBe('Pago confirmado por teléfono');
    });

    it('Guardar_manda_el_cuerpo_exacto_con_la_probabilidad_como_fraccion_y_fechas_vacias_como_null', () => {
        configurar();
        fixture.detectChanges();

        componente.form.patchValue({
            fechaVencimiento: '',
            cobroEsperado: '',
            estatus: 'EnGestion',
            responsable: '  Juan Pérez  ',
            probabilidad: 50,
            observaciones: '  Revisar saldo  '
        });

        componente.guardar();

        const req = httpMock.expectOne(`${base}/cobranza/42/seguimiento`);
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual({
            fechaVencimiento: null,
            cobroEsperado: null,
            estatus: 'EnGestion',
            responsable: 'Juan Pérez',
            probabilidad: 0.5,
            observaciones: 'Revisar saldo'
        });

        const resp: Seguimiento = {
            cfdiId: 42,
            fechaVencimiento: null,
            cobroEsperado: null,
            estatus: 'EnGestion',
            responsable: 'Juan Pérez',
            probabilidad: 0.5,
            observaciones: 'Revisar saldo',
            fechaActualizacion: '2026-11-04T12:00:00Z'
        };
        req.flush(resp);

        expect(dialogRefSpy.close).toHaveBeenCalledWith(resp);
    });

    it('Valida_longitudes_y_el_rango_de_probabilidad', () => {
        configurar();
        fixture.detectChanges();

        // Responsable > 100 caracteres
        componente.form.patchValue({ responsable: 'a'.repeat(101) });
        expect(componente.form.get('responsable')?.invalid).toBeTrue();

        // Observaciones > 500 caracteres
        componente.form.patchValue({ observaciones: 'a'.repeat(501) });
        expect(componente.form.get('observaciones')?.invalid).toBeTrue();

        // Probabilidad < 0 o > 100
        componente.form.patchValue({ probabilidad: -1 });
        expect(componente.form.get('probabilidad')?.invalid).toBeTrue();

        componente.form.patchValue({ probabilidad: 101 });
        expect(componente.form.get('probabilidad')?.invalid).toBeTrue();

        // Probabilidad válida (0 y 100)
        componente.form.patchValue({ probabilidad: 0 });
        expect(componente.form.get('probabilidad')?.valid).toBeTrue();

        componente.form.patchValue({ probabilidad: 100 });
        expect(componente.form.get('probabilidad')?.valid).toBeTrue();

        // Guardar no hace petición si es inválido
        componente.form.patchValue({ probabilidad: 150 });
        componente.guardar();
        httpMock.expectNone(`${base}/cobranza/42/seguimiento`);
    });

    it('Un_doble_clic_en_Guardar_manda_una_sola_peticion', () => {
        configurar();
        fixture.detectChanges();

        componente.guardar();
        componente.guardar();

        const req = httpMock.expectOne(`${base}/cobranza/42/seguimiento`);
        expect(componente.guardando()).toBeTrue();
        expect(dialogRefSpy.disableClose).toBeTrue();

        req.flush({
            cfdiId: 42,
            fechaVencimiento: '2026-11-15',
            cobroEsperado: '2026-11-20',
            estatus: 'Programado',
            responsable: 'María Pérez',
            probabilidad: 0.85,
            observaciones: 'Pago confirmado por teléfono',
            fechaActualizacion: '2026-11-04T12:00:00Z'
        });
        expect(dialogRefSpy.close).toHaveBeenCalledTimes(1);
    });

    it('Un_error_del_servidor_se_muestra_y_no_cierra', () => {
        configurar();
        fixture.detectChanges();

        componente.guardar();

        const req = httpMock.expectOne(`${base}/cobranza/42/seguimiento`);
        req.flush({ mensaje: 'No se pudo guardar el seguimiento.' }, { status: 400, statusText: 'Bad Request' });
        fixture.detectChanges();

        expect(componente.error()).toBe('No se pudo guardar el seguimiento.');
        expect(componente.guardando()).toBeFalse();
        expect(dialogRefSpy.disableClose).toBeFalse();
        expect(dialogRefSpy.close).not.toHaveBeenCalled();
    });

    it('Cancelar_cierra_sin_llamar_al_servicio', () => {
        configurar();
        fixture.detectChanges();

        componente.cancelar();

        httpMock.expectNone(`${base}/cobranza/42/seguimiento`);
        expect(dialogRefSpy.close).toHaveBeenCalledWith();
    });
});
