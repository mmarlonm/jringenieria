import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import Swal from 'sweetalert2';
import { CampoConfig, FormularioProductoDto } from 'app/modules/admin/dashboards/surveys-products/surveys.service';
import { SurveyProductosService } from '../survey-productos.service';
import { DetailComponent } from './detail.component';

/**
 * Formulario público de la encuesta de productos. Dos fallas que bloqueaban a quien la contestaba:
 *  1. Un bloque «section» (solo un título, sin nada que llenar) guardado como requerido hacía que «Siguiente» dijera
 *     «El campo "Datos de contacto" es obligatorio» aunque el paso estuviera completo.
 *  2. Un campo «checkbox» con opciones se pintaba como UNA sola casilla en vez de una por opción: no se podían elegir las demás.
 *  (El formulario de Eventos ya hacía las dos cosas bien; el de encuestas las copió a medias.)
 */
describe('encuesta pública de productos: validación por pasos y casillas', () => {
    let fixture: ComponentFixture<DetailComponent>;
    let componente: DetailComponent;
    let servicio: jasmine.SpyObj<SurveyProductosService>;
    let aviso: jasmine.Spy;

    const campo = (c: Pick<CampoConfig, 'id' | 'tipo' | 'etiqueta'> & Partial<CampoConfig>): CampoConfig =>
        ({ requerido: false, orden: 1, paso: 1, ...c }) as CampoConfig;

    const formulario = (campos: CampoConfig[], pasos: number): FormularioProductoDto => ({
        id: 1,
        slug: 'producto-prueba',
        titulo: 'Encuesta de prueba',
        descripcion: '',
        camposConfigJson: JSON.stringify(campos.map((c, i) => ({ ...c, orden: i + 1 }))),
        disenoConfigJson: JSON.stringify({
            modoPasos: pasos > 1,
            pasos: Array.from({ length: pasos }, (_, i) => ({ numero: i + 1, titulo: `Paso ${i + 1}`, descripcion: '' }))
        }),
        tipo: 'producto',
        activo: true,
        fechaCreacion: '2026-11-04T00:00:00Z',
        totalRespuestas: 0
    });

    function abrir(campos: CampoConfig[], pasos = 2): void {
        servicio = jasmine.createSpyObj<SurveyProductosService>('SurveyProductosService', ['obtenerFormularioPorSlug', 'responderFormularioDinamico']);
        servicio.obtenerFormularioPorSlug.and.returnValue(of({ code: 200, message: '', data: formulario(campos, pasos) }));
        servicio.responderFormularioDinamico.and.returnValue(of({ code: 200, message: '', data: { id: 7 } } as never));
        aviso = spyOn(Swal, 'fire').and.returnValue(Promise.resolve({} as never));

        TestBed.configureTestingModule({
            imports: [DetailComponent, NoopAnimationsModule],
            providers: [
                { provide: SurveyProductosService, useValue: servicio },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'producto-prueba' }) } } }
            ]
        });
        fixture = TestBed.createComponent(DetailComponent);
        componente = fixture.componentInstance;
        fixture.detectChanges();
    }

    const casillas = (): HTMLInputElement[] => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('input[type="checkbox"]'));
    const marcar = (indice: number): void => {
        casillas()[indice].click();
        fixture.detectChanges();
    };

    const section = campo({ id: 'sec_contacto', tipo: 'section', etiqueta: 'Datos de contacto', requerido: true });
    const nombre = campo({ id: 'nombre', tipo: 'input', etiqueta: 'Nombre completo', requerido: true });
    const paso2 = campo({ id: 'comentarios', tipo: 'textarea', etiqueta: 'Comentarios', paso: 2 });
    const como = (extra: Partial<CampoConfig> = {}) =>
        campo({ id: 'como', tipo: 'checkbox', etiqueta: '¿Cómo nos conociste?', opciones: ['Recomendación', 'Redes sociales', 'Otro'], ...extra });

    it('Un_bloque_de_seccion_marcado_como_requerido_no_bloquea_el_paso', () => {
        abrir([section, nombre, paso2]);
        componente.respuestasDinamicas['nombre'] = 'Ana';

        componente.siguientePaso();

        expect(componente.erroresPaso).toEqual([]);
        expect(componente.pasoActual).toBe(2);
        expect(aviso).not.toHaveBeenCalled();
    });

    it('Un_campo_requerido_vacio_sigue_bloqueando_el_paso_y_lo_nombra', () => {
        abrir([section, nombre, paso2]);

        componente.siguientePaso();

        expect(componente.pasoActual).toBe(1);
        expect(componente.erroresPaso).toEqual(['El campo "Nombre completo" es obligatorio.']);
        expect(aviso).toHaveBeenCalledTimes(1);
    });

    it('Un_grupo_de_casillas_se_pinta_con_una_casilla_por_opcion_y_deja_elegir_varias', () => {
        abrir([como()], 1);

        expect(casillas().length).toBe(3);
        marcar(0);
        marcar(2);
        expect(componente.respuestasDinamicas['como']).toEqual(['Recomendación', 'Otro']);
        expect(casillas().map((c) => c.checked)).toEqual([true, false, true]);

        marcar(0); // volver a tocarla la quita
        expect(componente.respuestasDinamicas['como']).toEqual(['Otro']);
    });

    it('Un_grupo_de_casillas_requerido_bloquea_si_no_hay_ninguna_y_deja_pasar_con_una', () => {
        abrir([como({ requerido: true }), paso2]);

        componente.siguientePaso();
        expect(componente.pasoActual).toBe(1);
        expect(componente.erroresPaso).toEqual(['El campo "¿Cómo nos conociste?" es obligatorio.']);

        marcar(1);
        componente.siguientePaso();
        expect(componente.pasoActual).toBe(2);
    });

    it('Una_casilla_sin_opciones_sigue_siendo_una_sola_casilla_de_si_o_no', () => {
        abrir([campo({ id: 'acepto', tipo: 'checkbox', etiqueta: 'Acepto el aviso de privacidad' })], 1);

        expect(casillas().length).toBe(1);
        expect(componente.respuestasDinamicas['acepto']).toBeFalse();
        marcar(0);
        expect(componente.respuestasDinamicas['acepto']).toBeTrue();
    });

    it('Un_campo_que_depende_de_un_grupo_de_casillas_aparece_al_marcar_la_opcion_esperada', () => {
        const detalle = campo({ id: 'detalle', tipo: 'input', etiqueta: 'Cuéntanos más', dependeDeCampoId: 'como', dependeDeValor: 'Otro', dependeDeOperador: 'contains' });
        abrir([como(), detalle], 1);

        expect(componente.camposDelPasoActual.map((c) => c.id)).toEqual(['como']);
        marcar(2);
        expect(componente.camposDelPasoActual.map((c) => c.id)).toEqual(['como', 'detalle']);
        marcar(2);
        expect(componente.camposDelPasoActual.map((c) => c.id)).toEqual(['como']);
    });

    it('El_envio_manda_las_casillas_como_lista_en_las_respuestas', () => {
        abrir([section, nombre, como()], 1);
        componente.respuestasDinamicas['nombre'] = 'Ana';
        marcar(1);

        componente.enviarDinamico();

        expect(servicio.responderFormularioDinamico).toHaveBeenCalledTimes(1);
        const payload = servicio.responderFormularioDinamico.calls.mostRecent().args[1] as { respuestasJson: string };
        expect(JSON.parse(payload.respuestasJson)['como']).toEqual(['Redes sociales']);
        expect(componente.enviadoConExito).toBeTrue();
    });
});
