import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { environment } from 'environments/environment';
import { FormularioProductoDto, FormularioProductoSaveDto, SurveysProductsService } from './surveys.service';

/**
 * Cuando el servidor fallaba al guardar, el front guardaba la encuesta solo en el navegador (con un id inventado) y
 * la daba por guardada; al volver el servidor, la lista cargaba lo de la base y sobrescribía esa copia: las encuestas
 * desaparecían. Ahora: lo que solo exista en el navegador se sube al servidor, y si no hay nada, no se hace nada.
 */
describe('SurveysProductsService: encuestas guardadas solo en el navegador', () => {
    const URL = `${environment.apiUrl}/Encuesta/productos/formularios`;
    const CLAVE_COPIA = 'jr_formularios_productos_cache';
    const CLAVE_PENDIENTES = 'jr_formularios_productos_pendientes';
    const CLAVE_RESPALDO = 'jr_formularios_productos_respaldo';
    const CLAVE_SINCRONIZADO = 'jr_formularios_productos_sincronizado';

    let servicio: SurveysProductsService;
    let http: HttpTestingController;

    const encuesta = (id: number, slug: string, extra: Partial<FormularioProductoDto> = {}): FormularioProductoDto => ({
        id,
        slug,
        titulo: `Encuesta ${slug}`,
        descripcion: `Descripción de ${slug}`,
        camposConfigJson: '[{"id":"nombre"}]',
        disenoConfigJson: '{"modoPasos":true}',
        tipo: 'producto',
        activo: true,
        fechaCreacion: '2026-11-03T10:00:00.000Z',
        totalRespuestas: 0,
        ...extra
    });

    const guardarCopiaLocal = (lista: FormularioProductoDto[]) => localStorage.setItem(CLAVE_COPIA, JSON.stringify(lista));
    const copiaLocal = (): FormularioProductoDto[] => JSON.parse(localStorage.getItem(CLAVE_COPIA) || '[]');
    const pendientes = (): FormularioProductoDto[] => JSON.parse(localStorage.getItem(CLAVE_PENDIENTES) || '[]');

    /** Responde la petición de la lista del servidor. */
    function listaDelServidor(datos: FormularioProductoDto[]): void {
        http.expectOne((r) => r.method === 'GET' && r.url === URL).flush({ code: 200, message: '', data: datos });
    }

    /** Toma la única subida abierta (si hubiera dos a la vez, falla: deben ir una tras otra). */
    function subidaAbierta(): TestRequest {
        return http.expectOne((r) => r.method === 'POST' && r.url === URL);
    }

    beforeEach(() => {
        localStorage.removeItem(CLAVE_COPIA);
        localStorage.removeItem(CLAVE_PENDIENTES);
        localStorage.removeItem(CLAVE_RESPALDO);
        localStorage.removeItem(CLAVE_SINCRONIZADO);
        TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
        servicio = TestBed.inject(SurveysProductsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        http.verify();
        localStorage.removeItem(CLAVE_COPIA);
        localStorage.removeItem(CLAVE_PENDIENTES);
        localStorage.removeItem(CLAVE_RESPALDO);
        localStorage.removeItem(CLAVE_SINCRONIZADO);
    });

    it('si no hay nada guardado solo en el navegador, pide la lista y no hace nada más', () => {
        let resultado: FormularioProductoDto[] = [];
        let avisos = 0;
        servicio.recuperados$.subscribe(() => avisos++);

        servicio.getFormularios().subscribe((l) => (resultado = l));
        listaDelServidor([encuesta(1, 'satisfaccion-productos')]);

        expect(resultado.map((f) => f.slug)).toEqual(['satisfaccion-productos']);
        expect(avisos).toBe(0);
        expect(localStorage.getItem(CLAVE_PENDIENTES)).toBeNull();
        // http.verify() en afterEach falla si hubo cualquier subida
    });

    it('si la copia del navegador solo repite lo del servidor (aunque cambien las mayúsculas del enlace), no sube nada', () => {
        guardarCopiaLocal([encuesta(1, 'Satisfaccion-Productos')]);

        servicio.getFormularios().subscribe();
        listaDelServidor([encuesta(1, 'satisfaccion-productos')]);

        expect(localStorage.getItem(CLAVE_PENDIENTES)).toBeNull();
    });

    it('sube, una tras otra, las encuestas que solo existen en el navegador con su estado activa o inactiva, y avisa', () => {
        guardarCopiaLocal([
            encuesta(1, 'satisfaccion-productos'),
            encuesta(3, 'taller-a', { activo: true, tipo: 'servicio', sucursalId: 2 }),
            encuesta(4, 'taller-b', { activo: false })
        ]);
        let resultado: FormularioProductoDto[] = [];
        let aviso: { titulos: string[]; pendientes: number } | null = null;
        servicio.recuperados$.subscribe((a) => (aviso = a));

        servicio.getFormularios().subscribe((l) => (resultado = l));
        listaDelServidor([encuesta(1, 'satisfaccion-productos')]);

        const primera = subidaAbierta(); // la segunda no debe salir hasta que esta termine
        const enviado: FormularioProductoSaveDto = primera.request.body;
        expect(enviado).toEqual(jasmine.objectContaining({
            id: 0, slug: 'taller-a', titulo: 'Encuesta taller-a', tipo: 'servicio', sucursalId: 2, activo: true,
            camposConfigJson: '[{"id":"nombre"}]', disenoConfigJson: '{"modoPasos":true}'
        }));
        primera.flush({ code: 200, message: '', data: encuesta(10, 'taller-a', { tipo: 'servicio', sucursalId: 2 }) });

        const segunda = subidaAbierta();
        expect(segunda.request.body).toEqual(jasmine.objectContaining({ id: 0, slug: 'taller-b', activo: false }));
        segunda.flush({ code: 200, message: '', data: encuesta(11, 'taller-b', { activo: false }) });

        expect(resultado.map((f) => f.id)).toEqual([1, 10, 11]); // ids de la base, no los inventados del navegador
        expect(copiaLocal().map((f) => f.id)).toEqual([1, 10, 11]);
        expect(localStorage.getItem(CLAVE_PENDIENTES)).toBeNull();
        expect(aviso).toEqual({ titulos: ['Encuesta taller-a', 'Encuesta taller-b'], pendientes: 0 });
    });

    it('si el servidor no tiene ninguna encuesta y el navegador sí, las sube', () => {
        guardarCopiaLocal([encuesta(5, 'solo-aqui')]);
        let resultado: FormularioProductoDto[] = [];

        servicio.getFormularios().subscribe((l) => (resultado = l));
        listaDelServidor([]);
        subidaAbierta().flush({ code: 200, message: '', data: encuesta(1, 'solo-aqui') });

        expect(resultado.map((f) => f.slug)).toEqual(['solo-aqui']);
    });

    it('no sube las plantillas predeterminadas que nadie modificó', () => {
        guardarCopiaLocal([
            encuesta(1, 'satisfaccion-productos'),
            encuesta(2, 'satisfaccion-servicios'), // plantilla sin tocar: no es un dato de nadie
            encuesta(9, 'otra')
        ]);

        servicio.getFormularios().subscribe();
        listaDelServidor([encuesta(1, 'satisfaccion-productos')]);

        const subida = subidaAbierta(); // una sola: la plantilla no sube
        expect(subida.request.body.slug).toBe('otra');
        subida.flush({ code: 200, message: '', data: encuesta(30, 'otra') });
    });

    it('una plantilla predeterminada modificada en el navegador sí se sube', () => {
        guardarCopiaLocal([encuesta(2, 'satisfaccion-servicios', { activo: false, fechaModificacion: '2026-11-04T18:00:00.000Z' })]);

        servicio.getFormularios().subscribe();
        listaDelServidor([encuesta(1, 'satisfaccion-productos')]);

        expect(subidaAbierta().request.body).toEqual(jasmine.objectContaining({ slug: 'satisfaccion-servicios', activo: false }));
    });

    it('si una subida falla, la encuesta no se pierde: queda pendiente y se vuelve a intentar en la siguiente carga', () => {
        guardarCopiaLocal([encuesta(3, 'taller-a')]);
        let aviso: { titulos: string[]; pendientes: number } | null = null;
        servicio.recuperados$.subscribe((a) => (aviso = a));
        let resultado: FormularioProductoDto[] = [];

        servicio.getFormularios().subscribe((l) => (resultado = l));
        listaDelServidor([encuesta(1, 'satisfaccion-productos')]);
        subidaAbierta().flush({ message: 'caído' }, { status: 500, statusText: 'Server Error' });

        expect(resultado.map((f) => f.slug)).toEqual(['satisfaccion-productos']);
        expect(pendientes().map((f) => f.slug)).toEqual(['taller-a']); // se conserva aparte de la copia
        expect(aviso).toEqual({ titulos: [], pendientes: 1 });

        // Siguiente carga: el servidor ya responde y se sube.
        servicio.getFormularios().subscribe((l) => (resultado = l));
        listaDelServidor([encuesta(1, 'satisfaccion-productos')]);
        subidaAbierta().flush({ code: 200, message: '', data: encuesta(12, 'taller-a') });

        expect(resultado.map((f) => f.slug)).toEqual(['satisfaccion-productos', 'taller-a']);
        expect(localStorage.getItem(CLAVE_PENDIENTES)).toBeNull();
    });

    it('si falla una subida, las demás se siguen intentando', () => {
        guardarCopiaLocal([encuesta(3, 'a'), encuesta(4, 'b')]);
        let resultado: FormularioProductoDto[] = [];

        servicio.getFormularios().subscribe((l) => (resultado = l));
        listaDelServidor([encuesta(1, 'satisfaccion-productos')]);
        subidaAbierta().flush({}, { status: 500, statusText: 'Server Error' });
        subidaAbierta().flush({ code: 200, message: '', data: encuesta(20, 'b') });

        expect(resultado.map((f) => f.slug)).toEqual(['satisfaccion-productos', 'b']);
        expect(pendientes().map((f) => f.slug)).toEqual(['a']);
    });

    it('si no se puede leer la lista del servidor, muestra la copia del navegador y no toca nada', () => {
        guardarCopiaLocal([encuesta(3, 'taller-a')]);
        const antes = localStorage.getItem(CLAVE_COPIA);
        let resultado: FormularioProductoDto[] = [];

        servicio.getFormularios().subscribe((l) => (resultado = l));
        http.expectOne((r) => r.method === 'GET').flush({}, { status: 502, statusText: 'Bad Gateway' });

        expect(resultado.map((f) => f.slug)).toEqual(['taller-a']);
        expect(localStorage.getItem(CLAVE_COPIA)).toBe(antes);
        expect(localStorage.getItem(CLAVE_PENDIENTES)).toBeNull();
    });

    it('si no se puede leer la lista del servidor, lo avisa (ya no se muestra la copia del navegador en silencio)', () => {
        guardarCopiaLocal([encuesta(3, 'taller-a')]);
        let avisos = 0;
        servicio.servidorNoDisponible$.subscribe(() => avisos++);

        servicio.getFormularios().subscribe();
        http.expectOne((r) => r.method === 'GET').flush({}, { status: 502, statusText: 'Bad Gateway' });

        expect(avisos).toBe(1);
    });

    it('si el servidor responde bien, no avisa que esté caído', () => {
        let avisos = 0;
        servicio.servidorNoDisponible$.subscribe(() => avisos++);

        servicio.getFormularios().subscribe();
        listaDelServidor([encuesta(1, 'satisfaccion-productos')]);

        expect(avisos).toBe(0);
    });

    describe('respaldo de lo que la lista del servidor reemplazaría en la copia del navegador', () => {
        const respaldo = (): { fecha: string; formularios: FormularioProductoDto[] }[] =>
            JSON.parse(localStorage.getItem(CLAVE_RESPALDO) || '[]');

        it('si la copia tiene una versión distinta de una encuesta que también está en el servidor, queda respaldada', () => {
            const editadaEnElNavegador = encuesta(1, 'satisfaccion-productos', {
                titulo: 'Título editado en el navegador', fechaModificacion: '2026-11-04T09:00:00.000Z'
            });
            guardarCopiaLocal([editadaEnElNavegador]);
            let resultado: FormularioProductoDto[] = [];

            servicio.getFormularios().subscribe((l) => (resultado = l));
            listaDelServidor([encuesta(1, 'satisfaccion-productos')]);

            expect(resultado[0].titulo).toBe('Encuesta satisfaccion-productos'); // sigue mandando el servidor
            expect(respaldo().length).toBe(1);
            expect(respaldo()[0].formularios.map((f) => f.titulo)).toEqual(['Título editado en el navegador']);
            expect(respaldo()[0].fecha).toBeTruthy();
        });

        it('una copia que venía del servidor y luego cambió en el servidor no genera respaldo (no es trabajo del navegador)', () => {
            servicio.getFormularios().subscribe();
            listaDelServidor([encuesta(1, 'satisfaccion-productos')]);

            // alguien edita la encuesta desde otra PC; esta recarga la lista
            servicio.getFormularios().subscribe();
            listaDelServidor([encuesta(1, 'satisfaccion-productos', { titulo: 'Editada en otra PC' })]);

            expect(localStorage.getItem(CLAVE_RESPALDO)).toBeNull();
        });

        it('si la copia ya es idéntica a la del servidor, no se crea ningún respaldo', () => {
            guardarCopiaLocal([encuesta(1, 'satisfaccion-productos')]);

            servicio.getFormularios().subscribe();
            listaDelServidor([encuesta(1, 'satisfaccion-productos')]);

            expect(localStorage.getItem(CLAVE_RESPALDO)).toBeNull();
        });

        it('guarda como máximo los 5 respaldos más recientes', () => {
            for (let i = 1; i <= 7; i++) {
                guardarCopiaLocal([encuesta(1, 'satisfaccion-productos', { titulo: `versión ${i}` })]);
                servicio.getFormularios().subscribe();
                listaDelServidor([encuesta(1, 'satisfaccion-productos')]);
            }

            expect(respaldo().length).toBe(5);
            expect(respaldo()[0].formularios[0].titulo).toBe('versión 7'); // el más reciente primero
        });

        it('si el respaldo no se puede escribir (almacenamiento lleno), la lista carga igual', () => {
            guardarCopiaLocal([encuesta(1, 'satisfaccion-productos', { titulo: 'distinta' })]);
            const original = Storage.prototype.setItem;
            spyOn(Storage.prototype, 'setItem').and.callFake(function (this: Storage, clave: string, valor: string) {
                if (clave === CLAVE_RESPALDO) throw new DOMException('lleno', 'QuotaExceededError');
                return original.call(this, clave, valor);
            });
            let resultado: FormularioProductoDto[] = [];

            servicio.getFormularios().subscribe((l) => (resultado = l));
            listaDelServidor([encuesta(1, 'satisfaccion-productos')]);

            expect(resultado.map((f) => f.slug)).toEqual(['satisfaccion-productos']);
        });
    });

    it('una copia del navegador dañada no rompe la carga ni sube nada', () => {
        localStorage.setItem(CLAVE_COPIA, '{esto no es json');
        let resultado: FormularioProductoDto[] = [];

        servicio.getFormularios().subscribe((l) => (resultado = l));
        listaDelServidor([encuesta(1, 'satisfaccion-productos')]);

        expect(resultado.map((f) => f.slug)).toEqual(['satisfaccion-productos']);
    });

    it('si el servidor falla al guardar, el error llega a quien lo pidió y no se guarda en silencio en el navegador', () => {
        guardarCopiaLocal([encuesta(1, 'satisfaccion-productos')]);
        const antes = localStorage.getItem(CLAVE_COPIA);
        let error: unknown = null;

        servicio.guardarFormulario({ ...encuesta(0, 'nueva'), id: 0, tipo: 'producto' }).subscribe({ error: (e) => (error = e) });
        subidaAbierta().flush({ message: 'caído' }, { status: 500, statusText: 'Server Error' });

        expect(error).not.toBeNull();
        expect(localStorage.getItem(CLAVE_COPIA)).toBe(antes);
    });

    it('si el servidor falla al eliminar, el error llega a quien lo pidió y no se borra en silencio de la copia', () => {
        guardarCopiaLocal([encuesta(1, 'satisfaccion-productos')]);
        const antes = localStorage.getItem(CLAVE_COPIA);
        let error: unknown = null;

        servicio.eliminarFormulario(1).subscribe({ error: (e) => (error = e) });
        http.expectOne((r) => r.method === 'DELETE').flush({}, { status: 500, statusText: 'Server Error' });

        expect(error).not.toBeNull();
        expect(localStorage.getItem(CLAVE_COPIA)).toBe(antes);
    });

    it('guardar con éxito sigue actualizando la copia del navegador', () => {
        servicio.guardarFormulario({ ...encuesta(0, 'nueva'), id: 0, tipo: 'producto' }).subscribe();
        subidaAbierta().flush({ code: 200, message: '', data: encuesta(7, 'nueva') });

        expect(copiaLocal().some((f) => f.id === 7 && f.slug === 'nueva')).toBeTrue();
    });
});
