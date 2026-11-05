import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { FormularioProductoDto } from 'app/modules/admin/dashboards/surveys-products/surveys.service';
import { SurveyProductosService } from '../survey-productos.service';
import { DetailComponent } from './detail.component';

describe('encuesta pública de productos: márgenes y bordes en móvil (Tarea B3)', () => {
    let hojaDeEstilos: HTMLStyleElement;
    let fixture: ComponentFixture<DetailComponent>;
    let component: DetailComponent;
    let layout: HTMLElement;

    const formularioMock: FormularioProductoDto = {
        id: 1,
        slug: 'satisfaccion-productos',
        titulo: 'Encuesta de Satisfacción Móvil',
        descripcion: 'Formulario optimizado para pantallas pequeñas',
        camposConfigJson: JSON.stringify([
            { id: 'nombre', tipo: 'input', etiqueta: 'Nombre Completo', requerido: true, orden: 1 },
            { id: 'comentarios', tipo: 'textarea', etiqueta: 'Comentarios', requerido: false, orden: 2 }
        ]),
        disenoConfigJson: '{}',
        tipo: 'producto',
        activo: true,
        fechaCreacion: '2026-11-04T00:00:00Z',
        totalRespuestas: 0
    };

    beforeAll(() => {
        hojaDeEstilos = document.createElement('style');
        hojaDeEstilos.textContent = `
            layout router-outlet + * { position: relative; display: flex; flex: 1 1 auto; width: 100%; }
            .max-w-4xl { max-width: 56rem; width: 100%; }
            .max-w-lg { max-width: 32rem; }
            .mx-auto { margin-left: auto; margin-right: auto; }
        `;
        document.head.appendChild(hojaDeEstilos);
    });

    afterAll(() => hojaDeEstilos.remove());

    afterEach(() => {
        layout?.remove();
    });

    function inicializar(ancho: number): void {
        const servicio = jasmine.createSpyObj<SurveyProductosService>('SurveyProductosService', ['obtenerFormularioPorSlug']);
        servicio.obtenerFormularioPorSlug.and.returnValue(of({ code: 200, message: '', data: formularioMock }));

        TestBed.configureTestingModule({
            imports: [DetailComponent, NoopAnimationsModule],
            providers: [
                { provide: SurveyProductosService, useValue: servicio },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'satisfaccion-productos' }) } } }
            ]
        });
        fixture = TestBed.createComponent(DetailComponent);
        component = fixture.componentInstance;

        layout = document.createElement('layout');
        layout.style.cssText = `display:flex;flex-direction:column;flex:1 1 auto;width:${ancho}px;`;
        const envoltura = document.createElement('div');
        envoltura.style.cssText = 'display:flex;flex-direction:column;flex:1 1 auto;width:100%;';
        const contenido = document.createElement('div');
        contenido.style.cssText = 'display:flex;flex-direction:column;flex:1 1 auto;width:100%;';
        contenido.append(document.createElement('router-outlet'), fixture.nativeElement);
        envoltura.append(contenido);
        layout.append(envoltura);
        document.body.append(layout);

        fixture.detectChanges();
    }

    it('En_360_px_el_contenido_ocupa_casi_todo_el_ancho', () => {
        inicializar(360);

        const tarjeta = fixture.nativeElement.querySelector('.encuesta-tarjeta-preguntas') as HTMLElement;
        expect(tarjeta).withContext('debe existir la tarjeta principal de preguntas').not.toBeNull();

        const rectCaja = layout.getBoundingClientRect();
        const rectTarjeta = tarjeta.getBoundingClientRect();

        const margenIzquierdo = rectTarjeta.left - rectCaja.left;
        expect(rectTarjeta.width).withContext('el ancho del bloque de preguntas debe ser >= 340 px').toBeGreaterThanOrEqual(340);
        expect(margenIzquierdo).withContext('el margen lateral izquierdo debe ser <= 8 px').toBeLessThanOrEqual(8);
    });

    it('En_360_px_no_hay_recuadros_con_borde_anidados_alrededor_de_una_pregunta', () => {
        inicializar(360);

        const tarjeta = fixture.nativeElement.querySelector('.encuesta-tarjeta-preguntas') as HTMLElement;
        expect(tarjeta).not.toBeNull();

        const input = tarjeta.querySelector('input') as HTMLElement;
        expect(input).not.toBeNull();

        let ancestro: HTMLElement | null = input.parentElement;
        let ancestrosConBorde = 0;

        while (ancestro && ancestro !== tarjeta) {
            const estilo = window.getComputedStyle(ancestro);
            const borderWidth = parseFloat(estilo.borderTopWidth) || 0;
            if (borderWidth > 0 && estilo.borderStyle !== 'none') {
                ancestrosConBorde++;
            }
            ancestro = ancestro.parentElement;
        }

        expect(ancestrosConBorde).withContext('no debe haber más de 1 ancestro con borde entre la pregunta y la tarjeta').toBeLessThanOrEqual(1);
    });

    it('En_escritorio_el_formulario_sigue_centrado_con_su_tarjeta', () => {
        inicializar(1400);

        const tarjeta = fixture.nativeElement.querySelector('.max-w-4xl') as HTMLElement;
        expect(tarjeta).not.toBeNull();

        const rectCaja = layout.getBoundingClientRect();
        const rectTarjeta = tarjeta.getBoundingClientRect();

        const margenIzquierdo = rectTarjeta.left - rectCaja.left;
        const margenDerecho = rectCaja.right - rectTarjeta.right;

        expect(rectTarjeta.width).toBeLessThanOrEqual(897);
        expect(margenIzquierdo).withContext('debe haber margen en escritorio').toBeGreaterThan(100);
        expect(Math.abs(margenIzquierdo - margenDerecho)).withContext('debe estar centrado').toBeLessThan(2);
    });
});

