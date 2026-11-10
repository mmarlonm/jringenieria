import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from 'environments/environment';
import { FormularioProductoDto, FormularioProductoSaveDto, SurveysProductsService } from './surveys.service';

describe('SurveysProductsService', () => {
    const URL = `${environment.apiUrl}/Encuesta/productos/formularios`;
    const CLAVES_HEREDADAS = [
        'jr_formularios_productos_cache',
        'jr_formularios_productos_pendientes',
        'jr_formularios_productos_respaldo',
        'jr_formularios_productos_sincronizado',
        'jr_respuestas_productos_cache'
    ];

    let servicio: SurveysProductsService;
    let http: HttpTestingController;

    const mockEncuesta = (id: number, slug: string): FormularioProductoDto => ({
        id,
        slug,
        titulo: `Encuesta ${slug}`,
        descripcion: `Descripción de ${slug}`,
        camposConfigJson: '[]',
        disenoConfigJson: '{}',
        tipo: 'producto',
        activo: true,
        fechaCreacion: '2026-11-03T10:00:00.000Z',
        totalRespuestas: 0
    });

    beforeEach(() => {
        CLAVES_HEREDADAS.forEach(k => localStorage.setItem(k, 'residuo-anterior'));
        TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
        servicio = TestBed.inject(SurveysProductsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        http.verify();
        CLAVES_HEREDADAS.forEach(k => localStorage.removeItem(k));
    });

    it('al inicializarse limpia cualquier residuo heredado de localStorage', () => {
        CLAVES_HEREDADAS.forEach(k => {
            expect(localStorage.getItem(k)).toBeNull();
        });
    });

    it('getFormularios pide la lista al API directamente sin escribir en localStorage', () => {
        let resultado: FormularioProductoDto[] = [];
        servicio.getFormularios().subscribe(data => (resultado = data));

        const req = http.expectOne(r => r.method === 'GET' && r.url === URL);
        req.flush({ code: 200, message: '', data: [mockEncuesta(1, 'satisfaccion-productos')] });

        expect(resultado.length).toBe(1);
        expect(resultado[0].slug).toBe('satisfaccion-productos');
        CLAVES_HEREDADAS.forEach(k => expect(localStorage.getItem(k)).toBeNull());
    });

    it('getFormularioById obtiene el formulario específico por ID', () => {
        let resultado: FormularioProductoDto | null = null;
        servicio.getFormularioById(1).subscribe(data => (resultado = data));

        const req = http.expectOne(r => r.method === 'GET' && r.url === `${URL}/1`);
        req.flush({ code: 200, message: '', data: mockEncuesta(1, 'satisfaccion-productos') });

        expect(resultado).not.toBeNull();
        expect(resultado?.id).toBe(1);
    });

    it('getFormularioBySlug obtiene el formulario por slug codificado', () => {
        let resultado: FormularioProductoDto | null = null;
        servicio.getFormularioBySlug('satisfaccion-productos').subscribe(data => (resultado = data));

        const req = http.expectOne(r => r.method === 'GET' && r.url === `${URL}/slug/satisfaccion-productos`);
        req.flush({ code: 200, message: '', data: mockEncuesta(1, 'satisfaccion-productos') });

        expect(resultado?.slug).toBe('satisfaccion-productos');
    });

    it('guardarFormulario envía el POST al servidor y retorna el formulario sin persistir en local', () => {
        const dto: FormularioProductoSaveDto = {
            id: 0,
            slug: 'nueva-encuesta',
            titulo: 'Nueva Encuesta',
            descripcion: 'Desc',
            camposConfigJson: '[]',
            disenoConfigJson: '{}',
            tipo: 'producto',
            activo: true
        };

        let resultado: FormularioProductoDto | null = null;
        servicio.guardarFormulario(dto).subscribe(res => (resultado = res));

        const req = http.expectOne(r => r.method === 'POST' && r.url === URL);
        expect(req.request.body).toEqual(dto);
        req.flush({ code: 200, message: '', data: mockEncuesta(10, 'nueva-encuesta') });

        expect(resultado?.id).toBe(10);
        CLAVES_HEREDADAS.forEach(k => expect(localStorage.getItem(k)).toBeNull());
    });

    it('eliminarFormulario envía el DELETE al servidor', () => {
        let ejecutado = false;
        servicio.eliminarFormulario(5).subscribe(() => (ejecutado = true));

        const req = http.expectOne(r => r.method === 'DELETE' && r.url === `${URL}/5`);
        req.flush({ code: 200, message: 'Eliminado' });

        expect(ejecutado).toBeTrue();
    });

    it('responderFormularioDinamico envía respuesta dinámica sin almacenar en local', () => {
        let ok = false;
        servicio.responderFormularioDinamico('encuesta-test', { respuesta: 'excelente' }).subscribe(() => (ok = true));

        const req = http.expectOne(r => r.method === 'POST' && r.url === `${URL}/slug/encuesta-test/responder`);
        expect(req.request.body).toEqual({ respuesta: 'excelente' });
        req.flush({ code: 200, message: 'Guardado' });

        expect(ok).toBeTrue();
        CLAVES_HEREDADAS.forEach(k => expect(localStorage.getItem(k)).toBeNull());
    });
});
