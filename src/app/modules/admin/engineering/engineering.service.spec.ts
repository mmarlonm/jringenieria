import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from 'environments/environment';
import { EngineeringService, MATERIAL_ESTATUS } from './engineering.service';

describe('EngineeringService - Material y trazabilidad (contrato v1.1)', () => {
    let service: EngineeringService;
    let httpMock: HttpTestingController;
    const api = `${environment.apiUrl}/SeguimientoEjecucion`;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [EngineeringService]
        });
        service = TestBed.inject(EngineeringService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('MATERIAL_ESTATUS_conserva_el_orden_las_etiquetas_y_solo_EnProceso_cuenta_como_por_comprar', () => {
        expect(MATERIAL_ESTATUS.map(e => e.codigo)).toEqual(['EnProceso', 'Listo', 'PendienteRecoleccion', 'Anulado', 'Recolectado']);
        expect(MATERIAL_ESTATUS.map(e => e.etiqueta)).toEqual(['En proceso', 'Listo', 'Pendiente de recolección', 'Anulado', 'Recolectado']);
        expect(MATERIAL_ESTATUS.filter(e => e.cuentaComoPorComprar).map(e => e.codigo)).toEqual(['EnProceso']);
    });

    it('asignarResponsableCompra_hace_PUT_con_usuarioId', () => {
        service.asignarResponsableCompra(4, 12).subscribe(r => {
            expect(r.responsableCompra?.nombre).toBe('Usuario Ficticio');
        });

        const req = httpMock.expectOne(`${api}/4/responsable-compra`);
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual({ usuarioId: 12 });
        req.flush({ idSeguimiento: 4, responsableCompra: { usuarioId: 12, nombre: 'Usuario Ficticio' } });
    });

    it('asignarResponsableCompra_con_null_manda_usuarioId_null_para_quitarlo', () => {
        service.asignarResponsableCompra(4, null).subscribe(r => expect(r.responsableCompra).toBeNull());

        const req = httpMock.expectOne(`${api}/4/responsable-compra`);
        expect(req.request.body).toEqual({ usuarioId: null });
        req.flush({ idSeguimiento: 4, responsableCompra: null });
    });

    it('cambiarEstatusMaterial_hace_PUT_con_estatus_y_comentario', () => {
        service.cambiarEstatusMaterial(901, 'Listo', 'Ya llegó').subscribe();

        const req = httpMock.expectOne(`${api}/materiales/901/estatus`);
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual({ estatus: 'Listo', comentario: 'Ya llegó' });
        req.flush({ idMaterial: 901, estatus: 'Listo' });
    });

    it('cambiarEstatusMaterial_sin_comentario_manda_comentario_null', () => {
        service.cambiarEstatusMaterial(901, 'Anulado').subscribe();

        const req = httpMock.expectOne(`${api}/materiales/901/estatus`);
        expect(req.request.body).toEqual({ estatus: 'Anulado', comentario: null });
        req.flush({ idMaterial: 901, estatus: 'Anulado' });
    });

    it('cambiarEstatusMasivo_hace_PUT_con_los_ids_y_devuelve_la_respuesta_ligera', () => {
        service.cambiarEstatusMasivo(4, [901, 902], 'Recolectado').subscribe(r => {
            expect(r.conteoPorEstatus.recolectado).toBe(2);
            expect(r.materiales.map(m => m.idMaterial)).toEqual([901, 902]);
        });

        const req = httpMock.expectOne(`${api}/4/materiales/estatus-masivo`);
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual({ idsMaterial: [901, 902], estatus: 'Recolectado', comentario: null });
        req.flush({
            idSeguimiento: 4,
            conteoPorEstatus: { total: 2, enProceso: 0, listo: 0, pendienteRecoleccion: 0, anulado: 0, recolectado: 2 },
            materiales: [
                { idMaterial: 901, estatus: 'Recolectado', fechaEstatus: '2026-11-23T10:15:00' },
                { idMaterial: 902, estatus: 'Recolectado', fechaEstatus: '2026-11-23T10:15:00' }
            ]
        });
    });

    it('getHistorialEstatusMaterial_hace_GET', () => {
        service.getHistorialEstatusMaterial(901).subscribe(h => {
            expect(h.length).toBe(1);
            expect(h[0].estatusNuevo).toBe('Listo');
        });

        const req = httpMock.expectOne(`${api}/materiales/901/estatus-historial`);
        expect(req.request.method).toBe('GET');
        req.flush([{ estatusAnterior: 'EnProceso', estatusNuevo: 'Listo', comentario: null, usuarioNombre: 'Usuario Ficticio', fecha: '2026-11-23T10:15:00' }]);
    });

    it('previsualizarExcelMateriales_hace_GET_con_nombreArchivo_como_parametro_codificado', () => {
        service.previsualizarExcelMateriales(4, 'Mi lista & más.xlsx').subscribe();

        const req = httpMock.expectOne(r => r.url === `${api}/4/materiales/excel/previsualizar`);
        expect(req.request.method).toBe('GET');
        expect(req.request.params.get('nombreArchivo')).toBe('Mi lista & más.xlsx');
        req.flush({ nombreArchivo: 'Mi lista & más.xlsx', hoja: 'materiales', filaEncabezado: 9, filas: [], resumen: {}, advertencias: [] });
    });

    it('importarExcelMateriales_hace_POST_con_nombreArchivo', () => {
        service.importarExcelMateriales(4, 'Materiales.xlsx').subscribe(r => {
            expect(r.importacion.agregados).toBe(30);
        });

        const req = httpMock.expectOne(`${api}/4/materiales/excel/importar`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ nombreArchivo: 'Materiales.xlsx' });
        req.flush({
            importacion: { agregados: 30, actualizados: 5, sinCambio: 0, noEncontradosEnArchivo: 2, omitidas: 1 },
        });
    });

    it('getProveedoresMateriales_hace_GET_con_q_y_limite_y_no_toca_ProveedorMaestro', () => {
        service.getProveedoresMateriales('ficticio', 20).subscribe(p => expect(p[0].idProveedor).toBe(31));

        const req = httpMock.expectOne(r => r.url === `${api}/materiales/proveedores`);
        expect(req.request.method).toBe('GET');
        expect(req.request.params.get('q')).toBe('ficticio');
        expect(req.request.params.get('limite')).toBe('20');
        expect(req.request.url).not.toContain('ProveedorMaestro');
        req.flush([{ idProveedor: 31, razonSocial: 'Proveedor Ficticio SA de CV', nombreComercial: 'Proveedor Ficticio', rfc: 'XAXX010101000' }]);
    });

    it('getProveedoresMateriales_sin_argumentos_omite_q_y_limite', () => {
        service.getProveedoresMateriales().subscribe();

        const req = httpMock.expectOne(r => r.url === `${api}/materiales/proveedores`);
        expect(req.request.params.has('q')).toBeFalse();
        expect(req.request.params.has('limite')).toBeFalse();
        req.flush([]);
    });

    it('guardarCompraMaterial_hace_PUT_con_los_dos_valores', () => {
        service.guardarCompraMaterial(901, { proveedorId: 31, notas: 'Entrega en obra' }).subscribe(m => {
            expect(m.proveedorNombre).toBe('Proveedor Ficticio');
        });

        const req = httpMock.expectOne(`${api}/materiales/901/compra`);
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual({ proveedorId: 31, notas: 'Entrega en obra' });
        req.flush({ idMaterial: 901, proveedorId: 31, proveedorNombre: 'Proveedor Ficticio', notas: 'Entrega en obra', estatus: 'EnProceso' });
    });

    it('guardarCompraMaterial_para_quitar_manda_proveedorId_null_y_notas_null', () => {
        service.guardarCompraMaterial(901, { proveedorId: null, notas: null }).subscribe();

        const req = httpMock.expectOne(`${api}/materiales/901/compra`);
        expect(req.request.body).toEqual({ proveedorId: null, notas: null });
        req.flush({ idMaterial: 901, proveedorId: null, proveedorNombre: null, notas: null, estatus: 'EnProceso' });
    });

    it('observacionesMaterial_hace_GET_al_endpoint_del_material', () => {
        service.observacionesMaterial(901).subscribe(res => {
            expect(res.length).toBe(1);
            expect(res[0].texto).toBe('Nota 1');
        });

        const req = httpMock.expectOne(`${api}/materiales/901/observaciones`);
        expect(req.request.method).toBe('GET');
        req.flush([{ idObservacion: 1, texto: 'Nota 1', usuarioNombre: 'Admin', fecha: '2026-11-26T15:30:00Z' }]);
    });

    it('agregarObservacionMaterial_hace_POST_con_texto', () => {
        service.agregarObservacionMaterial(901, 'Nueva nota').subscribe(res => {
            expect(res.idObservacion).toBe(2);
        });

        const req = httpMock.expectOne(`${api}/materiales/901/observaciones`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ texto: 'Nueva nota' });
        req.flush({ idObservacion: 2, texto: 'Nueva nota', usuarioNombre: 'Admin', fecha: '2026-11-26T16:00:00Z' });
    });
});
