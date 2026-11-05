import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { FormularioProductoDto } from 'app/modules/admin/dashboards/surveys-products/surveys.service';
import { SurveyProductosService } from '../survey-productos.service';
import { DetailComponent } from './detail.component';

describe('encuesta pública de productos: distinción de tipo de formulario (Tarea B4)', () => {
    let fixture: ComponentFixture<DetailComponent>;

    function crearFormulario(tipo: 'producto' | 'servicio'): FormularioProductoDto {
        return {
            id: 10,
            slug: 'encuesta-prueba-tipo',
            titulo: 'Encuesta JR',
            descripcion: 'Evaluación',
            imagenPortadaUrl: 'https://ejemplo.com/banner.jpg',
            camposConfigJson: JSON.stringify([
                { id: 'nombre', tipo: 'input', etiqueta: 'Nombre', requerido: true, orden: 1 }
            ]),
            disenoConfigJson: '{}',
            tipo,
            activo: true,
            fechaCreacion: '2026-11-05T00:00:00Z',
            totalRespuestas: 0
        };
    }

    function inicializar(tipo: 'producto' | 'servicio'): void {
        const servicio = jasmine.createSpyObj<SurveyProductosService>('SurveyProductosService', ['obtenerFormularioPorSlug']);
        servicio.obtenerFormularioPorSlug.and.returnValue(of({ code: 200, message: '', data: crearFormulario(tipo) }));

        TestBed.configureTestingModule({
            imports: [DetailComponent, NoopAnimationsModule],
            providers: [
                { provide: SurveyProductosService, useValue: servicio },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'encuesta-prueba-tipo' }) } } }
            ]
        });

        fixture = TestBed.createComponent(DetailComponent);
        fixture.detectChanges();
    }

    it('Un_formulario_de_servicio_muestra_la_etiqueta_Servicio', () => {
        inicializar('servicio');

        const badges = fixture.nativeElement.querySelectorAll('.rounded-full.backdrop-blur-sm');
        const badgeTipo = Array.from(badges).find((el: any) => el.textContent?.includes('Servicio') || el.textContent?.includes('Producto')) as HTMLElement;

        expect(badgeTipo).withContext('debe existir la etiqueta de tipo en la portada').not.toBeNull();
        expect(badgeTipo.textContent).toContain('Servicio');
        expect(badgeTipo.textContent).not.toContain('Producto');
    });

    it('Un_formulario_de_producto_muestra_la_etiqueta_Producto', () => {
        inicializar('producto');

        const badges = fixture.nativeElement.querySelectorAll('.rounded-full.backdrop-blur-sm');
        const badgeTipo = Array.from(badges).find((el: any) => el.textContent?.includes('Servicio') || el.textContent?.includes('Producto')) as HTMLElement;

        expect(badgeTipo).withContext('debe existir la etiqueta de tipo en la portada').not.toBeNull();
        expect(badgeTipo.textContent).toContain('Producto');
        expect(badgeTipo.textContent).not.toContain('Servicio');
    });
});

