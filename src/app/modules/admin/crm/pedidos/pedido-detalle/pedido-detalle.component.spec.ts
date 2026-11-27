import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { PedidoDetalleComponent } from './pedido-detalle.component';
import { PedidosService } from '../pedidos.service';
import { PedidoDetalle } from '../pedidos.types';

describe('PedidoDetalleComponent (F3)', () => {
    let component: PedidoDetalleComponent;
    let fixture: ComponentFixture<PedidoDetalleComponent>;
    let pedidosServiceSpy: jasmine.SpyObj<PedidosService>;
    let router: Router;

    const mockPedido: PedidoDetalle = {
        id: 10,
        folio: 'PED-2026-0010',
        estatus: 'Recibido',
        tipo: 'CT',
        tipoServicio: 'Proyecto',
        prioridad: 'Media',
        clienteNombre: 'Industrias Alfa',
        unidadId: 1,
        sucursalNombre: 'Matriz Querétaro',
        moneda: 'MXN',
        montoPedido: 350000,
        responsableUsuarioId: 5,
        responsableNombre: 'Carlos Vendedor',
        cotizacionProductosId: 105,
        cotizacionFolio: 'COT-2026-0105',
        cotizacionVersion: 1,
        tipoCambio: 1,
        subtotal: 301724.14,
        iva: 48275.86,
        total: 350000,
        requerimientoId: 22,
        requerimientoFolio: 'REQ-2026-0022',
        creadoPorUsuarioId: 5,
        numeroOC: 'OC-9988',
        fechaOC: '2026-11-20',
        condicionesPago: '50% anticipo, 50% contra entrega',
        requiereAnticipo: true,
        anticipoMonto: 175000,
        tieneContrato: false,
        observaciones: 'Entregar en planta 2',
        fechaRegistro: '2026-11-27T09:00:00Z',
        alertas: ['Sin respaldo documental'],
        partidas: [
            {
                id: 1,
                partida: 1,
                codigo: 'TAB-01',
                descripcion: 'Tablero de distribución',
                unidad: 'PZA',
                cantidad: 1,
                precioUnitario: 350000,
                descuento: 0,
                importe: 350000
            }
        ],
        verificacion: [
            { punto: 'DatosCliente', nombre: 'Datos del cliente', cumple: true },
            { punto: 'DatosFiscales', nombre: 'Datos fiscales', cumple: true },
            { punto: 'NumeroOC', nombre: 'Número de OC', cumple: true },
            { punto: 'Fecha', nombre: 'Fecha de la OC', cumple: true },
            { punto: 'ReferenciaCotizacion', nombre: 'Referencia de la cotización', cumple: true },
            { punto: 'ProductosServicios', nombre: 'Productos / Servicios solicitados', cumple: true },
            { punto: 'Cantidades', nombre: 'Cantidades solicitadas', cumple: true },
            { punto: 'CondicionesEconomicas', nombre: 'Condiciones económicas', cumple: true },
            { punto: 'MetodoPago', nombre: 'Método de pago', cumple: true },
            { punto: 'CondicionesPago', nombre: 'Condiciones de pago', cumple: true },
            { punto: 'LugarEntrega', nombre: 'Lugar de entrega', cumple: true },
            { punto: 'TiemposRequeridos', nombre: 'Tiempos requeridos', cumple: true },
            { punto: 'Impuestos', nombre: 'Impuestos aplicables', cumple: true }
        ],
        validaciones: [
            { area: 'Sucursal', nombre: 'Sucursal', estatus: 'Pendiente' },
            { area: 'Ingenieria', nombre: 'Ingeniería', estatus: 'Pendiente' },
            { area: 'Administracion', nombre: 'Administración', estatus: 'Pendiente' }
        ],
        archivos: [],
        facturacion: {
            programado: 0,
            facturado: 0,
            cobrado: 0,
            pendientePorProgramar: 350000,
            filas: []
        },
        modificaciones: [],
        cotizacionArchivos: [],
        permisos: {
            puedeEditar: true,
            puedeVerificar: true,
            puedeValidar: ['Sucursal'],
            puedeLiberar: false,
            puedeFacturar: false,
            puedeCerrar: false,
            puedeCancelar: true
        }
    };

    beforeEach(async () => {
        pedidosServiceSpy = jasmine.createSpyObj('PedidosService', [
            'obtenerCatalogos',
            'obtenerPorId',
            'actualizar',
            'actualizarVerificacion',
            'enviarValidacion',
            'validarArea',
            'subirArchivo',
            'descargarArchivo',
            'descargarCotizacionArchivo',
            'eliminarArchivo',
            'liberar'
        ]);

        pedidosServiceSpy.obtenerCatalogos.and.returnValue(
            of({
                estatus: [],
                tipos: [],
                tiposServicio: [],
                prioridades: [],
                tiposArchivo: [],
                areasValidacion: [],
                puntosVerificacion: [],
                estatusFacturacion: [],
                tiposBitacora: []
            })
        );
        pedidosServiceSpy.obtenerPorId.and.callFake(() => of(JSON.parse(JSON.stringify(mockPedido))));

        await TestBed.configureTestingModule({
            imports: [PedidoDetalleComponent, NoopAnimationsModule, RouterTestingModule],
            providers: [
                { provide: PedidosService, useValue: pedidosServiceSpy },
                {
                    provide: ActivatedRoute,
                    useValue: { params: of({ id: '10' }) }
                }
            ]
        }).compileComponents();

        router = TestBed.inject(Router);
        spyOn(router, 'navigate');

        fixture = TestBed.createComponent(PedidoDetalleComponent);
        component = fixture.componentInstance;
    });

    it('Cabecera_con_la_cadena_de_origen_y_enlaces', fakeAsync(() => {
        component.ngOnInit();
        tick();
        fixture.detectChanges();
        flush();

        const el = fixture.nativeElement as HTMLElement;
        const folio = el.querySelector('[data-testid="cabecera-folio"]');
        expect(folio?.textContent).toContain('PED-2026-0010');

        const cadena = el.querySelector('[data-testid="cadena-origen"]');
        expect(cadena).not.toBeNull();

        const linkLead = el.querySelector('[data-testid="link-lead"]');
        expect(linkLead).not.toBeNull();

        const linkReq = el.querySelector('[data-testid="link-req"]');
        expect(linkReq?.textContent).toContain('REQ-2026-0022');

        const linkCot = el.querySelector('[data-testid="link-cot"]');
        expect(linkCot?.textContent).toContain('COT-2026-0105');

        const linkPed = el.querySelector('[data-testid="link-ped"]');
        expect(linkPed?.textContent).toContain('PED-2026-0010');
    }));

    it('Campos_editables_solo_con_puedeEditar', fakeAsync(() => {
        // Caso 1: puedeEditar = true
        component.ngOnInit();
        tick();
        fixture.detectChanges();
        flush();

        expect(component.resumenForm.enabled).toBeTrue();
        const btnGuardar = fixture.nativeElement.querySelector('[data-testid="btn-guardar-resumen"]');
        expect(btnGuardar).not.toBeNull();

        // Caso 2: puedeEditar = false
        pedidosServiceSpy.obtenerPorId.and.returnValue(
            of({
                ...mockPedido,
                permisos: { ...mockPedido.permisos, puedeEditar: false }
            })
        );
        component.ngOnInit();
        tick();
        fixture.detectChanges();
        flush();

        expect(component.resumenForm.disabled).toBeTrue();
        const btnGuardar2 = fixture.nativeElement.querySelector('[data-testid="btn-guardar-resumen"]');
        expect(btnGuardar2).toBeNull();
    }));

    it('Verificacion_guarda_y_exige_comentario_en_discrepancia', fakeAsync(() => {
        component.ngOnInit();
        tick();
        flush();

        // Poner un punto en false sin aclaración ni comentario
        component.verificacionItems[0].cumple = false;
        component.verificacionItems[0].discrepanciaAclarada = false;
        component.verificacionItems[0].comentario = '';

        spyOn(Swal, 'fire');
        component.guardarVerificacion();
        tick();
        flush();

        expect(Swal.fire).toHaveBeenCalledWith(
            jasmine.objectContaining({
                icon: 'warning',
                title: 'Discrepancia sin aclarar'
            })
        );
        expect(pedidosServiceSpy.actualizarVerificacion).not.toHaveBeenCalled();

        // Ahora aclarar discrepancia pero con comentario corto (< 10)
        component.verificacionItems[0].discrepanciaAclarada = true;
        component.verificacionItems[0].comentario = 'muy corto';
        component.guardarVerificacion();
        tick();
        flush();

        expect(Swal.fire).toHaveBeenCalledWith(
            jasmine.objectContaining({
                icon: 'warning',
                title: 'Comentario requerido'
            })
        );
        expect(pedidosServiceSpy.actualizarVerificacion).not.toHaveBeenCalled();

        // Ahora con comentario válido (>= 10)
        component.verificacionItems[0].comentario = 'Aclarado con el cliente mediante correo de fecha 2026-11-27';
        pedidosServiceSpy.actualizarVerificacion.and.returnValue(of(component.verificacionItems));
        component.guardarVerificacion();
        tick();
        flush();

        expect(pedidosServiceSpy.actualizarVerificacion).toHaveBeenCalledWith(10, component.verificacionItems);
        expect(component.guardandoVerificacion).toBeFalse();
    }));

    it('Enviar_a_validacion_muestra_los_faltantes_del_API', fakeAsync(() => {
        component.ngOnInit();
        tick();
        component.selectedTabIndex = 1; // Tab Verificación
        fixture.detectChanges();
        flush();

        pedidosServiceSpy.enviarValidacion.and.returnValue(
            throwError(() => ({
                status: 409,
                error: {
                    mensaje: 'No se puede enviar a validación.',
                    faltantes: ['El punto «MetodoPago» no está marcado como cumple.']
                }
            }))
        );

        component.enviarAValidacion();
        tick();
        fixture.detectChanges();
        flush();

        expect(component.enviandoValidacion).toBeFalse();
        expect(component.faltantesValidacion.length).toBe(1);
        expect(component.faltantesValidacion[0]).toContain('MetodoPago');

        const el = fixture.nativeElement as HTMLElement;
        const alertaFaltantes = el.querySelector('[data-testid="alerta-faltantes-validacion"]');
        expect(alertaFaltantes).not.toBeNull();
        expect(alertaFaltantes?.textContent).toContain('MetodoPago');
    }));

    it('Validacion_pinta_botones_solo_de_las_areas_permitidas', fakeAsync(() => {
        // En mockPedido, estatus es Recibido, cambiémoslo a EnValidacion para que aparezcan botones de validación
        pedidosServiceSpy.obtenerPorId.and.returnValue(
            of({
                ...mockPedido,
                estatus: 'EnValidacion',
                permisos: {
                    ...mockPedido.permisos,
                    puedeValidar: ['Sucursal'] // Solo Sucursal
                }
            })
        );

        component.ngOnInit();
        tick();
        component.selectedTabIndex = 2; // Tab Validación
        fixture.detectChanges();
        flush();

        // Debe pintar botón Aprobar para Sucursal
        const btnAprobarSucursal = fixture.nativeElement.querySelector('[data-testid="btn-aprobar-Sucursal"]');
        expect(btnAprobarSucursal).not.toBeNull();

        // NO debe pintar botón Aprobar para Ingenieria ni Administracion
        const btnAprobarIng = fixture.nativeElement.querySelector('[data-testid="btn-aprobar-Ingenieria"]');
        expect(btnAprobarIng).toBeNull();

        const btnAprobarAdmin = fixture.nativeElement.querySelector('[data-testid="btn-aprobar-Administracion"]');
        expect(btnAprobarAdmin).toBeNull();
    }));

    it('Rechazar_exige_motivo', fakeAsync(() => {
        pedidosServiceSpy.obtenerPorId.and.returnValue(
            of({
                ...mockPedido,
                estatus: 'EnValidacion',
                permisos: {
                    ...mockPedido.permisos,
                    puedeValidar: ['Sucursal']
                }
            })
        );
        component.ngOnInit();
        tick();
        flush();

        // Simulamos que el usuario cancela o no introduce motivo
        spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ value: '' } as any));
        component.rechazarArea('Sucursal');
        tick();
        flush();

        expect(pedidosServiceSpy.validarArea).not.toHaveBeenCalled();

        // Ahora simulamos que introduce un motivo válido
        (Swal.fire as jasmine.Spy).and.returnValue(Promise.resolve({ value: 'Falta anexo técnico firmado' } as any));
        pedidosServiceSpy.validarArea.and.returnValue(of({}));
        component.rechazarArea('Sucursal');
        tick();
        flush();

        expect(pedidosServiceSpy.validarArea).toHaveBeenCalledWith(10, 'Sucursal', {
            resultado: 'Rechazada',
            comentario: 'Falta anexo técnico firmado'
        });
    }));

    it('Botones_deshabilitados_en_vuelo', fakeAsync(() => {
        component.ngOnInit();
        tick();
        flush();

        // En vuelo de guardado de resumen
        component.guardandoResumen = true;
        component.guardarResumen();
        tick();
        expect(pedidosServiceSpy.actualizar).not.toHaveBeenCalled();

        // En vuelo de envío a validación
        component.enviandoValidacion = true;
        component.enviarAValidacion();
        tick();
        expect(pedidosServiceSpy.enviarValidacion).not.toHaveBeenCalled();
    }));

    // ==================== TAREA F4: EXPEDIENTE Y LIBERACIÓN ====================

    it('Sube_con_tipo_y_comentario', fakeAsync(() => {
        component.ngOnInit();
        tick();
        flush();

        const dummyFile = new File(['contenido de prueba'], 'orden-123.pdf', { type: 'application/pdf' });
        component.archivoSeleccionado = dummyFile;
        component.tipoArchivoSeleccionado = 'OrdenCompra';
        component.comentarioArchivo = 'OC sellada por cliente';

        const mockArchivoResp = {
            id: 88,
            tipo: 'OrdenCompra',
            tipoNombre: 'Orden de Compra',
            nombreOriginal: 'orden-123.pdf',
            tamanoBytes: 2048,
            contentType: 'application/pdf',
            subidoPorNombre: 'Juan Carlos',
            fechaSubida: '2026-11-27T10:00:00Z',
            activo: true,
            comentario: 'OC sellada por cliente'
        };

        pedidosServiceSpy.subirArchivo.and.returnValue(of(mockArchivoResp));

        component.subirArchivo();
        tick();
        flush();

        expect(pedidosServiceSpy.subirArchivo).toHaveBeenCalledWith(
            10,
            dummyFile,
            'OrdenCompra',
            'OC sellada por cliente'
        );
        expect(component.subiendoArchivo).toBeFalse();
        expect(component.archivoSeleccionado).toBeNull();
        expect(component.comentarioArchivo).toBe('');
        expect(component.pedido?.archivos?.length).toBe(1);
        expect(component.pedido?.archivos?.[0].id).toBe(88);
    }));

    it('Descarga_por_blob', fakeAsync(() => {
        component.ngOnInit();
        tick();
        flush();

        const mockBlob = new Blob(['datos binarios'], { type: 'application/pdf' });
        pedidosServiceSpy.descargarArchivo.and.returnValue(of(mockBlob));

        const archivoItem = {
            id: 88,
            tipo: 'OrdenCompra',
            tipoNombre: 'Orden de Compra',
            nombreOriginal: 'orden-123.pdf',
            tamanoBytes: 2048,
            contentType: 'application/pdf',
            subidoPorNombre: 'Juan',
            fechaSubida: '2026-11-27T10:00:00Z',
            activo: true
        };

        component.descargarArchivo(archivoItem);
        tick();
        flush();

        expect(pedidosServiceSpy.descargarArchivo).toHaveBeenCalledWith(10, 88);
    }));

    it('Baja_exige_motivo', fakeAsync(() => {
        component.ngOnInit();
        tick();
        flush();

        const archivoItem = {
            id: 88,
            tipo: 'OrdenCompra',
            tipoNombre: 'Orden de Compra',
            nombreOriginal: 'orden-123.pdf',
            tamanoBytes: 2048,
            contentType: 'application/pdf',
            subidoPorNombre: 'Juan',
            fechaSubida: '2026-11-27T10:00:00Z',
            activo: true
        };

        // Caso 1: El usuario cancela o no introduce motivo válido
        spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ value: '' } as any));
        component.darDeBajaArchivo(archivoItem);
        tick();
        flush();

        expect(pedidosServiceSpy.eliminarArchivo).not.toHaveBeenCalled();
        expect(archivoItem.activo).toBeTrue();

        // Caso 2: El usuario introduce motivo de al menos 10 caracteres
        (Swal.fire as jasmine.Spy).and.returnValue(
            Promise.resolve({ value: 'Archivo reemplazado por error en fecha' } as any)
        );
        pedidosServiceSpy.eliminarArchivo.and.returnValue(of({}));

        component.darDeBajaArchivo(archivoItem);
        tick();
        flush();

        expect(pedidosServiceSpy.eliminarArchivo).toHaveBeenCalledWith(
            10,
            88,
            'Archivo reemplazado por error en fecha'
        );
        expect(archivoItem.activo).toBeFalse();
    }));

    it('Panel_de_respaldo_refleja_las_reglas', fakeAsync(() => {
        component.ngOnInit();
        tick();
        flush();

        // Inicial: mockPedido tiene archivos = [], requiereAnticipo = true, tieneContrato = false, estatus = 'Recibido'
        expect(component.tieneArchivoAceptacion).toBeFalse();
        expect(component.cumpleAnticipo).toBeFalse(); // requiere anticipo pero no hay comprobante
        expect(component.cumpleContrato).toBeTrue(); // tieneContrato es false
        expect(component.cumpleCondicionesPago).toBeTrue();
        expect(component.cumpleTipoServicio).toBeTrue();
        expect(component.cumpleEstatusValidado).toBeFalse(); // está en Recibido
        expect(component.reglasRespaldoCumplidas).toBeFalse();
        expect(component.listaFaltantesRespaldo.length).toBeGreaterThan(0);

        // Agregamos archivo OrdenCompra
        component.pedido!.archivos = [
            {
                id: 1,
                tipo: 'OrdenCompra',
                tipoNombre: 'Orden de Compra',
                nombreOriginal: 'oc.pdf',
                tamanoBytes: 100,
                contentType: 'application/pdf',
                subidoPorNombre: 'Admin',
                fechaSubida: '2026-11-27T09:00:00Z',
                activo: true
            }
        ];
        expect(component.tieneArchivoAceptacion).toBeTrue();
        expect(component.cumpleAnticipo).toBeFalse();

        // Agregamos archivo ComprobantePago
        component.pedido!.archivos.push({
            id: 2,
            tipo: 'ComprobantePago',
            tipoNombre: 'Comprobante de Pago',
            nombreOriginal: 'pago.pdf',
            tamanoBytes: 100,
            contentType: 'application/pdf',
            subidoPorNombre: 'Admin',
            fechaSubida: '2026-11-27T09:00:00Z',
            activo: true
        });
        expect(component.cumpleAnticipo).toBeTrue();

        // Si marcamos tieneContrato = true
        component.pedido!.tieneContrato = true;
        expect(component.cumpleContrato).toBeFalse();

        // Agregamos Contrato
        component.pedido!.archivos.push({
            id: 3,
            tipo: 'Contrato',
            tipoNombre: 'Contrato',
            nombreOriginal: 'contrato.pdf',
            tamanoBytes: 100,
            contentType: 'application/pdf',
            subidoPorNombre: 'Admin',
            fechaSubida: '2026-11-27T09:00:00Z',
            activo: true
        });
        expect(component.cumpleContrato).toBeTrue();

        // Pasamos estatus a Validado
        component.pedido!.estatus = 'Validado';
        expect(component.cumpleEstatusValidado).toBeTrue();
        expect(component.reglasRespaldoCumplidas).toBeTrue();
        expect(component.listaFaltantesRespaldo.length).toBe(0);
    }));

    it('Liberar_muestra_todos_los_faltantes', fakeAsync(() => {
        pedidosServiceSpy.obtenerPorId.and.returnValue(
            of({
                ...mockPedido,
                estatus: 'Validado',
                permisos: {
                    ...mockPedido.permisos,
                    puedeLiberar: true
                }
            })
        );
        component.ngOnInit();
        tick();
        component.selectedTabIndex = 3; // Tab Expediente
        fixture.detectChanges();
        flush();

        pedidosServiceSpy.liberar.and.returnValue(
            throwError(() => ({
                status: 409,
                error: {
                    mensaje: 'No se puede liberar el pedido a operación.',
                    faltantes: [
                        'Falta al menos un archivo activo de aceptación.',
                        'El pedido requiere anticipo y no tiene comprobante adjunto.'
                    ]
                }
            }))
        );

        component.liberarOperacion('Iniciar fabricación de tableros de inmediato');
        tick();
        fixture.detectChanges();
        flush();

        expect(component.liberandoOperacion).toBeFalse();
        expect(component.faltantesLiberacion.length).toBe(2);
        expect(component.faltantesLiberacion[0]).toContain('archivo activo de aceptación');

        const el = fixture.nativeElement as HTMLElement;
        const alertaFaltantes = el.querySelector('[data-testid="alerta-faltantes-liberacion"]');
        expect(alertaFaltantes).not.toBeNull();
        expect(alertaFaltantes?.textContent).toContain('archivo activo de aceptación');
        expect(alertaFaltantes?.textContent).toContain('comprobante adjunto');
    }));

    it('Archivos_de_la_cotizacion_son_solo_lectura', fakeAsync(() => {
        pedidosServiceSpy.obtenerPorId.and.returnValue(
            of({
                ...mockPedido,
                cotizacionArchivos: [
                    {
                        id: 501,
                        version: 1,
                        nombreOriginal: 'cotizacion-firmada.pdf',
                        fechaSubida: '2026-11-25T12:00:00Z'
                    }
                ]
            })
        );
        pedidosServiceSpy.descargarCotizacionArchivo.and.returnValue(
            of(new Blob(['cotizacion'], { type: 'application/pdf' }))
        );

        component.ngOnInit();
        tick();
        component.selectedTabIndex = 3; // Tab Expediente
        fixture.detectChanges();
        flush();

        const el = fixture.nativeElement as HTMLElement;
        const seccionCot = el.querySelector('[data-testid="seccion-cotizacion-archivos"]');
        expect(seccionCot).not.toBeNull();

        const btnDescargarCot = el.querySelector('[data-testid="btn-descargar-cotizacion-archivo"]');
        expect(btnDescargarCot).not.toBeNull();

        // En la sección de cotización NO debe existir ningún botón de dar de baja
        const btnBajaEnCot = seccionCot?.querySelector('[data-testid="btn-baja-archivo"]');
        expect(btnBajaEnCot).toBeNull();

        // Probamos la descarga
        component.descargarCotizacionArchivo(component.pedido!.cotizacionArchivos[0]);
        tick();
        flush();

        expect(pedidosServiceSpy.descargarCotizacionArchivo).toHaveBeenCalledWith(10, 501);
    }));
});
