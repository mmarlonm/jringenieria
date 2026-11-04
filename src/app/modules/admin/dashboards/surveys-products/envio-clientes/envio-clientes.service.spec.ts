import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from 'environments/environment';
import { EnvioClientesService } from './envio-clientes.service';
import { DestinatarioClienteDto, EnvioEncuestaResultadoDto } from './envio-clientes.types';

describe('EnvioClientesService', () => {
    let service: EnvioClientesService;
    let httpMock: HttpTestingController;
    const baseUrl = `${environment.apiUrl}/EncuestaEnvio`;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [EnvioClientesService],
        });
        service = TestBed.inject(EnvioClientesService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('debe crearse el servicio', () => {
        expect(service).toBeTruthy();
    });

    it('obtenerDestinatarios solicita destinatarios con el parametro estado correcto', () => {
        const mockDestinatarios: DestinatarioClienteDto[] = [
            {
                clienteId: 1,
                nombre: 'Cliente A',
                empresa: 'Empresa X',
                correo: 'a@b.com',
                estadoCorreo: 'valido',
                correoRepetido: false,
                activo: true,
            },
        ];

        service.obtenerDestinatarios('activos').subscribe((res) => {
            expect(res).toEqual(mockDestinatarios);
        });

        const req = httpMock.expectOne((r) => r.url === `${baseUrl}/destinatarios`);
        expect(req.request.method).toBe('GET');
        expect(req.request.params.get('estado')).toBe('activos');
        req.flush(mockDestinatarios);
    });

    it('obtenerDestinatarios permite consultar inactivos y todos', () => {
        service.obtenerDestinatarios('todos').subscribe();
        const req = httpMock.expectOne((r) => r.url === `${baseUrl}/destinatarios`);
        expect(req.request.params.get('estado')).toBe('todos');
        req.flush([]);
    });

    it('enviar hace POST al endpoint de formulario con clienteIds y correosLibres', () => {
        const mockResultado: EnvioEncuestaResultadoDto = {
            totalProcesados: 3,
            enviados: 3,
            omitidos: 0,
            fallidos: 0,
            detalle: [
                { clienteId: 1, nombre: 'Cliente 1', resultado: 'enviado', motivo: null },
                { clienteId: 2, nombre: 'Cliente 2', resultado: 'enviado', motivo: null },
                { clienteId: null, nombre: 'externo@empresa.com', resultado: 'enviado', motivo: null },
            ],
        };

        service.enviar(7, [1, 2], ['externo@empresa.com']).subscribe((res) => {
            expect(res).toEqual(mockResultado);
        });

        const req = httpMock.expectOne(`${baseUrl}/formularios/7/enviar`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({
            clienteIds: [1, 2],
            correosLibres: ['externo@empresa.com'],
        });
        req.flush(mockResultado);
    });

    it('enviar con solo correos libres manda clienteIds vacio', () => {
        service.enviar(7, [], ['solo@libre.com']).subscribe();

        const req = httpMock.expectOne(`${baseUrl}/formularios/7/enviar`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({
            clienteIds: [],
            correosLibres: ['solo@libre.com'],
        });
        req.flush({ totalProcesados: 1, enviados: 1, omitidos: 0, fallidos: 0, detalle: [] });
    });

    it('enviar con solo clientes omite correosLibres o lo manda como arreglo vacio', () => {
        service.enviar(7, [5]).subscribe();

        const req = httpMock.expectOne(`${baseUrl}/formularios/7/enviar`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({
            clienteIds: [5],
            correosLibres: [],
        });
        req.flush({ totalProcesados: 1, enviados: 1, omitidos: 0, fallidos: 0, detalle: [] });
    });
});

