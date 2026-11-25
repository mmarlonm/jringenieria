import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { VisorDocumentoDialogComponent, VisorDocumentoData, sanearVinculos } from './visor-documento-dialog.component';
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

        expect(component.renderDocumento).toHaveBeenCalledWith(
            mockBlob,
            jasmine.any(HTMLElement),
            jasmine.objectContaining({ renderAltChunks: false })
        );
        expect(component.formatoNoSoportado).toBeFalse();
        expect(component.errorMsg).toBeNull();

        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('[data-testid="titulo-documento"]')?.textContent).toContain('especificaciones.docx');
        expect(el.querySelector('[data-testid="docx-container"]')).not.toBeNull();
        expect(el.querySelector('[data-testid="mensaje-formato-no-soportado"]')).toBeNull();
        expect(el.querySelector('[data-testid="mensaje-error-render"]')).toBeNull();
    }));

    it('Render_desactiva_altChunks', fakeAsync(() => {
        const mockBlob = new Blob(['docx-content'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        crearComponente({
            nombreArchivo: 'documento.docx',
            blob: mockBlob
        });

        spyOn(component, 'renderDocumento').and.returnValue(Promise.resolve());

        fixture.detectChanges();
        tick();
        fixture.detectChanges();

        expect(component.renderDocumento).toHaveBeenCalledWith(
            mockBlob,
            jasmine.any(HTMLElement),
            jasmine.objectContaining({ renderAltChunks: false })
        );
    }));

    it('Sanea_vinculos_javascript_y_data', () => {
        const container = document.createElement('div');
        container.innerHTML = `
            <a href="javascript:alert(1)" id="a-js">Enlace JS</a>
            <a href="data:text/html,<h1>XSS</h1>" id="a-data">Enlace Data</a>
            <a href="https://ejemplo.test" id="a-https">Enlace Seguro</a>
            <a href="mailto:soporte@jr.com" id="a-mail">Correo</a>
        `;

        sanearVinculos(container);

        const aJs = container.querySelector('#a-js');
        const aData = container.querySelector('#a-data');
        const aHttps = container.querySelector('#a-https');
        const aMail = container.querySelector('#a-mail');

        expect(aJs?.hasAttribute('href')).toBeFalse();
        expect(aData?.hasAttribute('href')).toBeFalse();

        expect(aHttps?.getAttribute('href')).toBe('https://ejemplo.test');
        expect(aHttps?.getAttribute('target')).toBe('_blank');
        expect(aHttps?.getAttribute('rel')).toBe('noopener noreferrer');

        expect(aMail?.getAttribute('href')).toBe('mailto:soporte@jr.com');
        expect(aMail?.getAttribute('target')).toBe('_blank');
        expect(aMail?.getAttribute('rel')).toBe('noopener noreferrer');
    });

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
