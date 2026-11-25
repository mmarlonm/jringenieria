import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { OnlyOfficeEditorComponent } from './only-office-editor.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('OnlyOfficeEditorComponent', () => {
    let component: OnlyOfficeEditorComponent;
    let fixture: ComponentFixture<OnlyOfficeEditorComponent>;
    let onDescargarSpy: jasmine.Spy;

    beforeEach(async () => {
        onDescargarSpy = jasmine.createSpy('onDescargar');

        await TestBed.configureTestingModule({
            imports: [OnlyOfficeEditorComponent, NoopAnimationsModule],
            providers: [
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: {
                        documentServerUrl: 'http://localhost/onlyoffice',
                        editorConfig: {
                            document: { title: 'contrato.docx' }
                        },
                        onDescargar: onDescargarSpy
                    }
                },
                {
                    provide: MatDialogRef,
                    useValue: jasmine.createSpyObj('MatDialogRef', ['close'])
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(OnlyOfficeEditorComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => {
        try {
            discardPeriodicTasks();
        } catch {}
    });

    it('si_el_editor_no_carga_en_20_s_muestra_mensaje_No_se_pudo_abrir_el_editor_y_boton_Descargar', fakeAsync(() => {
        fixture.detectChanges();

        expect(component.cargando).toBeTrue();
        expect(component.errorCarga).toBeFalse();

        // Avanzar el reloj 20 segundos
        tick(20000);
        fixture.detectChanges();

        expect(component.cargando).toBeFalse();
        expect(component.errorCarga).toBeTrue();
        expect(component.mensajeError).toBe('No se pudo abrir el editor');

        const el = fixture.nativeElement as HTMLElement;
        const msgError = el.querySelector('[data-testid="mensaje-error-editor"]');
        expect(msgError).not.toBeNull();
        expect(msgError?.textContent).toContain('No se pudo abrir el editor');

        const btnDescargar = el.querySelector<HTMLButtonElement>('[data-testid="btn-descargar-editor-fallo"]');
        expect(btnDescargar).not.toBeNull();
        btnDescargar?.click();
        expect(onDescargarSpy).toHaveBeenCalled();
    }));

    it('si_onDocumentReady_ocurre_antes_de_20_s_no_muestra_error', fakeAsync(() => {
        fixture.detectChanges();

        tick(5000);
        component.onDocumentReady();
        fixture.detectChanges();

        expect(component.errorCarga).toBeFalse();

        // Avanzar más allá de los 20 segundos
        tick(20000);
        fixture.detectChanges();

        expect(component.errorCarga).toBeFalse();
        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('[data-testid="mensaje-error-editor"]')).toBeNull();
        discardPeriodicTasks();
    }));

    it('si_onLoadComponentError_ocurre_muestra_error_y_boton_Descargar', fakeAsync(() => {
        fixture.detectChanges();

        component.onLoadComponentError(500, 'Connection lost');
        fixture.detectChanges();

        expect(component.cargando).toBeFalse();
        expect(component.errorCarga).toBeTrue();
        expect(component.mensajeError).toBe('No se pudo abrir el editor');

        const el = fixture.nativeElement as HTMLElement;
        const msgError = el.querySelector('[data-testid="mensaje-error-editor"]');
        expect(msgError).not.toBeNull();
        expect(msgError?.textContent).toContain('No se pudo abrir el editor');

        const btnDescargar = el.querySelector<HTMLButtonElement>('[data-testid="btn-descargar-editor-fallo"]');
        expect(btnDescargar).not.toBeNull();
        btnDescargar?.click();
        expect(onDescargarSpy).toHaveBeenCalled();
        discardPeriodicTasks();
    }));
});
