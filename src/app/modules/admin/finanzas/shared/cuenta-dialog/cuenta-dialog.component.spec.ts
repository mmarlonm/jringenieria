import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { environment } from 'environments/environment';
import { Cuenta, Empresa } from '../../finanzas.types';
import { CuentaDialogComponent, terminacionValida } from './cuenta-dialog.component';

describe('terminacionValida', () => {
    it('acepta exactamente 4 o 5 dígitos (con espacios alrededor)', () => {
        expect(terminacionValida('1234')).toBeTrue();
        expect(terminacionValida('12345')).toBeTrue();
        expect(terminacionValida(' 1234 ')).toBeTrue();
    });

    it('rechaza vacío, menos de 4, más de 5, letras y espacios en medio', () => {
        for (const mala of ['', '   ', '123', '123456', '12a4', '12 34', '12-34', '١٢٣٤']) {
            expect(terminacionValida(mala)).withContext(`«${mala}»`).toBeFalse();
        }
    });

    it('rechaza un número de cuenta de 11 dígitos y una CLABE de 18', () => {
        expect(terminacionValida('01234567890')).toBeFalse();
        expect(terminacionValida('012345678901234567')).toBeFalse();
    });
});

describe('CuentaDialogComponent', () => {
    const base = `${environment.apiUrl}/Finanzas`;
    const empresas: Empresa[] = [
        { empresaId: 3, rfc: 'AAA010101AAA', nombre: 'Empresa Ficticia', tipo: 'M', activa: true },
        { empresaId: 4, rfc: 'BBB020202BB2', nombre: 'Otra Empresa Ficticia', tipo: 'M', activa: true }
    ];
    let fixture: ComponentFixture<CuentaDialogComponent>;
    let componente: CuentaDialogComponent;
    let httpMock: HttpTestingController;
    let dialogRef: { close: jasmine.Spy; disableClose?: boolean };

    beforeEach(() => {
        dialogRef = { close: jasmine.createSpy('close') };
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [provideNoopAnimations(), { provide: MatDialogRef, useValue: dialogRef }]
        });
        httpMock = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(CuentaDialogComponent);
        componente = fixture.componentInstance;
        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(empresas);
        fixture.detectChanges();
    });

    afterEach(() => httpMock.verify());

    const llenar = (terminacion = '1234') =>
        componente.form.setValue({ empresaId: 3, alias: ' Cheques principal ', tipo: 'Cheques', moneda: 'MXN', terminacion });

    const botonGuardar = (): HTMLButtonElement =>
        Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find((b) => b.textContent?.includes('Guardar'))!;

    it('pide empresa, alias (hasta 80) y una terminación de 4 o 5 dígitos; «Guardar» sigue deshabilitado mientras falte algo', () => {
        expect(componente.form.invalid).toBeTrue();
        expect(botonGuardar().disabled).toBeTrue();

        llenar();
        fixture.detectChanges();
        expect(componente.form.valid).toBeTrue();
        expect(botonGuardar().disabled).toBeFalse();

        componente.form.patchValue({ alias: 'x'.repeat(81) });
        expect(componente.form.controls.alias.invalid).toBeTrue();
        componente.form.patchValue({ alias: '   ' });
        expect(componente.form.controls.alias.invalid).toBeTrue();
        componente.form.patchValue({ alias: 'ok', terminacion: '012345678901234567' }); // una CLABE jamás
        expect(componente.form.controls.terminacion.invalid).toBeTrue();
        componente.form.patchValue({ terminacion: '12345' });
        expect(componente.form.valid).toBeTrue();
    });

    it('al guardar con el botón manda alias y terminación recortados, bloquea el cierre mientras guarda y devuelve la cuenta creada', () => {
        const creada: Cuenta = { cuentaId: 9, empresaId: 3, banco: 'BBVA', alias: 'Cheques principal', tipo: 'Cheques', moneda: 'MXN', terminacion: '1234', activa: true };
        llenar(' 1234 ');
        fixture.detectChanges();

        botonGuardar().click();
        const req = httpMock.expectOne(`${base}/cuentas`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ empresaId: 3, alias: 'Cheques principal', tipo: 'Cheques', moneda: 'MXN', terminacion: '1234' });
        expect(dialogRef.disableClose).toBeTrue();

        req.flush(creada);
        expect(dialogRef.close).toHaveBeenCalledOnceWith(creada);
    });

    it('un segundo clic mientras guarda no manda otra petición', () => {
        llenar();
        fixture.detectChanges();

        botonGuardar().click();
        botonGuardar().click();

        httpMock.expectOne(`${base}/cuentas`); // expectOne falla si hubo dos
    });

    it('si el API responde 409 muestra su mensaje en el diálogo, no cierra y deja volver a intentar', () => {
        llenar();
        fixture.detectChanges();

        botonGuardar().click();
        httpMock.expectOne(`${base}/cuentas`).flush({ mensaje: 'Esa empresa ya tiene una cuenta de BBVA con esa terminación.' }, { status: 409, statusText: 'Conflict' });
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('Esa empresa ya tiene una cuenta de BBVA con esa terminación.');
        expect(dialogRef.close).not.toHaveBeenCalled();
        expect(dialogRef.disableClose).toBeFalse();
        expect(componente.guardando()).toBeFalse();
    });

    it('si no hay empresas dadas de alta lo dice, y si fallan al cargar muestra el error', () => {
        expect(fixture.nativeElement.textContent).not.toContain('Todavía no hay empresas');

        const otro = TestBed.createComponent(CuentaDialogComponent);
        otro.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush([]);
        otro.detectChanges();
        expect(otro.nativeElement.textContent).toContain('Todavía no hay empresas');

        const fallido = TestBed.createComponent(CuentaDialogComponent);
        fallido.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush(null, { status: 0, statusText: 'Unknown Error' });
        fallido.detectChanges();
        expect(fallido.nativeElement.textContent).toContain('No se pudo conectar con el servidor.');
    });
});
