import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { environment } from 'environments/environment';
import { Empresa } from '../../finanzas.types';
import { EmpresaDialogComponent } from './empresa-dialog.component';

describe('EmpresaDialogComponent', () => {
    const url = `${environment.apiUrl}/Finanzas/empresas`;
    let fixture: ComponentFixture<EmpresaDialogComponent>;
    let componente: EmpresaDialogComponent;
    let httpMock: HttpTestingController;
    let dialogRef: { close: jasmine.Spy };

    beforeEach(() => {
        dialogRef = { close: jasmine.createSpy('close') };
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [provideNoopAnimations(), { provide: MatDialogRef, useValue: dialogRef }]
        });
        httpMock = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(EmpresaDialogComponent);
        componente = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => httpMock.verify());

    it('el RFC debe tener 12 o 13 caracteres y el nombre es obligatorio', () => {
        componente.form.setValue({ rfc: 'AAA010101AA', nombre: 'Empresa Ficticia' }); // 11
        expect(componente.form.invalid).toBeTrue();
        componente.form.setValue({ rfc: 'AAA010101AAA', nombre: 'Empresa Ficticia' }); // 12
        expect(componente.form.valid).toBeTrue();
        componente.form.setValue({ rfc: 'AAAA010101AAA', nombre: 'Empresa Ficticia' }); // 13
        expect(componente.form.valid).toBeTrue();
        componente.form.setValue({ rfc: 'AAAA010101AAAA', nombre: 'Empresa Ficticia' }); // 14
        expect(componente.form.invalid).toBeTrue();
        componente.form.setValue({ rfc: 'AAA010101AAA', nombre: '' });
        expect(componente.form.invalid).toBeTrue();
    });

    it('guarda con el RFC en mayúsculas y cierra devolviendo la empresa creada', () => {
        const creada: Empresa = { empresaId: 7, rfc: 'AAA010101AAA', nombre: 'Empresa Ficticia', tipo: 'M', activa: true };
        componente.form.setValue({ rfc: 'aaa010101aaa', nombre: ' Empresa Ficticia ' });

        componente.guardar();

        const req = httpMock.expectOne(url);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ rfc: 'AAA010101AAA', nombre: 'Empresa Ficticia' });
        req.flush(creada);
        expect(dialogRef.close).toHaveBeenCalledWith(creada);
    });

    it('si el API responde 409 muestra su mensaje, no cierra y permite reintentar', () => {
        componente.form.setValue({ rfc: 'AAA010101AAA', nombre: 'Empresa Ficticia' });

        componente.guardar();
        httpMock.expectOne(url).flush({ mensaje: 'Ya existe una empresa con ese RFC.' }, { status: 409, statusText: 'Conflict' });

        expect(componente.error()).toBe('Ya existe una empresa con ese RFC.');
        expect(componente.guardando()).toBeFalse();
        expect(dialogRef.close).not.toHaveBeenCalled();
    });
});
