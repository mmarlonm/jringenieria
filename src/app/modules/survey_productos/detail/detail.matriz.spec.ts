import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { FormularioProductoDto } from 'app/modules/admin/dashboards/surveys-products/surveys.service';
import { SurveyProductosService } from '../survey-productos.service';
import { DetailComponent } from './detail.component';

describe('encuesta pública de productos: matriz en celular y escritorio (Tarea B2)', () => {
    let hojaDeEstilos: HTMLStyleElement;
    let fixture: ComponentFixture<DetailComponent>;
    let component: DetailComponent;
    let layout: HTMLElement;

    const columnas11 = [
        { valor: '0', etiqueta: '0' },
        { valor: '1', etiqueta: '1' },
        { valor: '2', etiqueta: '2' },
        { valor: '3', etiqueta: '3' },
        { valor: '4', etiqueta: '4' },
        { valor: '5', etiqueta: '5' },
        { valor: '6', etiqueta: '6' },
        { valor: '7', etiqueta: '7' },
        { valor: '8', etiqueta: '8' },
        { valor: '9', etiqueta: '9' },
        { valor: '10', etiqueta: '10' }
    ];

    const filasMatriz = [
        { id: 'cumplimiento', texto: 'Cumplimiento de especificaciones', subtexto: 'Calidad técnica JR' },
        { id: 'atencion', texto: 'Atención del asesor', subtexto: 'Soporte y respuesta' }
    ];

    const formularioConMatriz: FormularioProductoDto = {
        id: 1,
        slug: 'satisfaccion-productos',
        titulo: 'Encuesta de Satisfacción',
        descripcion: 'Tu opinión nos ayuda a mejorar.',
        camposConfigJson: JSON.stringify([
            {
                id: 'matriz_calidad',
                tipo: 'matrix',
                etiqueta: 'Evaluación de Calidad',
                requerido: true,
                orden: 1,
                columnasMatriz: columnas11,
                filasMatriz: filasMatriz
            }
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
        servicio.obtenerFormularioPorSlug.and.returnValue(of({ code: 200, message: '', data: formularioConMatriz }));

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

    it('En_360_px_la_matriz_no_tiene_scroll_horizontal_y_muestra_las_11_opciones_de_cada_fila', () => {
        inicializar(360);

        const contenedor = fixture.nativeElement.querySelector('.matriz-contenedor') as HTMLElement;
        expect(contenedor).withContext('debe existir el contenedor de la matriz').not.toBeNull();
        expect(contenedor.scrollWidth).withContext('no debe tener scroll horizontal en 360 px').toBeLessThanOrEqual(contenedor.clientWidth);

        const filas = fixture.nativeElement.querySelectorAll('.matriz-fila-tarjeta') as NodeListOf<HTMLElement>;
        expect(filas.length).toBe(2);
        filas.forEach((fila) => {
            const opciones = fila.querySelectorAll('.matriz-opcion-label');
            expect(opciones.length).withContext('cada fila debe mostrar 11 opciones en móvil').toBe(11);
        });
    });

    it('En_360_px_el_texto_de_la_pregunta_esta_junto_a_sus_opciones', () => {
        inicializar(360);

        const fila = fixture.nativeElement.querySelector('.matriz-fila-tarjeta') as HTMLElement;
        expect(fila).not.toBeNull();

        const titulo = fila.querySelector('.matriz-fila-titulo') as HTMLElement;
        const opciones = fila.querySelector('.matriz-opciones-grid') as HTMLElement;
        expect(titulo).not.toBeNull();
        expect(opciones).not.toBeNull();
        expect(titulo.textContent).toContain('Cumplimiento de especificaciones');

        const rectFila = fila.getBoundingClientRect();
        const rectTitulo = titulo.getBoundingClientRect();
        const rectOpciones = opciones.getBoundingClientRect();

        expect(rectTitulo.top).toBeGreaterThanOrEqual(rectFila.top - 1);
        expect(rectOpciones.bottom).toBeLessThanOrEqual(rectFila.bottom + 1);
        expect(rectTitulo.bottom).toBeLessThanOrEqual(rectOpciones.top + 1);
    });

    it('Elegir_una_opcion_la_marca_y_conserva_el_valor_al_cambiar_el_ancho', () => {
        inicializar(360);

        const fila1 = fixture.nativeElement.querySelector('.matriz-fila-tarjeta') as HTMLElement;
        const radio7 = fila1.querySelector('.matriz-opcion-label input[value="7"]') as HTMLInputElement;
        expect(radio7).not.toBeNull();
        radio7.click();
        fixture.detectChanges();

        expect(component.obtenerValorMatriz('matriz_calidad', 'cumplimiento')).toBe('7');
        expect(radio7.checked).toBeTrue();

        // Cambiar a ancho de escritorio (1024 px)
        layout.style.width = '1024px';
        fixture.detectChanges();

        expect(component.obtenerValorMatriz('matriz_calidad', 'cumplimiento')).toBe('7');
        const desktopRadio7 = fixture.nativeElement.querySelector('.matriz-tabla input[value="7"]') as HTMLInputElement;
        expect(desktopRadio7).not.toBeNull();
        expect(desktopRadio7.checked).toBeTrue();

        // Volver a 360 px
        layout.style.width = '360px';
        fixture.detectChanges();

        expect(component.obtenerValorMatriz('matriz_calidad', 'cumplimiento')).toBe('7');
        const mobileRadio7 = fila1.querySelector('.matriz-opcion-label input[value="7"]') as HTMLInputElement;
        expect(mobileRadio7.checked).toBeTrue();
    });

    it('En_ancho_de_escritorio_la_primera_columna_es_fija', () => {
        inicializar(1024);

        const th = fixture.nativeElement.querySelector('.matriz-tabla th.matriz-columna-fija') as HTMLElement;
        const td = fixture.nativeElement.querySelector('.matriz-tabla td.matriz-columna-fija') as HTMLElement;
        expect(th).withContext('th fija de la matriz').not.toBeNull();
        expect(td).withContext('td fija de la matriz').not.toBeNull();

        const estiloTh = window.getComputedStyle(th);
        const estiloTd = window.getComputedStyle(td);

        expect(estiloTh.position).toBe('sticky');
        expect(estiloTd.position).toBe('sticky');
        expect(estiloTh.left).toBe('0px');
        expect(estiloTd.left).toBe('0px');
        expect(estiloTh.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(estiloTd.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });

    it('Las_opciones_tienen_area_tactil_de_al_menos_40_px', () => {
        inicializar(360);

        const labels = fixture.nativeElement.querySelectorAll('.matriz-fila-tarjeta .matriz-opcion-label') as NodeListOf<HTMLElement>;
        expect(labels.length).toBe(22);
        labels.forEach((lbl) => {
            const rect = lbl.getBoundingClientRect();
            expect(rect.width).withContext(`ancho >= 40 px para opcion ${lbl.textContent?.trim()}`).toBeGreaterThanOrEqual(40);
            expect(rect.height).withContext(`alto >= 40 px para opcion ${lbl.textContent?.trim()}`).toBeGreaterThanOrEqual(40);
        });
    });
});

