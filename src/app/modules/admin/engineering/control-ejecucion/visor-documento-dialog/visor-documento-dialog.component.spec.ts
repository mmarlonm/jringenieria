import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { VisorDocumentoDialogComponent, VisorDocumentoData } from './visor-documento-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import * as docxPreview from 'docx-preview';

describe('VisorDocumentoDialogComponent', () => {
    let component: VisorDocumentoDialogComponent;
    let fixture: ComponentFixture<VisorDocumentoDialogComponent>;
    let dialogRefMock: jasmine.SpyObj<MatDialogRef<VisorDocumentoDialogComponent>>;
    let onDescargarSpy: jasmine.Spy;

    function crearComponente(data: VisorDocumentoData): void {
        dialogRefMock = jasmine.createSpyObj('MatDialogRef', ['close']);
        onDescargarSpy = jasmine.createSpy('onDescargar');

        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            imports: [VisorDocumentoDialogComponent, NoopAnimationsModule],
            providers: [
                { provide: MatDialogRef, useValue: dialogRefMock },
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: { ...data, onDescargar: data.onDescargar || onDescargarSpy }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(VisorDocumentoDialogComponent);
        component = fixture.componentInstance;
    }

    it('Ver_un_docx_dibuja_con_docx_preview_desde_el_blob_y_muestra_el_contenedor', fakeAsync(() => {
        const mockBlob = new Blob(['docx-content'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

        crearComponente({
            nombreArchivo: 'especificaciones.docx',
            blob: mockBlob
        });

        spyOn(component, 'renderDocumento').and.returnValue(Promise.resolve());

        fixture.detectChanges();
        tick();
        fixture.detectChanges();

        expect(component.renderDocumento).toHaveBeenCalledWith(mockBlob, jasmine.any(HTMLElement));
        expect(component.formatoNoSoportado).toBeFalse();
        expect(component.errorMsg).toBeNull();

        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('[data-testid="titulo-documento"]')?.textContent).toContain('especificaciones.docx');
        expect(el.querySelector('[data-testid="docx-container"]')).not.toBeNull();
        expect(el.querySelector('[data-testid="mensaje-formato-no-soportado"]')).toBeNull();
        expect(el.querySelector('[data-testid="mensaje-error-render"]')).toBeNull();
    }));

    it('un_doc_viejo_muestra_Este_formato_no_se_puede_ver_aqui_y_boton_Descargar', () => {
        crearComponente({
            nombreArchivo: 'documento-antiguo.doc'
        });

        fixture.detectChanges();

        expect(component.formatoNoSoportado).toBeTrue();
        expect(component.errorMsg).toBe('Este formato no se puede ver aquí');

        const el = fixture.nativeElement as HTMLElement;
        const msg = el.querySelector('[data-testid="mensaje-formato-no-soportado"]');
        expect(msg).not.toBeNull();
        expect(msg?.textContent).toContain('Este formato no se puede ver aquí');

        const btnDescargar = el.querySelector<HTMLButtonElement>('[data-testid="btn-descargar-doc"]');
        expect(btnDescargar).not.toBeNull();
        btnDescargar?.click();
        expect(onDescargarSpy).toHaveBeenCalled();
    });

    it('si_el_dibujo_falla_muestra_mensaje_claro_y_boton_Descargar_nunca_pantalla_en_blanco', fakeAsync(() => {
        const mockBlob = new Blob(['corrupt'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

        crearComponente({
            nombreArchivo: 'danado.docx',
            blob: mockBlob
        });

        spyOn(component, 'renderDocumento').and.callFake(() => Promise.reject(new Error('Corrupt docx')));

        fixture.detectChanges();
        tick();
        fixture.detectChanges();

        expect(component.errorMsg).toBe('No se pudo visualizar el documento.');

        const el = fixture.nativeElement as HTMLElement;
        const msgError = el.querySelector('[data-testid="mensaje-error-render"]');
        expect(msgError).not.toBeNull();
        expect(msgError?.textContent).toContain('No se pudo visualizar el documento.');

        const btnDescargarFallo = el.querySelector<HTMLButtonElement>('[data-testid="btn-descargar-fallo"]');
        expect(btnDescargarFallo).not.toBeNull();
        btnDescargarFallo?.click();
        expect(onDescargarSpy).toHaveBeenCalled();
    }));
});
