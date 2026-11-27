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
            'validarArea'
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
        pedidosServiceSpy.obtenerPorId.and.returnValue(of(mockPedido));

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
});
