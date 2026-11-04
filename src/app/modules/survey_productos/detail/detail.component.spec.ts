import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { FormularioProductoDto } from 'app/modules/admin/dashboards/surveys-products/surveys.service';
import { SurveyProductosService } from '../survey-productos.service';
import { DetailComponent } from './detail.component';

/**
 * La encuesta pública se abre dentro del layout vacío de la aplicación. layout.component.scss hace `display: flex`
 * a todo componente que carga como ruta, y en una fila flex el contenedor del formulario se encogía a su contenido:
 * el `mx-auto` no tenía espacio donde centrarlo y la encuesta salía pegada a la izquierda.
 */
describe('encuesta pública de productos: posición y adaptación al ancho', () => {
    let hojaDeEstilos: HTMLStyleElement;
    let fixture: ComponentFixture<DetailComponent>;
    let layout: HTMLElement;

    const formulario = (activo: boolean): FormularioProductoDto => ({
        id: 1,
        slug: 'satisfaccion-productos',
        titulo: 'Encuesta de Satisfacción',
        descripcion: 'Tu opinión nos ayuda a mejorar.',
        camposConfigJson: JSON.stringify([{ id: 'nombre', tipo: 'input', etiqueta: 'Nombre', requerido: true, orden: 1 }]),
        disenoConfigJson: '{}',
        tipo: 'producto',
        activo,
        fechaCreacion: '2026-11-04T00:00:00Z',
        totalRespuestas: 0
    });

    beforeAll(() => {
        // Karma no carga Tailwind: se definen aquí las utilidades que centran el formulario y la regla del layout que causaba el problema.
        hojaDeEstilos = document.createElement('style');
        hojaDeEstilos.textContent = `
            layout router-outlet + * { position: relative; display: flex; flex: 1 1 auto; width: 100%; }
            .max-w-4xl { max-width: 56rem; }
            .max-w-lg { max-width: 32rem; }
            .mx-auto { margin-left: auto; margin-right: auto; }
        `;
        document.head.appendChild(hojaDeEstilos);
    });

    afterAll(() => hojaDeEstilos.remove());

    afterEach(() => layout?.remove());

    /** Crea el componente y lo coloca donde lo pone la aplicación: layout > envoltura > contenido > router-outlet + componente. */
    function abrir(activo: boolean, anchoDeLaPantalla: number): void {
        const servicio = jasmine.createSpyObj<SurveyProductosService>('SurveyProductosService', ['obtenerFormularioPorSlug']);
        servicio.obtenerFormularioPorSlug.and.returnValue(of({ code: 200, message: '', data: formulario(activo) }));

        TestBed.configureTestingModule({
            imports: [DetailComponent, NoopAnimationsModule],
            providers: [
                { provide: SurveyProductosService, useValue: servicio },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'satisfaccion-productos' }) } } }
            ]
        });
        fixture = TestBed.createComponent(DetailComponent);

        layout = document.createElement('layout');
        layout.style.cssText = `display:flex;flex:1 1 auto;width:${anchoDeLaPantalla}px;`;
        const envoltura = document.createElement('div');
        envoltura.style.cssText = 'display:flex;flex-direction:column;flex:1 1 auto;width:100%;';
        const contenido = document.createElement('div');
        contenido.style.cssText = 'display:flex;flex-direction:column;flex:1 1 auto;';
        contenido.append(document.createElement('router-outlet'), fixture.nativeElement);
        envoltura.append(contenido);
        layout.append(envoltura);
        document.body.append(layout);

        fixture.detectChanges();
    }

    function margenes(selector: string): { izquierdo: number; derecho: number; ancho: number } {
        const tarjeta = (fixture.nativeElement as HTMLElement).querySelector(selector) as HTMLElement;
        expect(tarjeta).withContext(`no existe ${selector}`).not.toBeNull();
        const caja = layout.getBoundingClientRect();
        const t = tarjeta.getBoundingClientRect();
        return { izquierdo: t.left - caja.left, derecho: caja.right - t.right, ancho: t.width };
    }

    it('en una pantalla ancha el formulario queda centrado, con el mismo margen a cada lado', () => {
        abrir(true, 1400);

        const { izquierdo, derecho, ancho } = margenes('.max-w-4xl');

        expect(ancho).toBeLessThanOrEqual(897);
        expect(izquierdo).withContext('debe haber margen a la izquierda').toBeGreaterThan(100);
        expect(Math.abs(izquierdo - derecho)).withContext(`izquierdo ${izquierdo} · derecho ${derecho}`).toBeLessThan(2);
    });

    it('el aviso «Encuesta No Disponible» también queda centrado', () => {
        abrir(false, 1400);

        const { izquierdo, derecho } = margenes('.max-w-lg');

        expect(izquierdo).toBeGreaterThan(100);
        expect(Math.abs(izquierdo - derecho)).withContext(`izquierdo ${izquierdo} · derecho ${derecho}`).toBeLessThan(2);
    });

    it('en una pantalla angosta (teléfono) el formulario cabe en el ancho y no se sale por ningún lado', () => {
        abrir(true, 360);

        const { izquierdo, derecho, ancho } = margenes('.max-w-4xl');

        expect(izquierdo).toBeGreaterThanOrEqual(-0.5);
        expect(derecho).toBeGreaterThanOrEqual(-0.5);
        expect(ancho).toBeLessThanOrEqual(360.5);
    });
});
