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

    it('A_los_20s_muestra_aviso_y_el_editor_sigue_montado', fakeAsync(() => {
        fixture.detectChanges();

        expect(component.cargando).toBeTrue();
        expect(component.tardando).toBeFalse();
        expect(component.errorCarga).toBeFalse();

        // Avanzar el reloj 20 segundos
        tick(20000);
        fixture.detectChanges();

        expect(component.tardando).toBeTrue();
        expect(component.errorCarga).toBeFalse();

        const el = fixture.nativeElement as HTMLElement;
        const aviso = el.querySelector('[data-testid="aviso-tardando-editor"]');
        expect(aviso).not.toBeNull();
        expect(aviso?.textContent).toContain('El editor está tardando');

        // El editor NO debe estar desmontado
        expect(el.querySelector('document-editor')).not.toBeNull();

        const btnDescargar = el.querySelector<HTMLButtonElement>('[data-testid="btn-descargar-editor-tardando"]');
        expect(btnDescargar).not.toBeNull();
        btnDescargar?.click();
        expect(onDescargarSpy).toHaveBeenCalled();

        discardPeriodicTasks();
    }));

    it('onDocumentReady_tras_el_aviso_lo_oculta', fakeAsync(() => {
        fixture.detectChanges();

        // Avanzar 20 s para que aparezca el aviso
        tick(20000);
        fixture.detectChanges();
        expect(component.tardando).toBeTrue();
        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('[data-testid="aviso-tardando-editor"]')).not.toBeNull();

        // Llega onDocumentReady
        component.onDocumentReady();
        fixture.detectChanges();

        expect(component.tardando).toBeFalse();
        expect(component.cargando).toBeFalse();
        expect(component.errorCarga).toBeFalse();
        expect(el.querySelector('[data-testid="aviso-tardando-editor"]')).toBeNull();
        expect(el.querySelector('document-editor')).not.toBeNull();

        discardPeriodicTasks();
    }));

    it('onLoadComponentError_muestra_error_y_descargar', fakeAsync(() => {
        fixture.detectChanges();

        component.onLoadComponentError(500, 'Connection lost');
        fixture.detectChanges();

        expect(component.cargando).toBeFalse();
        expect(component.tardando).toBeFalse();
        expect(component.errorCarga).toBeTrue();
        expect(component.mensajeError).toBe('No se pudo abrir el editor');

        const el = fixture.nativeElement as HTMLElement;
        const msgError = el.querySelector('[data-testid="mensaje-error-editor"]');
        expect(msgError).not.toBeNull();
        expect(msgError?.textContent).toContain('No se pudo abrir el editor');

        // En error de componente, el editor sí se reemplaza
        expect(el.querySelector('document-editor')).toBeNull();

        const btnDescargar = el.querySelector<HTMLButtonElement>('[data-testid="btn-descargar-editor-fallo"]');
        expect(btnDescargar).not.toBeNull();
        btnDescargar?.click();
        expect(onDescargarSpy).toHaveBeenCalled();
        discardPeriodicTasks();
    }));
});
