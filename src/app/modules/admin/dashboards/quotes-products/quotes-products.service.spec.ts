import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { QuotesService } from './quotes-products.service';
import { environment } from 'environments/environment';
import {
    CatalogosSgc,
    GuardarCotizacionSgc,
    RespuestaObtenerSgc,
    ResumenSgc
} from './quotes-products.types';
import { ContpaqiMaterialDto } from 'app/modules/admin/administration/solicitudes-compra/models/solicitud-compra.types';

describe('QuotesService SGC', () => {
    let service: QuotesService;
    let httpMock: HttpTestingController;
    const apiUrl = `${environment.apiUrl}/CotizacionProductos`;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [QuotesService],
        });
        service = TestBed.inject(QuotesService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('catalogosSgc_hace_GET_a_sgc_catalogos', () => {
        const mockCatalogos: CatalogosSgc = {
            tipos: [{ codigo: 'CS', nombre: 'Comercial simple' }],
            monedas: [{ codigo: 'MXN', nombre: 'Pesos' }],
            tiposConcepto: [{ codigo: 'Material', nombre: 'Material eléctrico' }],
            entregables: [{ codigo: 'Suministro', nombre: 'Suministro' }],
            ivaTasa: 0.16,
        };

        service.catalogosSgc().subscribe((res) => {
            expect(res).toEqual(mockCatalogos);
        });

        const req = httpMock.expectOne(`${apiUrl}/sgc/catalogos`);
        expect(req.request.method).toBe('GET');
        req.flush(mockCatalogos);
    });

    it('guardarSgc_hace_POST_a_sgc_con_el_cuerpo', () => {
        const mockDto: GuardarCotizacionSgc = {
            cotizacion: {
                cotizacionProductosId: 0,
                clienteId: 1,
                unidadDeNegocioId: 2,
                requisitosEspeciales: false,
                nombreCliente: 'Cliente Test',
            },
            sgc: {
                tipo: 'CS',
                moneda: 'MXN',
                vigenciaDias: 15,
                entregables: [],
            },
            partidas: [
                {
                    partida: 1,
                    tipoConcepto: 'Material',
                    materialServicio: 'Tubo PVC',
                    unidad: 'PZA',
                    cantidad: 2,
                    precioUnitario: 50,
                    descuento: 0,
                },
            ],
        };

        const mockResponse = {
            code: 200,
            message: 'Cotización guardada correctamente.',
            data: {
                cotizacionProductosId: 10,
                folio: 'COT-2026-0001',
                version: 1,
                subtotal: 100,
                iva: 16,
                total: 116,
                faltantes: [],
            },
        };

        service.guardarSgc(mockDto).subscribe((res) => {
            expect(res).toEqual(mockResponse);
        });

        const req = httpMock.expectOne(`${apiUrl}/sgc`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(mockDto);
        req.flush(mockResponse);
    });

    it('obtenerSgc_hace_GET_a_id_sgc', () => {
        const mockRespuesta: RespuestaObtenerSgc = {
            cotizacionProductosId: 42,
            sgc: null,
            partidas: [],
            partidasHeredadas: false,
            totales: {
                subtotal: 0,
                iva: 0,
                total: 0,
                costoDirecto: 0,
                utilidad: null,
                margenPorcentaje: null,
                margenBajo: false,
                partidasSinCosto: 0,
            },
            faltantes: [],
        };

        service.obtenerSgc(42).subscribe((res) => {
            expect(res).toEqual(mockRespuesta);
        });

        const req = httpMock.expectOne(`${apiUrl}/42/sgc`);
        expect(req.request.method).toBe('GET');
        req.flush(mockRespuesta);
    });

    it('resumenSgc_manda_los_ids_separados_por_coma', () => {
        const mockResumen: ResumenSgc[] = [
            {
                cotizacionProductosId: 1,
                folio: 'COT-2026-0001',
                tipo: 'CS',
                version: 1,
                total: 500,
                moneda: 'MXN',
            },
        ];

        service.resumenSgc([1, 2, 3]).subscribe((res) => {
            expect(res).toEqual(mockResumen);
        });

        const req = httpMock.expectOne(`${apiUrl}/sgc-resumen?ids=1,2,3`);
        expect(req.request.method).toBe('GET');
        req.flush(mockResumen);
    });

    it('resumenSgc_sin_ids_no_llama', () => {
        service.resumenSgc([]).subscribe((res) => {
            expect(res).toEqual([]);
        });

        httpMock.expectNone(`${apiUrl}/sgc-resumen`);
    });

    it('buscarExistencia_agrupa_por_codigo', () => {
        const rawExistencias = [
            {
                codigoProducto: 'C01',
                nombreProducto: 'Cable Calibre 12',
                unidadMedida: 'M',
                existencia: 10,
                almacen: 'Almacén 1',
            },
            {
                codigoProducto: 'C01',
                nombreProducto: 'Cable Calibre 12',
                unidadMedida: 'M',
                existencia: 5,
                almacen: 'Almacén 2',
            },
        ];

        service.buscarExistencia('cable').subscribe((res) => {
            expect(res.length).toBe(1);
            expect(res[0].codigoProducto).toBe('C01');
            expect(res[0].existencia).toBe(15);
            expect(res[0].existenciasDesglosadas?.length).toBe(2);
        });

        const req = httpMock.expectOne(`${apiUrl}/materiales/existencia?busqueda=cable`);
        expect(req.request.method).toBe('GET');
        req.flush(rawExistencias);
    });

    it('importarPorFolio_manda_el_folio', () => {
        const mockMateriales: ContpaqiMaterialDto[] = [
            {
                materialServicio: 'Tornillo 1/4',
                descripcion: 'Tornillo hexagonal',
                unidad: 'PZA',
                cantidad: 100,
                costoUnitario: 1.5,
                iva: 24,
                total: 174,
            },
        ];

        service.importarPorFolio('FOL-001').subscribe((res) => {
            expect(res).toEqual(mockMateriales);
        });

        const req = httpMock.expectOne(`${apiUrl}/materiales/importar?folio=FOL-001`);
        expect(req.request.method).toBe('GET');
        req.flush(mockMateriales);
    });

    it('Un_error_http_llega_al_suscriptor', () => {
        let errorCapturado: any = null;

        service.guardarSgc({} as any).subscribe({
            next: () => fail('No debió resolverse con éxito'),
            error: (err) => {
                errorCapturado = err;
            },
        });

        const req = httpMock.expectOne(`${apiUrl}/sgc`);
        req.flush(
            { mensaje: 'Datos inválidos', errores: ['Falta cliente'] },
            { status: 400, statusText: 'Bad Request' }
        );

        expect(errorCapturado).toBeTruthy();
        expect(errorCapturado.status).toBe(400);
        expect(errorCapturado.error.mensaje).toBe('Datos inválidos');
    });

    it('requerimientosDisponibles_hace_GET_a_requerimientos-disponibles', () => {
        service.requerimientosDisponibles('REQ').subscribe();
        const req = httpMock.expectOne(`${apiUrl}/requerimientos-disponibles?q=REQ`);
        expect(req.request.method).toBe('GET');
        req.flush([]);
    });

    it('enviarRevision_hace_POST_a_sgc_enviar-revision', () => {
        service.enviarRevision(42).subscribe();
        const req = httpMock.expectOne(`${apiUrl}/42/sgc/enviar-revision`);
        expect(req.request.method).toBe('POST');
        req.flush({ etapa: 'EnRevision' });
    });

    it('volverBorrador_hace_POST_a_sgc_volver-borrador', () => {
        service.volverBorrador(42).subscribe();
        const req = httpMock.expectOne(`${apiUrl}/42/sgc/volver-borrador`);
        expect(req.request.method).toBe('POST');
        req.flush({ etapa: 'Borrador' });
    });

    it('registrarRevision_hace_POST_a_sgc_revisiones', () => {
        const dto = { rol: 'Comercial', resultado: 'Aprobada', checklist: { CorrespondeAlRequerimiento: true } };
        service.registrarRevision(42, dto as any).subscribe();
        const req = httpMock.expectOne(`${apiUrl}/42/sgc/revisiones`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(dto);
        req.flush({ rol: 'Comercial', resultado: 'Aprobada' });
    });

    it('emitir_hace_POST_a_sgc_emitir', () => {
        const dto = { medioEnvio: 'Correo', clienteReceptor: 'Juan', correoReceptor: 'j@test.com' };
        service.emitir(42, dto).subscribe();
        const req = httpMock.expectOne(`${apiUrl}/42/sgc/emitir`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(dto);
        req.flush({ folio: 'COT-01', version: 1, fechaEmision: new Date() });
    });

    it('nuevaVersion_hace_POST_a_sgc_nueva-version', () => {
        const dto = { claseCambio: 'Menor', cambioResumen: 'Ajuste de precios' };
        service.nuevaVersion(42, dto).subscribe();
        const req = httpMock.expectOne(`${apiUrl}/42/sgc/nueva-version`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(dto);
        req.flush({ version: 2, etapa: 'Borrador' });
    });

    it('revisiones_hace_GET_a_sgc_revisiones', () => {
        service.revisiones(42).subscribe();
        const req = httpMock.expectOne(`${apiUrl}/42/sgc/revisiones`);
        expect(req.request.method).toBe('GET');
        req.flush([]);
    });

    it('versiones_hace_GET_a_sgc_versiones', () => {
        service.versiones(42).subscribe();
        const req = httpMock.expectOne(`${apiUrl}/42/sgc/versiones`);
        expect(req.request.method).toBe('GET');
        req.flush([]);
    });

    it('version_hace_GET_a_sgc_versiones_numero', () => {
        service.version(42, 2).subscribe();
        const req = httpMock.expectOne(`${apiUrl}/42/sgc/versiones/2`);
        expect(req.request.method).toBe('GET');
        req.flush({ version: 2 });
    });
});
