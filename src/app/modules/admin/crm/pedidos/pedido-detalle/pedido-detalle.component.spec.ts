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
            'liberar',
            'programarFacturacion',
            'actualizarFacturacionFila',
            'obtenerBitacora',
            'agregarBitacora',
            'iniciarEjecucion',
            'entregar',
            'reabrirEjecucion',
            'cerrar',
            'cancelar',
            'registrarModificacion',
            'aprobarModificacionCliente',
            'aplicarModificacion',
            'cancelarModificacion'
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
        pedidosServiceSpy.obtenerBitacora.and.returnValue(of([]));

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
        // El API responde con el PEDIDO completo, no con la lista de puntos.
        pedidosServiceSpy.actualizarVerificacion.and.returnValue(of({ ...component.pedido!, verificacion: component.verificacionItems.map((v) => ({ ...v })) } as any));
        component.guardarVerificacion();
        tick();
        flush();

        expect(pedidosServiceSpy.actualizarVerificacion).toHaveBeenCalledWith(10, component.verificacionItems);
        expect(component.guardandoVerificacion).toBeFalse();
        expect(Array.isArray(component.verificacionItems)).toBeTrue();
        expect(component.verificacionItems.length).toBe(component.pedido!.verificacion.length);
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

    // ==================== TAREA F5: FACTURACIÓN, SEGUIMIENTO, MODIFICACIONES Y CIERRE ====================

    it('Facturacion_calcula_resumen_y_valida_reglas_de_estatus', fakeAsync(() => {
        component.ngOnInit();
        tick();
        flush();

        component.pedido!.montoPedido = 350000;
        component.pedido!.permisos.puedeFacturar = true;
        component.pedido!.facturacion = {
            programado: 300000,
            facturado: 250000,
            cobrado: 100000,
            pendientePorProgramar: 50000,
            filas: [
                {
                    id: 1,
                    concepto: 'Anticipo 30%',
                    fechaProgramada: '2026-11-28',
                    monto: 100000,
                    estatus: 'Cobrada',
                    folioFactura: 'FAC-001',
                    fechaFactura: '2026-11-28',
                    fechaCobro: '2026-11-29'
                },
                {
                    id: 2,
                    concepto: 'Entrega de equipo',
                    fechaProgramada: '2026-12-05',
                    monto: 150000,
                    estatus: 'Facturada',
                    folioFactura: 'FAC-002',
                    fechaFactura: '2026-12-05'
                },
                {
                    id: 3,
                    concepto: 'Finiquito',
                    fechaProgramada: '2026-12-15',
                    monto: 50000,
                    estatus: 'Programada'
                },
                {
                    id: 4,
                    concepto: 'Adicional cancelado',
                    fechaProgramada: '2026-12-20',
                    monto: 20000,
                    estatus: 'Cancelada'
                }
            ]
        };

        expect(component.facturacionProgramado).toBe(300000);
        expect(component.facturacionFacturado).toBe(250000);
        expect(component.facturacionCobrado).toBe(100000);
        expect(component.facturacionPendientePorProgramar).toBe(50000);

        // Transición: Programada -> Facturada (marcarFacturada)
        // El API responde con el RESUMEN completo (totales y todas las filas), no con la fila.
        const resumenTras = (cambio: (f: any) => any): any => {
            const filas = component.pedido!.facturacion.filas.map((f: any) => cambio({ ...f }));
            const vivas = filas.filter((f: any) => f.estatus !== 'Cancelada');
            return {
                programado: vivas.reduce((a: number, f: any) => a + f.monto, 0),
                facturado: vivas.filter((f: any) => f.estatus === 'Facturada' || f.estatus === 'Cobrada').reduce((a: number, f: any) => a + f.monto, 0),
                cobrado: vivas.filter((f: any) => f.estatus === 'Cobrada').reduce((a: number, f: any) => a + f.monto, 0),
                pendientePorProgramar: 0,
                filas
            };
        };
        pedidosServiceSpy.actualizarFacturacionFila.and.returnValue(
            of(resumenTras((f) => (f.id === 3 ? { ...f, estatus: 'Facturada', folioFactura: 'FAC-003', fechaFactura: '2026-12-15' } : f)))
        );
        component.marcarFacturada(component.pedido!.facturacion.filas[2], 'FAC-003', '2026-12-15');
        tick();
        flush();

        expect(pedidosServiceSpy.actualizarFacturacionFila).toHaveBeenCalledWith(
            10,
            3,
            jasmine.objectContaining({
                estatus: 'Facturada',
                folioFactura: 'FAC-003',
                fechaFactura: '2026-12-15'
            })
        );
        expect(component.pedido!.facturacion.filas[2].estatus).toBe('Facturada');

        // Transición: Facturada -> Cobrada (marcarCobrada)
        pedidosServiceSpy.actualizarFacturacionFila.and.returnValue(
            of(resumenTras((f) => (f.id === 2 ? { ...f, estatus: 'Cobrada', fechaCobro: '2026-12-10' } : f)))
        );
        component.marcarCobrada(component.pedido!.facturacion.filas[1], '2026-12-10');
        tick();
        flush();

        expect(pedidosServiceSpy.actualizarFacturacionFila).toHaveBeenCalledWith(
            10,
            2,
            jasmine.objectContaining({
                estatus: 'Cobrada',
                fechaCobro: '2026-12-10'
            })
        );
        expect(component.pedido!.facturacion.filas[1].estatus).toBe('Cobrada');
    }));

    it('Programar_factura_reemplaza_el_resumen_con_el_del_API_y_no_agrega_una_fila_fantasma', fakeAsync(() => {
        component.ngOnInit();
        tick();
        flush();
        component.pedido!.permisos.puedeFacturar = true;
        component.pedido!.montoPedido = 1000;
        const anticipo: any = { id: 1, concepto: 'Anticipo', fechaProgramada: '2026-12-01', monto: 400, estatus: 'Programada' };
        component.pedido!.facturacion = { programado: 400, facturado: 0, cobrado: 0, pendientePorProgramar: 600, filas: [anticipo] };

        // El API responde con el RESUMEN completo (totales y todas las filas), no con la fila nueva.
        const segunda: any = { id: 2, concepto: 'Segunda', fechaProgramada: '2026-12-15', monto: 300, estatus: 'Programada' };
        pedidosServiceSpy.programarFacturacion.and.returnValue(
            of({ programado: 700, facturado: 0, cobrado: 0, pendientePorProgramar: 300, filas: [anticipo, segunda] } as any)
        );
        component.nuevaFacturacionConcepto = 'Segunda';
        component.nuevaFacturacionFecha = '2026-12-15';
        component.nuevaFacturacionMonto = 300;

        component.programarFactura();
        tick();
        flush();

        expect(pedidosServiceSpy.programarFacturacion).toHaveBeenCalledWith(10, jasmine.objectContaining({ concepto: 'Segunda', fechaProgramada: '2026-12-15', monto: 300 }));
        expect(component.pedido!.facturacion.filas.length).toBe(2);
        expect(component.pedido!.facturacion.filas.every((f: any) => !!f.concepto && f.monto > 0 && !!f.estatus)).toBeTrue();
        expect(component.pedido!.facturacion.programado).toBe(700);
        expect(component.facturacionPendientePorProgramar).toBe(300);
        expect(component.nuevaFacturacionConcepto).toBe('');
    }));

    it('Bitacora_pagina_y_agrega_observacion', fakeAsync(() => {
        component.ngOnInit();
        tick();
        flush();

        // Paginado
        component.cargarBitacora(2);
        tick();
        flush();

        expect(pedidosServiceSpy.obtenerBitacora).toHaveBeenCalledWith(10, 2, 10);
        expect(component.bitacoraPage).toBe(2);

        // Agregar observación
        component.nuevaBitacoraTipo = 'Observacion';
        component.nuevaBitacoraTexto = 'Cliente confirma recepción de especificaciones';
        pedidosServiceSpy.agregarBitacora.and.returnValue(
            of({
                id: 99,
                fechaUtc: '2026-11-27T12:00:00Z',
                tipo: 'Observacion',
                usuarioId: 5,
                usuarioNombre: 'Carlos Vendedor',
                resumen: 'Cliente confirma recepción de especificaciones'
            })
        );

        component.agregarNotaBitacora();
        tick();
        flush();

        expect(pedidosServiceSpy.agregarBitacora).toHaveBeenCalledWith(10, {
            tipo: 'Observacion',
            texto: 'Cliente confirma recepción de especificaciones'
        });
        expect(component.nuevaBitacoraTexto).toBe('');
    }));

    it('Cerrar_muestra_faltantes', fakeAsync(() => {
        pedidosServiceSpy.obtenerPorId.and.returnValue(
            of({
                ...mockPedido,
                estatus: 'Entregado',
                permisos: {
                    ...mockPedido.permisos,
                    puedeCerrar: true
                }
            })
        );

        component.ngOnInit();
        tick();
        component.selectedTabIndex = 5; // Tab Seguimiento
        fixture.detectChanges();
        flush();

        pedidosServiceSpy.cerrar.and.returnValue(
            throwError(() => ({
                status: 409,
                error: {
                    mensaje: 'No se puede cerrar el pedido.',
                    faltantes: [
                        'Existen hitos de facturación programados pendientes por facturar.',
                        'El monto facturado no cubre el monto total del pedido.'
                    ]
                }
            }))
        );

        component.cerrarPedido('Cierre formal del proyecto tras entrega', true);
        tick();
        fixture.detectChanges();
        flush();

        expect(component.ejecutandoAccionEstatus).toBeFalse();
        expect(component.faltantesCierre.length).toBe(2);
        expect(component.faltantesCierre[0]).toContain('pendientes por facturar');

        const el = fixture.nativeElement as HTMLElement;
        const alertaCierre = el.querySelector('[data-testid="alerta-faltantes-cierre"]');
        expect(alertaCierre).not.toBeNull();
        expect(alertaCierre?.textContent).toContain('pendientes por facturar');
    }));

    it('Cancelar_exige_motivo', fakeAsync(() => {
        pedidosServiceSpy.obtenerPorId.and.returnValue(
            of({
                ...mockPedido,
                estatus: 'Recibido',
                permisos: {
                    ...mockPedido.permisos,
                    puedeCancelar: true
                }
            })
        );

        component.ngOnInit();
        tick();
        flush();

        // Caso 1: El usuario no proporciona motivo o cancela
        spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ value: '' } as any));
        component.cancelarPedido();
        tick();
        flush();

        expect(pedidosServiceSpy.cancelar).not.toHaveBeenCalled();

        // Caso 2: El usuario proporciona motivo válido (>= 10 caracteres)
        (Swal.fire as jasmine.Spy).and.returnValue(
            Promise.resolve({ value: 'Cancelado por solicitud del cliente debido a recorte de presupuesto' } as any)
        );
        pedidosServiceSpy.cancelar.and.returnValue(of({}));

        component.cancelarPedido();
        tick();
        flush();

        expect(pedidosServiceSpy.cancelar).toHaveBeenCalledWith(10, {
            motivo: 'Cancelado por solicitud del cliente debido a recorte de presupuesto'
        });
    }));

    it('Modificacion_aprobar_y_aplicar_actualiza_el_monto', fakeAsync(() => {
        component.ngOnInit();
        tick();
        flush();

        const modItem = {
            id: 201,
            consecutivo: 1,
            descripcion: 'Ampliación de tablero con 2 circuitos adicionales',
            impactoTecnico: 'Requiere interruptores 3x100A',
            impactoEconomico: 50000,
            requiereActualizarCotizacion: false,
            estatus: 'Registrada',
            registradaPorNombre: 'Ing. López',
            fechaRegistro: '2026-11-27T10:00:00Z'
        };
        component.pedido!.montoPedido = 350000;
        component.pedido!.modificaciones = [modItem];

        // Paso 1: Aprobar por el cliente
        pedidosServiceSpy.aprobarModificacionCliente.and.returnValue(of({}));
        component.aprobarModificacion(modItem, 'Minuta de cambio #01 firmada', '2026-11-27');
        tick();
        flush();

        expect(pedidosServiceSpy.aprobarModificacionCliente).toHaveBeenCalledWith(10, 201, {
            referencia: 'Minuta de cambio #01 firmada',
            fecha: '2026-11-27'
        });
        expect(modItem.estatus).toBe('AprobadaPorCliente');

        // Paso 2: Aplicar la modificación
        spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true } as any));
        pedidosServiceSpy.aplicarModificacion.and.callFake(() => {
            pedidosServiceSpy.obtenerPorId.and.returnValue(
                of({
                    ...component.pedido!,
                    montoPedido: 400000
                })
            );
            return of({});
        });

        component.aplicarModificacion(modItem);
        tick();
        flush();

        expect(pedidosServiceSpy.aplicarModificacion).toHaveBeenCalledWith(10, 201);
        expect(modItem.estatus).toBe('Aplicada');
        expect(component.pedido!.montoPedido).toBe(400000);
    }));

    it('Botones_segun_permisos', fakeAsync(() => {
        // Caso 1: permisos = false
        pedidosServiceSpy.obtenerPorId.and.returnValue(
            of({
                ...mockPedido,
                estatus: 'Entregado',
                permisos: {
                    puedeEditar: false,
                    puedeVerificar: false,
                    puedeValidar: [],
                    puedeLiberar: false,
                    puedeFacturar: false,
                    puedeCerrar: false,
                    puedeCancelar: false
                }
            })
        );
        component.ngOnInit();
        tick();
        component.selectedTabIndex = 4; // Facturación
        fixture.detectChanges();
        flush();

        const el = fixture.nativeElement as HTMLElement;
        const formFacturacion = el.querySelector('[data-testid="form-facturacion"]');
        expect(formFacturacion).toBeNull();

        component.selectedTabIndex = 5; // Seguimiento
        fixture.detectChanges();
        flush();

        const btnCerrar = el.querySelector('[data-testid="btn-cerrar-pedido"]');
        expect(btnCerrar).toBeNull();

        const btnCancelar = el.querySelector('[data-testid="btn-cancelar-pedido"]');
        expect(btnCancelar).toBeNull();

        // Caso 2: permisos = true
        pedidosServiceSpy.obtenerPorId.and.returnValue(
            of({
                ...mockPedido,
                estatus: 'Entregado',
                permisos: {
                    puedeEditar: true,
                    puedeVerificar: true,
                    puedeValidar: ['Sucursal'],
                    puedeLiberar: true,
                    puedeFacturar: true,
                    puedeCerrar: true,
                    puedeCancelar: true
                }
            })
        );
        component.ngOnInit();
        tick();
        component.selectedTabIndex = 4; // Facturación
        fixture.detectChanges();
        flush();

        const formFacturacion2 = el.querySelector('[data-testid="form-facturacion"]');
        expect(formFacturacion2).not.toBeNull();

        component.selectedTabIndex = 5; // Seguimiento
        fixture.detectChanges();
        flush();

        const btnCerrar2 = el.querySelector('[data-testid="btn-cerrar-pedido"]');
        expect(btnCerrar2).not.toBeNull();

        const btnCancelar2 = el.querySelector('[data-testid="btn-cancelar-pedido"]');
        expect(btnCancelar2).not.toBeNull();
    }));

    it('Fechas_con_menos_0600_y_dias_con_UTC', fakeAsync(() => {
        pedidosServiceSpy.obtenerPorId.and.returnValue(
            of({
                ...mockPedido,
                fechaOC: '2026-11-20',
                facturacion: {
                    programado: 100000,
                    facturado: 100000,
                    cobrado: 0,
                    pendientePorProgramar: 250000,
                    filas: [
                        {
                            id: 1,
                            concepto: 'Entrega inicial',
                            fechaProgramada: '2026-11-28',
                            monto: 100000,
                            estatus: 'Facturada',
                            folioFactura: 'FAC-100',
                            fechaFactura: '2026-11-28'
                        }
                    ]
                }
            })
        );

        // Simulamos bitácora con hora UTC 16:00 (en CDMX -0600 corresponde a 10:00)
        pedidosServiceSpy.obtenerBitacora.and.returnValue(
            of([
                {
                    id: 10,
                    fechaUtc: '2026-11-27T16:00:00Z',
                    tipo: 'Avance',
                    usuarioId: 5,
                    usuarioNombre: 'Carlos',
                    resumen: 'Fabricación al 50%'
                }
            ])
        );

        component.ngOnInit();
        tick();

        // Revisamos en Tab Facturación (fecha solo-día debe formatearse UTC -> 28/11/2026)
        component.selectedTabIndex = 4;
        fixture.detectChanges();
        flush();

        const el = fixture.nativeElement as HTMLElement;
        const tablaFact = el.querySelector('[data-testid="tabla-facturacion"]');
        expect(tablaFact?.textContent).toContain('28/11/2026');

        // Revisamos en Tab Seguimiento (fecha y hora UTC con -0600 -> 27/11/2026 10:00)
        component.selectedTabIndex = 5;
        fixture.detectChanges();
        flush();

        const lineaBitacora = el.querySelector('[data-testid="panel-linea-tiempo-bitacora"]');
        expect(lineaBitacora?.textContent).toContain('27/11/2026 10:00');
    }));
});
