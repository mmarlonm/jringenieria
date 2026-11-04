import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { environment } from 'environments/environment';
import { EnvioClientesDialogComponent, EnvioClientesDialogData } from './envio-clientes-dialog.component';
import { DestinatarioClienteDto } from './envio-clientes.types';

describe('EnvioClientesDialogComponent', () => {
    let component: EnvioClientesDialogComponent;
    let fixture: ComponentFixture<EnvioClientesDialogComponent>;
    let httpMock: HttpTestingController;
    let mockDialogRef: jasmine.SpyObj<MatDialogRef<EnvioClientesDialogComponent>>;

    const dialogData: EnvioClientesDialogData = {
        formularioId: 7,
        titulo: 'Encuesta de Calidad',
    };

    const mockDestinatarios: DestinatarioClienteDto[] = [
        {
            clienteId: 1,
            nombre: 'Cliente Valido 1',
            empresa: 'Empresa A',
            correo: 'c1@test.com',
            estadoCorreo: 'valido',
            correoRepetido: false,
            activo: true,
        },
        {
            clienteId: 2,
            nombre: 'Cliente Sin Correo',
            empresa: 'Empresa B',
            correo: null,
            estadoCorreo: 'sinCorreo',
            correoRepetido: false,
            activo: true,
        },
        {
            clienteId: 3,
            nombre: 'Cliente Invalido',
            empresa: 'Empresa C',
            correo: 'invalido-sin-arroba',
            estadoCorreo: 'invalido',
            correoRepetido: false,
            activo: true,
        },
        {
            clienteId: 4,
            nombre: 'Cliente Inactivo',
            empresa: 'Empresa D',
            correo: 'inactivo@test.com',
            estadoCorreo: 'valido',
            correoRepetido: false,
            activo: false,
        },
        {
            clienteId: 5,
            nombre: 'Cliente Repetido',
            empresa: null,
            correo: 'c1@test.com',
            estadoCorreo: 'valido',
            correoRepetido: true,
            activo: true,
        },
    ];

    beforeEach(async () => {
        mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
        mockDialogRef.disableClose = false;

        await TestBed.configureTestingModule({
            imports: [
                HttpClientTestingModule,
                NoopAnimationsModule,
                EnvioClientesDialogComponent,
            ],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: dialogData },
                { provide: MatDialogRef, useValue: mockDialogRef },
            ],
        }).compileComponents();

        httpMock = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(EnvioClientesDialogComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => {
        httpMock.verify();
    });

    function inicializarConDatos(datos: DestinatarioClienteDto[] = mockDestinatarios): void {
        fixture.detectChanges(); // Ejecuta ngOnInit y la llamada HTTP
        const req = httpMock.expectOne(`${environment.apiUrl}/EncuestaEnvio/destinatarios?estado=todos`);
        expect(req.request.method).toBe('GET');
        req.flush(datos);
        fixture.detectChanges();
    }

    it('muestra_el_indicador_correcto_por_fila', () => {
        inicializarConDatos();
        const filas = component.visiblesPaginados();

        const fValido = filas.find((f) => f.clienteId === 1);
        expect(fValido?.estadoCorreo).toBe('valido');
        expect(fValido?.correoRepetido).toBeFalse();

        const fSinCorreo = filas.find((f) => f.clienteId === 2);
        expect(fSinCorreo?.estadoCorreo).toBe('sinCorreo');

        const fInvalido = filas.find((f) => f.clienteId === 3);
        expect(fInvalido?.estadoCorreo).toBe('invalido');

        const fRepetido = filas.find((f) => f.clienteId === 5);
        expect(fRepetido?.correoRepetido).toBeTrue();
    });

    it('por_omision_muestra_activos_y_los_contadores_de_activos_e_inactivos_son_correctos', () => {
        inicializarConDatos();

        expect(component.estado()).toBe('activos');
        expect(component.contadores()).toEqual({ activos: 4, inactivos: 1 });
        expect(component.filtrados().every((c) => c.activo)).toBeTrue();
    });

    it('cambiar_a_inactivos_filtra_sin_volver_a_pedir_al_servidor', () => {
        inicializarConDatos();

        component.cambiarEstado('inactivos');
        fixture.detectChanges();

        // No debe haber otra llamada a HTTP
        expect(component.estado()).toBe('inactivos');
        expect(component.filtrados().length).toBe(1);
        expect(component.filtrados()[0].clienteId).toBe(4);
    });

    it('solo_las_filas_con_correo_valido_tienen_casilla_habilitada', () => {
        inicializarConDatos();

        expect(component.esFilaSeleccionable(mockDestinatarios[0])).toBeTrue();
        expect(component.esFilaSeleccionable(mockDestinatarios[1])).toBeFalse();
        expect(component.esFilaSeleccionable(mockDestinatarios[2])).toBeFalse();
        expect(component.esFilaSeleccionable(mockDestinatarios[4])).toBeTrue();
    });

    it('seleccionar_todos_marca_solo_los_visibles_con_correo', () => {
        inicializarConDatos();

        component.alternarTodosVisibles();
        fixture.detectChanges();

        const sel = component.seleccion();
        expect(sel.has(1)).toBeTrue();
        expect(sel.has(5)).toBeTrue();
        expect(sel.has(2)).toBeFalse(); // sin correo
        expect(sel.has(3)).toBeFalse(); // inválido
        expect(sel.has(4)).toBeFalse(); // inactivo (no visible)
    });

    it('la_seleccion_se_conserva_al_cambiar_de_filtro', () => {
        inicializarConDatos();

        // Seleccionamos cliente 1 en activos
        component.alternarSeleccion(1);
        expect(component.seleccion().has(1)).toBeTrue();

        // Cambiamos a inactivos
        component.cambiarEstado('inactivos');
        fixture.detectChanges();

        // Seleccionamos cliente 4 en inactivos
        component.alternarSeleccion(4);
        expect(component.seleccion().has(1)).toBeTrue();
        expect(component.seleccion().has(4)).toBeTrue();

        // Regresamos a activos
        component.cambiarEstado('activos');
        fixture.detectChanges();
        expect(component.seleccion().has(1)).toBeTrue();
        expect(component.seleccion().has(4)).toBeTrue();
    });

    it('confirmar_muestra_cuantos_clientes_y_cuantos_correos_unicos', () => {
        inicializarConDatos();

        component.alternarSeleccion(1);
        component.alternarSeleccion(5); // mismo correo que cliente 1
        fixture.detectChanges();

        const texto = component.confirmar();
        expect(texto).toContain('2 clientes');
        expect(texto).toContain('1 correos únicos');
        expect(texto).toContain('Encuesta de Calidad');
    });

    it('envia_en_lotes_de_10_en_secuencia_y_suma_los_resultados', () => {
        // Creamos 25 clientes válidos
        const muchosClientes: DestinatarioClienteDto[] = [];
        for (let i = 1; i <= 25; i++) {
            muchosClientes.push({
                clienteId: i,
                nombre: `Cliente ${i}`,
                empresa: null,
                correo: `c${i}@test.com`,
                estadoCorreo: 'valido',
                correoRepetido: false,
                activo: true,
            });
        }
        inicializarConDatos(muchosClientes);

        for (let i = 1; i <= 25; i++) {
            component.alternarSeleccion(i);
        }

        component.enviar();
        expect(component.enviando()).toBeTrue();

        // Primer lote de 10
        const req1 = httpMock.expectOne(`${environment.apiUrl}/EncuestaEnvio/formularios/7/enviar`);
        expect(req1.request.body.clienteIds.length).toBe(10);
        req1.flush({
            totalProcesados: 10,
            enviados: 10,
            omitidos: 0,
            fallidos: 0,
            detalle: Array.from({ length: 10 }, (_, k) => ({
                clienteId: k + 1,
                nombre: `Cliente ${k + 1}`,
                resultado: 'enviado',
                motivo: null,
            })),
        });

        // Segundo lote de 10
        const req2 = httpMock.expectOne(`${environment.apiUrl}/EncuestaEnvio/formularios/7/enviar`);
        expect(req2.request.body.clienteIds.length).toBe(10);
        req2.flush({
            totalProcesados: 10,
            enviados: 10,
            omitidos: 0,
            fallidos: 0,
            detalle: Array.from({ length: 10 }, (_, k) => ({
                clienteId: k + 11,
                nombre: `Cliente ${k + 11}`,
                resultado: 'enviado',
                motivo: null,
            })),
        });

        // Tercer lote de 5
        const req3 = httpMock.expectOne(`${environment.apiUrl}/EncuestaEnvio/formularios/7/enviar`);
        expect(req3.request.body.clienteIds.length).toBe(5);
        req3.flush({
            totalProcesados: 5,
            enviados: 5,
            omitidos: 0,
            fallidos: 0,
            detalle: Array.from({ length: 5 }, (_, k) => ({
                clienteId: k + 21,
                nombre: `Cliente ${k + 21}`,
                resultado: 'enviado',
                motivo: null,
            })),
        });

        expect(component.enviando()).toBeFalse();
        expect(component.resultado()?.totalProcesados).toBe(25);
        expect(component.resultado()?.enviados).toBe(25);
        expect(component.resultado()?.fallidos).toBe(0);
    });

    it('un_lote_que_falla_no_detiene_a_los_siguientes', () => {
        const clientes: DestinatarioClienteDto[] = [];
        for (let i = 1; i <= 20; i++) {
            clientes.push({
                clienteId: i,
                nombre: `Cliente ${i}`,
                empresa: null,
                correo: `c${i}@test.com`,
                estadoCorreo: 'valido',
                correoRepetido: false,
                activo: true,
            });
        }
        inicializarConDatos(clientes);
        for (let i = 1; i <= 20; i++) {
            component.alternarSeleccion(i);
        }

        component.enviar();

        // Lote 1 falla por error 500
        const req1 = httpMock.expectOne(`${environment.apiUrl}/EncuestaEnvio/formularios/7/enviar`);
        req1.flush({ mensaje: 'Error interno en lote 1' }, { status: 500, statusText: 'Error' });

        // Lote 2 debe ejecutarse normalmente
        const req2 = httpMock.expectOne(`${environment.apiUrl}/EncuestaEnvio/formularios/7/enviar`);
        req2.flush({
            totalProcesados: 10,
            enviados: 10,
            omitidos: 0,
            fallidos: 0,
            detalle: Array.from({ length: 10 }, (_, k) => ({
                clienteId: k + 11,
                nombre: `Cliente ${k + 11}`,
                resultado: 'enviado',
                motivo: null,
            })),
        });

        expect(component.enviando()).toBeFalse();
        expect(component.resultado()?.fallidos).toBe(10);
        expect(component.resultado()?.enviados).toBe(10);
    });

    it('un_doble_clic_en_enviar_no_manda_dos_veces', () => {
        inicializarConDatos();
        component.alternarSeleccion(1);

        component.enviar();
        component.enviar(); // segundo intento mientras enviando === true

        const peticiones = httpMock.match(`${environment.apiUrl}/EncuestaEnvio/formularios/7/enviar`);
        expect(peticiones.length).toBe(1);
        peticiones[0].flush({
            totalProcesados: 1,
            enviados: 1,
            omitidos: 0,
            fallidos: 0,
            detalle: [],
        });
    });

    it('el_error_de_carga_se_ve_dentro_del_dialogo', () => {
        fixture.detectChanges();
        const req = httpMock.expectOne(`${environment.apiUrl}/EncuestaEnvio/destinatarios?estado=todos`);
        req.flush({ mensaje: 'No fue posible cargar destinatarios' }, { status: 500, statusText: 'Error' });
        fixture.detectChanges();

        expect(component.cargando()).toBeFalse();
        expect(component.error()).toBe('No fue posible cargar destinatarios');
    });

    it('no_se_puede_cerrar_mientras_envia', () => {
        inicializarConDatos();
        component.alternarSeleccion(1);

        component.enviar();
        expect(component.enviando()).toBeTrue();
        expect(component.dialogRef.disableClose).toBeTrue();

        component.cerrar();
        expect(mockDialogRef.close).not.toHaveBeenCalled();

        const req = httpMock.expectOne(`${environment.apiUrl}/EncuestaEnvio/formularios/7/enviar`);
        req.flush({ totalProcesados: 1, enviados: 1, omitidos: 0, fallidos: 0, detalle: [] });

        expect(component.dialogRef.disableClose).toBeFalse();
    });

    it('la_pestana_otros_correos_cuenta_validos_repetidos_e_invalidos_en_vivo', () => {
        inicializarConDatos();

        component.correosLibresTexto.set('valido@test.com, repetido@test.com; REPETIDO@TEST.COM\nsin-arroba');
        fixture.detectChanges();

        const analisis = component.analisisLibres();
        expect(analisis.validos).toEqual(['valido@test.com', 'repetido@test.com']);
        expect(analisis.repetidos).toBe(1);
        expect(analisis.invalidos).toEqual(['sin-arroba']);
    });

    it('los_invalidos_se_muestran_y_no_bloquean_el_envio_de_los_validos', () => {
        inicializarConDatos();
        component.correosLibresTexto.set('bueno@test.com, invalido');
        fixture.detectChanges();

        expect(component.resumen().destinatariosUnicos).toBe(1);
        component.enviar();

        const req = httpMock.expectOne(`${environment.apiUrl}/EncuestaEnvio/formularios/7/enviar`);
        expect(req.request.body.correosLibres).toEqual(['bueno@test.com']);
        req.flush({ totalProcesados: 1, enviados: 1, omitidos: 0, fallidos: 0, detalle: [] });
    });

    it('el_pie_suma_clientes_y_correos_escritos_sin_contar_repetidos', () => {
        inicializarConDatos();

        component.alternarSeleccion(1); // c1@test.com
        component.correosLibresTexto.set('c1@test.com, nuevo@test.com');
        fixture.detectChanges();

        const res = component.resumen();
        expect(res.clientes).toBe(1);
        expect(res.correosLibres).toBe(2);
        expect(res.destinatariosUnicos).toBe(2); // c1@test.com y nuevo@test.com
    });

    it('con_solo_correos_escritos_se_puede_enviar_sin_clientes', () => {
        inicializarConDatos();
        component.correosLibresTexto.set('externo@test.com');
        fixture.detectChanges();

        expect(component.resumen().clientes).toBe(0);
        expect(component.resumen().destinatariosUnicos).toBe(1);

        component.enviar();
        const req = httpMock.expectOne(`${environment.apiUrl}/EncuestaEnvio/formularios/7/enviar`);
        expect(req.request.body.clienteIds).toEqual([]);
        expect(req.request.body.correosLibres).toEqual(['externo@test.com']);
        req.flush({ totalProcesados: 1, enviados: 1, omitidos: 0, fallidos: 0, detalle: [] });
    });

    it('envia_clientes_y_libres_en_lotes_de_10_uno_tras_otro_y_suma_el_resultado', () => {
        const clientes: DestinatarioClienteDto[] = [];
        for (let i = 1; i <= 8; i++) {
            clientes.push({
                clienteId: i,
                nombre: `Cliente ${i}`,
                empresa: null,
                correo: `c${i}@test.com`,
                estadoCorreo: 'valido',
                correoRepetido: false,
                activo: true,
            });
        }
        inicializarConDatos(clientes);
        for (let i = 1; i <= 8; i++) {
            component.alternarSeleccion(i);
        }

        // 8 clientes + 6 libres = 14 destinatarios -> 2 lotes (10 y 4)
        component.correosLibresTexto.set(
            'l1@test.com, l2@test.com, l3@test.com, l4@test.com, l5@test.com, l6@test.com'
        );
        fixture.detectChanges();

        component.enviar();

        // Lote 1: 8 clientes + 2 libres = 10
        const req1 = httpMock.expectOne(`${environment.apiUrl}/EncuestaEnvio/formularios/7/enviar`);
        expect(req1.request.body.clienteIds.length).toBe(8);
        expect(req1.request.body.correosLibres.length).toBe(2);
        req1.flush({
            totalProcesados: 10,
            enviados: 10,
            omitidos: 0,
            fallidos: 0,
            detalle: [],
        });

        // Lote 2: 0 clientes + 4 libres = 4
        const req2 = httpMock.expectOne(`${environment.apiUrl}/EncuestaEnvio/formularios/7/enviar`);
        expect(req2.request.body.clienteIds.length).toBe(0);
        expect(req2.request.body.correosLibres.length).toBe(4);
        req2.flush({
            totalProcesados: 4,
            enviados: 4,
            omitidos: 0,
            fallidos: 0,
            detalle: [],
        });

        expect(component.resultado()?.enviados).toBe(14);
    });

    it('un_lote_que_falla_no_detiene_los_siguientes_y_marca_fallidos_a_sus_clientes_y_correos', () => {
        inicializarConDatos();
        // Seleccionamos 1 cliente y 1 correo libre
        component.alternarSeleccion(1);
        component.correosLibresTexto.set('externo@test.com');
        fixture.detectChanges();

        component.enviar();
        const req = httpMock.expectOne(`${environment.apiUrl}/EncuestaEnvio/formularios/7/enviar`);
        req.flush({ mensaje: 'Error al enviar' }, { status: 500, statusText: 'Error' });

        expect(component.resultado()?.fallidos).toBe(2);
        const detalle = component.resultado()?.detalle || [];
        expect(detalle.some((d) => d.clienteId === 1 && d.resultado === 'fallido')).toBeTrue();
        expect(detalle.some((d) => d.clienteId === null && d.nombre === 'externo@test.com' && d.resultado === 'fallido')).toBeTrue();
    });

    it('dos_clientes_con_el_mismo_correo_en_lotes_distintos_reciben_un_solo_envio', () => {
        const clientes: DestinatarioClienteDto[] = [
            { clienteId: 1, nombre: 'C1', empresa: null, correo: 'repetido@test.com', estadoCorreo: 'valido', correoRepetido: true, activo: true },
        ];
        for (let i = 2; i <= 10; i++) {
            clientes.push({
                clienteId: i,
                nombre: `C${i}`,
                empresa: null,
                correo: `c${i}@test.com`,
                estadoCorreo: 'valido',
                correoRepetido: false,
                activo: true,
            });
        }
        clientes.push({
            clienteId: 11,
            nombre: 'C11',
            empresa: null,
            correo: 'repetido@test.com',
            estadoCorreo: 'valido',
            correoRepetido: true,
            activo: true,
        });
        inicializarConDatos(clientes);
        for (const c of clientes) {
            component.alternarSeleccion(c.clienteId);
        }

        component.enviar();

        // Solo se debe enviar 1 lote de 10
        const req = httpMock.expectOne(`${environment.apiUrl}/EncuestaEnvio/formularios/7/enviar`);
        expect(req.request.body.clienteIds.length).toBe(10);
        expect(req.request.body.clienteIds).not.toContain(11);
        req.flush({
            totalProcesados: 10,
            enviados: 10,
            omitidos: 0,
            fallidos: 0,
            detalle: [],
        });

        // En el resultado final, el cliente 11 figura en omitidos
        expect(component.resultado()?.omitidos).toBe(1);
        expect(component.resultado()?.detalle.some((d) => d.clienteId === 11 && d.resultado === 'omitido')).toBeTrue();
    });

    it('el_resultado_muestra_la_direccion_en_las_filas_sin_clienteId', () => {
        inicializarConDatos();
        component.correosLibresTexto.set('solo-libre@empresa.com');
        fixture.detectChanges();

        component.enviar();
        const req = httpMock.expectOne(`${environment.apiUrl}/EncuestaEnvio/formularios/7/enviar`);
        req.flush({
            totalProcesados: 1,
            enviados: 1,
            omitidos: 0,
            fallidos: 0,
            detalle: [
                {
                    clienteId: null,
                    nombre: 'solo-libre@empresa.com',
                    resultado: 'enviado',
                    motivo: null,
                },
            ],
        });

        const filaSinCliente = component.resultado()?.detalle.find((d) => d.clienteId === null);
        expect(filaSinCliente?.nombre).toBe('solo-libre@empresa.com');
    });

    it('no_se_pasa_de_200_correos_escritos', () => {
        inicializarConDatos();

        // 205 correos
        const correos = Array.from({ length: 205 }, (_, i) => `correo${i}@test.com`).join(', ');
        component.correosLibresTexto.set(correos);
        fixture.detectChanges();

        expect(component.maximoCorreosSuperado()).toBeTrue();
    });
});

