import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, of } from 'rxjs';
import { CampoConfig, SurveysProductsService } from '../surveys.service';
import { SurveysListComponent } from './surveys-list.component';

/**
 * Un campo que se creó como pregunta (requerido por defecto) y luego se convierte en «Bloque / Sección» conservaba el
 * `requerido: true` con el interruptor oculto: la encuesta pública pedía «llenar» un título y no dejaba pasar de paso.
 */
describe('SurveysListComponent: cambiar el tipo de un campo', () => {
    let componente: SurveysListComponent;

    const campo = (tipo: CampoConfig['tipo'], requerido: boolean): CampoConfig =>
        ({ id: 'c1', tipo, etiqueta: 'Datos de contacto', requerido, orden: 1, paso: 1 }) as CampoConfig;

    beforeEach(() => {
        const servicio = Object.assign(
            jasmine.createSpyObj<SurveysProductsService>('SurveysProductsService', ['getFormularios', 'obtenerRespuestasUnificadas', 'guardarFormulario', 'eliminarFormulario']),
            { recuperados$: new Subject<{ titulos: string[]; pendientes: number }>(), servidorNoDisponible$: new Subject<void>() }
        );
        servicio.getFormularios.and.returnValue(of([]));
        servicio.obtenerRespuestasUnificadas.and.returnValue(of([]));

        TestBed.configureTestingModule({
            imports: [SurveysListComponent, NoopAnimationsModule],
            providers: [
                { provide: SurveysProductsService, useValue: servicio },
                { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) }
            ]
        });
        // Se prueban los manejadores de la clase, no la plantilla.
        TestBed.overrideComponent(SurveysListComponent, { set: { template: '' } });
        componente = TestBed.createComponent(SurveysListComponent).componentInstance;
    });

    it('Convertir_un_campo_requerido_en_seccion_le_quita_requerido', () => {
        const c = campo('section', true);

        componente.onTipoCampoChange(c);

        expect(c.requerido).toBeFalse();
    });

    it('Cambiar_a_un_tipo_con_respuesta_conserva_requerido', () => {
        const c = campo('radio', true);

        componente.onTipoCampoChange(c);

        expect(c.requerido).toBeTrue();
        expect(c.opciones?.length).toBeGreaterThan(0);
    });
});
