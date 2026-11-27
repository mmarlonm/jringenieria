import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { saveAs } from 'file-saver';
import Swal from 'sweetalert2';
import { PedidosService } from '../pedidos.service';
import {
    PedidoDetalle,
    PedidoCatalogos,
    PedidoVerificacionItem,
    PedidoValidacionItem,
    PedidoArchivoItem,
    CotizacionArchivoItem,
    FacturacionFila,
    PedidoBitacoraItem,
    PedidoModificacionItem,
    ActualizarPedidoDto
} from '../pedidos.types';

@Component({
    selector: 'app-pedido-detalle',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        ReactiveFormsModule,
        MatTabsModule,
        MatTableModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './pedido-detalle.component.html',
    styleUrls: ['./pedido-detalle.component.scss']
})
export class PedidoDetalleComponent implements OnInit {
    pedidoId!: number;
    pedido: PedidoDetalle | null = null;
    catalogos: PedidoCatalogos | null = null;
    cargando = true;
    errorCarga: string | null = null;
    selectedTabIndex = 0;

    // Resumen form
    resumenForm!: FormGroup;
    guardandoResumen = false;

    // Verificación
    verificacionItems: PedidoVerificacionItem[] = [];
    guardandoVerificacion = false;
    enviandoValidacion = false;
    faltantesValidacion: string[] = [];

    // Validación
    validandoArea: Record<string, boolean> = {};

    // Expediente y archivos (F4)
    archivoSeleccionado: File | null = null;
    tipoArchivoSeleccionado = 'OrdenCompra';
    comentarioArchivo = '';
    subiendoArchivo = false;
    columnasArchivos: string[] = ['tipo', 'nombre', 'tamano', 'subidoPor', 'fecha', 'comentario', 'acciones'];
    columnasCotizacionArchivos: string[] = ['version', 'nombre', 'fecha', 'acciones'];

    // Liberación a operación (F4)
    liberandoOperacion = false;
    faltantesLiberacion: string[] = [];

    // Facturación programada (F5)
    nuevaFacturacionConcepto = '';
    nuevaFacturacionFecha = '';
    nuevaFacturacionMonto: number | null = null;
    programandoFactura = false;
    columnasFacturacion: string[] = [
        'concepto',
        'fechaProgramada',
        'monto',
        'estatus',
        'folioFactura',
        'fechaFactura',
        'fechaCobro',
        'acciones'
    ];

    // Seguimiento y Bitácora (F5)
    bitacoraItems: PedidoBitacoraItem[] = [];
    bitacoraPage = 1;
    bitacoraSize = 10;
    cargandoBitacora = false;
    nuevaBitacoraTipo = 'Observacion';
    nuevaBitacoraTexto = '';
    guardandoBitacora = false;
    faltantesCierre: string[] = [];
    ejecutandoAccionEstatus = false;

    // Modificaciones (F5)
    nuevaModDescripcion = '';
    nuevaModImpactoTecnico = '';
    nuevaModImpactoEconomico: number | null = 0;
    nuevaModRequiereCotizacion = false;
    nuevaModCotizacionFolio = '';
    registrandoModificacion = false;
    columnasModificaciones: string[] = [
        'consecutivo',
        'descripcion',
        'impactoEconomico',
        'estatus',
        'registradaPor',
        'fechaRegistro',
        'acciones'
    ];

    columnasPartidas: string[] = [
        'partida',
        'codigo',
        'descripcion',
        'unidad',
        'cantidad',
        'precioUnitario',
        'descuento',
        'importe'
    ];

    constructor(
        private readonly _route: ActivatedRoute,
        private readonly _router: Router,
        private readonly _pedidosService: PedidosService,
        private readonly _fb: FormBuilder,
        private readonly _cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.inicializarFormulario();
        this._route.params.subscribe((params) => {
            const id = Number(params['id']);
            if (id) {
                this.pedidoId = id;
                this.cargarCatalogos();
                this.cargarPedido();
            }
        });
    }

    inicializarFormulario(): void {
        this.resumenForm = this._fb.group({
            numeroOC: [''],
            fechaOC: [''],
            tipoServicio: [''],
            prioridad: [''],
            condicionesPago: [''],
            requiereAnticipo: [false],
            anticipoMonto: [null],
            tieneContrato: [false],
            responsableUsuarioId: [null],
            observaciones: ['']
        });
    }

    cargarCatalogos(): void {
        this._pedidosService.obtenerCatalogos().subscribe({
            next: (cat) => {
                this.catalogos = cat;
                this._cdr.markForCheck();
            },
            error: () => {}
        });
    }

    cargarPedido(): void {
        this.cargando = true;
        this.errorCarga = null;
        this._pedidosService.obtenerPorId(this.pedidoId).subscribe({
            next: (p) => {
                this.pedido = p;
                this.cargando = false;
                this.poblarDatos(p);
                this._cdr.markForCheck();
            },
            error: (err) => {
                this.cargando = false;
                this.errorCarga = err?.error?.mensaje || 'No se pudo cargar el pedido.';
                this._cdr.markForCheck();
            }
        });
    }

    poblarDatos(p: PedidoDetalle): void {
        this.resumenForm.patchValue({
            numeroOC: p.numeroOC || '',
            fechaOC: p.fechaOC || '',
            tipoServicio: p.tipoServicio || '',
            prioridad: p.prioridad || '',
            condicionesPago: p.condicionesPago || '',
            requiereAnticipo: p.requiereAnticipo === true,
            anticipoMonto: p.anticipoMonto,
            tieneContrato: p.tieneContrato === true,
            responsableUsuarioId: p.responsableUsuarioId,
            observaciones: p.observaciones || ''
        });

        if (p.permisos?.puedeEditar) {
            this.resumenForm.enable();
            // Si el estatus no es Recibido, ciertos campos no se pueden editar según regla
            if (p.estatus !== 'Recibido') {
                this.resumenForm.get('tipoServicio')?.disable();
                this.resumenForm.get('condicionesPago')?.disable();
                this.resumenForm.get('requiereAnticipo')?.disable();
                this.resumenForm.get('anticipoMonto')?.disable();
                this.resumenForm.get('tieneContrato')?.disable();
            }
        } else {
            this.resumenForm.disable();
        }

        // Verificación items
        this.verificacionItems = (p.verificacion || []).map((v) => ({ ...v }));
        this.cargarBitacora(1);
    }

    guardarResumen(): void {
        if (!this.pedido?.permisos?.puedeEditar || this.guardandoResumen) return;

        this.guardandoResumen = true;
        const formVal = this.resumenForm.getRawValue();
        const dto: ActualizarPedidoDto = {
            numeroOC: formVal.numeroOC || null,
            fechaOC: formVal.fechaOC || null,
            tipoServicio: formVal.tipoServicio || null,
            prioridad: formVal.prioridad || null,
            condicionesPago: formVal.condicionesPago || null,
            requiereAnticipo: formVal.requiereAnticipo,
            anticipoMonto: formVal.requiereAnticipo ? formVal.anticipoMonto : null,
            tieneContrato: formVal.tieneContrato,
            responsableUsuarioId: formVal.responsableUsuarioId ? Number(formVal.responsableUsuarioId) : null,
            observaciones: formVal.observaciones || null
        };

        this._pedidosService.actualizar(this.pedidoId, dto).subscribe({
            next: (actualizado) => {
                this.guardandoResumen = false;
                this.pedido = actualizado;
                this.poblarDatos(actualizado);
                Swal.fire({
                    icon: 'success',
                    title: 'Cambios guardados',
                    text: 'Los datos del pedido han sido actualizados.',
                    timer: 2000,
                    showConfirmButton: false
                });
                this._cdr.markForCheck();
            },
            error: (err) => {
                this.guardandoResumen = false;
                const msg = err?.error?.mensaje || 'No se pudo actualizar el pedido.';
                Swal.fire({
                    icon: 'error',
                    title: 'Error al guardar',
                    text: msg
                });
                this._cdr.markForCheck();
            }
        });
    }

    guardarVerificacion(): void {
        if (!this.pedido?.permisos?.puedeVerificar || this.guardandoVerificacion) return;

        // Validar que cualquier punto no cumplido tenga discrepancia aclarada y comentario
        for (const v of this.verificacionItems) {
            if (v.cumple === false) {
                if (!v.discrepanciaAclarada) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Discrepancia sin aclarar',
                        text: `El punto «${v.nombre}» no cumple y no tiene marcada la aclaración de discrepancia.`
                    });
                    return;
                }
                if (!v.comentario || v.comentario.trim().length < 10) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Comentario requerido',
                        text: `El punto «${v.nombre}» requiere un comentario de aclaración de al menos 10 caracteres.`
                    });
                    return;
                }
            }
        }

        this.guardandoVerificacion = true;
        this._pedidosService.actualizarVerificacion(this.pedidoId, this.verificacionItems).subscribe({
            next: (verif) => {
                this.guardandoVerificacion = false;
                this.verificacionItems = verif;
                if (this.pedido) this.pedido.verificacion = verif;
                Swal.fire({
                    icon: 'success',
                    title: 'Verificación guardada',
                    timer: 1500,
                    showConfirmButton: false
                });
                this._cdr.markForCheck();
            },
            error: (err) => {
                this.guardandoVerificacion = false;
                const msg = err?.error?.mensaje || 'No se pudo guardar la verificación.';
                Swal.fire({
                    icon: 'error',
                    title: 'Error en verificación',
                    text: msg
                });
                this._cdr.markForCheck();
            }
        });
    }

    enviarAValidacion(): void {
        if (!this.pedido?.permisos?.puedeVerificar || this.enviandoValidacion) return;

        this.enviandoValidacion = true;
        this.faltantesValidacion = [];

        this._pedidosService.enviarValidacion(this.pedidoId).subscribe({
            next: () => {
                this.enviandoValidacion = false;
                Swal.fire({
                    icon: 'success',
                    title: 'Pedido enviado a validación',
                    text: 'Se crearon las validaciones para las áreas requeridas.',
                    timer: 2000,
                    showConfirmButton: false
                });
                this.cargarPedido();
            },
            error: (err) => {
                this.enviandoValidacion = false;
                const msg = err?.error?.mensaje || 'No se pudo enviar a validación.';
                this.faltantesValidacion = err?.error?.faltantes || [];
                Swal.fire({
                    icon: 'warning',
                    title: 'Validación incompleta',
                    text: msg
                });
                this._cdr.markForCheck();
            }
        });
    }

    async aprobarArea(area: string): Promise<void> {
        if (!this.puedeValidarArea(area) || this.validandoArea[area]) return;

        const confirm = await Swal.fire({
            title: `¿Aprobar validación de ${area}?`,
            text: 'Se registrará tu aprobación para esta área.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, aprobar',
            cancelButtonText: 'Cancelar'
        });

        if (!confirm.isConfirmed) return;

        this.validandoArea[area] = true;
        this._pedidosService
            .validarArea(this.pedidoId, area, {
                resultado: 'Aprobada',
                comentario: 'Validación aprobada'
            })
            .subscribe({
                next: () => {
                    this.validandoArea[area] = false;
                    Swal.fire({
                        icon: 'success',
                        title: 'Área aprobada',
                        timer: 1500,
                        showConfirmButton: false
                    });
                    this.cargarPedido();
                },
                error: (err) => {
                    this.validandoArea[area] = false;
                    const msg = err?.error?.mensaje || 'No se pudo aprobar el área.';
                    Swal.fire({
                        icon: 'error',
                        title: 'Error al validar',
                        text: msg
                    });
                    this._cdr.markForCheck();
                }
            });
    }

    async rechazarArea(area: string): Promise<void> {
        if (!this.puedeValidarArea(area) || this.validandoArea[area]) return;

        const { value: comentario } = await Swal.fire({
            title: `Rechazar validación de ${area}`,
            input: 'textarea',
            inputLabel: 'Motivo del rechazo (obligatorio)',
            inputPlaceholder: 'Describe la razón del rechazo...',
            inputValidator: (value) => {
                if (!value || value.trim().length < 5) {
                    return 'Debes ingresar un motivo de rechazo de al menos 5 caracteres.';
                }
                return null;
            },
            showCancelButton: true,
            confirmButtonText: 'Rechazar validación',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc2626'
        });

        if (!comentario) return;

        this.validandoArea[area] = true;
        this._pedidosService
            .validarArea(this.pedidoId, area, {
                resultado: 'Rechazada',
                comentario
            })
            .subscribe({
                next: () => {
                    this.validandoArea[area] = false;
                    Swal.fire({
                        icon: 'info',
                        title: 'Validación rechazada',
                        text: 'El pedido regresó a estatus Recibido.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                    this.cargarPedido();
                },
                error: (err) => {
                    this.validandoArea[area] = false;
                    const msg = err?.error?.mensaje || 'No se pudo rechazar la validación.';
                    Swal.fire({
                        icon: 'error',
                        title: 'Error al rechazar',
                        text: msg
                    });
                    this._cdr.markForCheck();
                }
            });
    }

    puedeValidarArea(area: string): boolean {
        if (!this.pedido || this.pedido.estatus !== 'EnValidacion') return false;
        return (this.pedido.permisos?.puedeValidar || []).includes(area);
    }

    // Métodos de Expediente y Archivos (F4)
    onArchivoSeleccionado(event: any): void {
        const file = event?.target?.files?.[0];
        if (file) {
            this.archivoSeleccionado = file;
        }
    }

    subirArchivo(): void {
        if (!this.archivoSeleccionado || this.subiendoArchivo) return;

        this.subiendoArchivo = true;
        this._pedidosService
            .subirArchivo(
                this.pedidoId,
                this.archivoSeleccionado,
                this.tipoArchivoSeleccionado,
                this.comentarioArchivo
            )
            .subscribe({
                next: (nuevoArchivo) => {
                    this.subiendoArchivo = false;
                    this.archivoSeleccionado = null;
                    this.comentarioArchivo = '';
                    if (this.pedido) {
                        this.pedido.archivos = [...(this.pedido.archivos || []), nuevoArchivo];
                    }
                    Swal.fire({
                        icon: 'success',
                        title: 'Archivo subido',
                        timer: 1500,
                        showConfirmButton: false
                    });
                    this._cdr.markForCheck();
                },
                error: (err) => {
                    this.subiendoArchivo = false;
                    const msg = err?.error?.mensaje || 'No se pudo subir el archivo.';
                    Swal.fire({
                        icon: 'error',
                        title: 'Error al subir archivo',
                        text: msg
                    });
                    this._cdr.markForCheck();
                }
            });
    }

    descargarArchivo(archivo: PedidoArchivoItem): void {
        this._pedidosService.descargarArchivo(this.pedidoId, archivo.id).subscribe({
            next: (blob) => {
                saveAs(blob, archivo.nombreOriginal);
            },
            error: (err) => {
                const msg = err?.error?.mensaje || 'No se pudo descargar el archivo.';
                Swal.fire({
                    icon: 'error',
                    title: 'Error de descarga',
                    text: msg
                });
            }
        });
    }

    descargarCotizacionArchivo(archivo: CotizacionArchivoItem): void {
        this._pedidosService.descargarCotizacionArchivo(this.pedidoId, archivo.id).subscribe({
            next: (blob) => {
                saveAs(blob, archivo.nombreOriginal);
            },
            error: (err) => {
                const msg = err?.error?.mensaje || 'No se pudo descargar el archivo de cotización.';
                Swal.fire({
                    icon: 'error',
                    title: 'Error de descarga',
                    text: msg
                });
            }
        });
    }

    async darDeBajaArchivo(archivo: PedidoArchivoItem): Promise<void> {
        const { value: motivo } = await Swal.fire({
            title: `Dar de baja «${archivo.nombreOriginal}»`,
            input: 'textarea',
            inputLabel: 'Motivo de la baja (obligatorio, mínimo 10 caracteres)',
            inputPlaceholder: 'Ingresa el motivo de la baja documental...',
            inputValidator: (val) => {
                if (!val || val.trim().length < 10) {
                    return 'Debes ingresar un motivo de al menos 10 caracteres.';
                }
                return null;
            },
            showCancelButton: true,
            confirmButtonText: 'Dar de baja',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc2626'
        });

        if (!motivo) return;

        this._pedidosService.eliminarArchivo(this.pedidoId, archivo.id, motivo).subscribe({
            next: () => {
                archivo.activo = false;
                Swal.fire({
                    icon: 'info',
                    title: 'Archivo dado de baja',
                    timer: 1500,
                    showConfirmButton: false
                });
                this._cdr.markForCheck();
            },
            error: (err) => {
                const msg = err?.error?.mensaje || 'No se pudo dar de baja el archivo.';
                Swal.fire({
                    icon: 'error',
                    title: 'Error al dar de baja',
                    text: msg
                });
            }
        });
    }

    // Reglas de respaldo documental (D7)
    get tieneArchivoAceptacion(): boolean {
        return (this.pedido?.archivos || []).some(
            (a) => a.activo !== false && ['OrdenCompra', 'Contrato', 'CorreoAceptacion', 'ComprobantePago'].includes(a.tipo)
        );
    }

    get cumpleAnticipo(): boolean {
        if (!this.pedido?.requiereAnticipo) return true;
        return (this.pedido?.archivos || []).some((a) => a.activo !== false && a.tipo === 'ComprobantePago');
    }

    get cumpleContrato(): boolean {
        if (!this.pedido?.tieneContrato) return true;
        return (this.pedido?.archivos || []).some((a) => a.activo !== false && a.tipo === 'Contrato');
    }

    get cumpleCondicionesPago(): boolean {
        return !!this.pedido?.condicionesPago && this.pedido.condicionesPago.trim().length > 0;
    }

    get cumpleTipoServicio(): boolean {
        return !!this.pedido?.tipoServicio && this.pedido.tipoServicio.trim().length > 0;
    }

    get cumpleEstatusValidado(): boolean {
        return this.pedido?.estatus === 'Validado';
    }

    get reglasRespaldoCumplidas(): boolean {
        return (
            this.tieneArchivoAceptacion &&
            this.cumpleAnticipo &&
            this.cumpleContrato &&
            this.cumpleCondicionesPago &&
            this.cumpleTipoServicio &&
            this.cumpleEstatusValidado
        );
    }

    get listaFaltantesRespaldo(): string[] {
        const faltantes: string[] = [];
        if (!this.tieneArchivoAceptacion) {
            faltantes.push('Falta al menos un archivo activo de aceptación (OrdenCompra, Contrato, CorreoAceptacion o ComprobantePago).');
        }
        if (!this.cumpleAnticipo) {
            faltantes.push('El pedido requiere anticipo y no tiene adjunto comprobante de pago.');
        }
        if (!this.cumpleContrato) {
            faltantes.push('El pedido tiene contrato marcado y no tiene adjunto el documento de contrato.');
        }
        if (!this.cumpleCondicionesPago) {
            faltantes.push('Las condiciones de pago no han sido capturadas.');
        }
        if (!this.cumpleTipoServicio) {
            faltantes.push('El tipo de servicio no ha sido definido.');
        }
        if (!this.cumpleEstatusValidado) {
            faltantes.push(`El pedido debe estar en estatus «Validado» (actualmente «${this.pedido?.estatus}»).`);
        }
        return faltantes;
    }

    // Liberación a operación (D7)
    async liberarOperacion(instruccionDirecta?: string): Promise<void> {
        if (this.liberandoOperacion) return;

        let instruccion = instruccionDirecta;
        if (!instruccion) {
            const { value } = await Swal.fire({
                title: 'Liberar pedido a operación',
                input: 'textarea',
                inputLabel: 'Instrucción de inicio para operación (obligatoria, mín. 10 caracteres)',
                inputPlaceholder: 'Indica los alcances, prioridades o instrucciones de arranque...',
                inputValidator: (val) => {
                    if (!val || val.trim().length < 10) {
                        return 'Debes ingresar una instrucción de inicio de al menos 10 caracteres.';
                    }
                    return null;
                },
                showCancelButton: true,
                confirmButtonText: 'Liberar a operación',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#0d9488'
            });
            if (!value) return;
            instruccion = value;
        }

        this.liberandoOperacion = true;
        this.faltantesLiberacion = [];

        this._pedidosService
            .liberar(this.pedidoId, {
                instruccionInicio: instruccion
            })
            .subscribe({
                next: () => {
                    this.liberandoOperacion = false;
                    Swal.fire({
                        icon: 'success',
                        title: 'Pedido liberado a operación',
                        text: 'El pedido ha pasado a estatus Liberado.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                    this.cargarPedido();
                },
                error: (err) => {
                    this.liberandoOperacion = false;
                    const msg = err?.error?.mensaje || 'No se pudo liberar el pedido a operación.';
                    this.faltantesLiberacion = err?.error?.faltantes || [msg];
                    Swal.fire({
                        icon: 'warning',
                        title: 'No se pudo liberar el pedido',
                        text: msg
                    });
                    this._cdr.markForCheck();
                }
            });
    }

    // ==================== FACTURACIÓN PROGRAMADA (F5) ====================
    get facturacionProgramado(): number {
        return (this.pedido?.facturacion?.filas || [])
            .filter((f) => f.estatus !== 'Cancelada')
            .reduce((acc, f) => acc + (f.monto || 0), 0);
    }

    get facturacionFacturado(): number {
        return (this.pedido?.facturacion?.filas || [])
            .filter((f) => f.estatus === 'Facturada' || f.estatus === 'Cobrada')
            .reduce((acc, f) => acc + (f.monto || 0), 0);
    }

    get facturacionCobrado(): number {
        return (this.pedido?.facturacion?.filas || [])
            .filter((f) => f.estatus === 'Cobrada')
            .reduce((acc, f) => acc + (f.monto || 0), 0);
    }

    get facturacionPendientePorProgramar(): number {
        const total = this.pedido?.montoPedido || 0;
        return Math.max(0, total - this.facturacionProgramado);
    }

    get facturacionPorcentajeCobrado(): number {
        const total = this.pedido?.montoPedido || 1;
        return Math.min(100, Math.round((this.facturacionCobrado / total) * 100));
    }

    programarFactura(): void {
        if (!this.pedido?.permisos?.puedeFacturar || this.programandoFactura) return;

        if (!this.nuevaFacturacionConcepto || this.nuevaFacturacionConcepto.trim().length === 0) {
            Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'Ingresa un concepto para la facturación.' });
            return;
        }

        if (!this.nuevaFacturacionFecha) {
            Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'Selecciona una fecha programada.' });
            return;
        }

        const monto = Number(this.nuevaFacturacionMonto);
        if (isNaN(monto) || monto <= 0) {
            Swal.fire({ icon: 'warning', title: 'Monto inválido', text: 'El monto debe ser un valor numérico positivo.' });
            return;
        }

        if (monto > this.facturacionPendientePorProgramar) {
            Swal.fire({
                icon: 'warning',
                title: 'Monto excedido',
                text: `No puedes programar más que el monto pendiente (${this.facturacionPendientePorProgramar.toFixed(2)}).`
            });
            return;
        }

        this.programandoFactura = true;
        this._pedidosService
            .programarFacturacion(this.pedidoId, {
                concepto: this.nuevaFacturacionConcepto,
                fechaProgramada: this.nuevaFacturacionFecha,
                monto
            })
            .subscribe({
                next: (nuevaFila) => {
                    this.programandoFactura = false;
                    this.nuevaFacturacionConcepto = '';
                    this.nuevaFacturacionFecha = '';
                    this.nuevaFacturacionMonto = null;
                    if (this.pedido?.facturacion) {
                        this.pedido.facturacion.filas = [...(this.pedido.facturacion.filas || []), nuevaFila];
                        this.pedido.facturacion.programado = this.facturacionProgramado;
                        this.pedido.facturacion.pendientePorProgramar = this.facturacionPendientePorProgramar;
                    }
                    Swal.fire({ icon: 'success', title: 'Factura programada', timer: 1500, showConfirmButton: false });
                    this._cdr.markForCheck();
                },
                error: (err) => {
                    this.programandoFactura = false;
                    const msg = err?.error?.mensaje || 'No se pudo programar la factura.';
                    Swal.fire({ icon: 'error', title: 'Error al programar', text: msg });
                    this._cdr.markForCheck();
                }
            });
    }

    async marcarFacturada(fila: FacturacionFila, folioDirecto?: string, fechaDirecta?: string): Promise<void> {
        let folio = folioDirecto;
        let fecha = fechaDirecta;

        if (!folio || !fecha) {
            const { value: formValues } = await Swal.fire({
                title: `Registrar Factura para «${fila.concepto}»`,
                html: `
                    <div class="flex flex-col gap-3 text-left">
                        <label class="text-xs font-semibold">Folio de Factura (requerido)</label>
                        <input id="swal-folio-factura" class="swal2-input !m-0 !w-full" placeholder="F-12345" />
                        <label class="text-xs font-semibold mt-2">Fecha de Emisión (requerida)</label>
                        <input id="swal-fecha-factura" type="date" class="swal2-input !m-0 !w-full" />
                    </div>
                `,
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: 'Guardar Factura',
                cancelButtonText: 'Cancelar',
                preConfirm: () => {
                    const f = (document.getElementById('swal-folio-factura') as HTMLInputElement)?.value;
                    const d = (document.getElementById('swal-fecha-factura') as HTMLInputElement)?.value;
                    if (!f || !d) {
                        Swal.showValidationMessage('Debes proporcionar el folio y la fecha de factura.');
                        return null;
                    }
                    return { folio: f, fecha: d };
                }
            });

            if (!formValues) return;
            folio = formValues.folio;
            fecha = formValues.fecha;
        }

        this._pedidosService
            .actualizarFacturacionFila(this.pedidoId, fila.id, {
                concepto: fila.concepto,
                fechaProgramada: fila.fechaProgramada,
                monto: fila.monto,
                estatus: 'Facturada',
                folioFactura: folio,
                fechaFactura: fecha
            })
            .subscribe({
                next: (act) => {
                    Object.assign(fila, act);
                    if (this.pedido?.facturacion) {
                        this.pedido.facturacion.facturado = this.facturacionFacturado;
                    }
                    Swal.fire({ icon: 'success', title: 'Factura registrada', timer: 1500, showConfirmButton: false });
                    this._cdr.markForCheck();
                },
                error: (err) => {
                    const msg = err?.error?.mensaje || 'No se pudo actualizar la factura.';
                    Swal.fire({ icon: 'error', title: 'Error', text: msg });
                }
            });
    }

    async marcarCobrada(fila: FacturacionFila, fechaDirecta?: string): Promise<void> {
        let fecha = fechaDirecta;

        if (!fecha) {
            const { value: fCobro } = await Swal.fire({
                title: `Registrar Cobro para «${fila.concepto}»`,
                html: `
                    <div class="flex flex-col gap-2 text-left">
                        <label class="text-xs font-semibold">Fecha de Cobro (requerida)</label>
                        <input id="swal-fecha-cobro" type="date" class="swal2-input !m-0 !w-full" />
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Guardar Cobro',
                cancelButtonText: 'Cancelar',
                preConfirm: () => {
                    const d = (document.getElementById('swal-fecha-cobro') as HTMLInputElement)?.value;
                    if (!d) {
                        Swal.showValidationMessage('Debes seleccionar la fecha de cobro.');
                        return null;
                    }
                    return d;
                }
            });

            if (!fCobro) return;
            fecha = fCobro;
        }

        this._pedidosService
            .actualizarFacturacionFila(this.pedidoId, fila.id, {
                concepto: fila.concepto,
                fechaProgramada: fila.fechaProgramada,
                monto: fila.monto,
                estatus: 'Cobrada',
                folioFactura: fila.folioFactura,
                fechaFactura: fila.fechaFactura,
                fechaCobro: fecha
            })
            .subscribe({
                next: (act) => {
                    Object.assign(fila, act);
                    if (this.pedido?.facturacion) {
                        this.pedido.facturacion.cobrado = this.facturacionCobrado;
                    }
                    Swal.fire({ icon: 'success', title: 'Cobro registrado', timer: 1500, showConfirmButton: false });
                    this._cdr.markForCheck();
                },
                error: (err) => {
                    const msg = err?.error?.mensaje || 'No se pudo registrar el cobro.';
                    Swal.fire({ icon: 'error', title: 'Error', text: msg });
                }
            });
    }

    async cancelarFacturaFila(fila: FacturacionFila): Promise<void> {
        const confirm = await Swal.fire({
            title: `¿Cancelar factura «${fila.concepto}»?`,
            text: 'La fila quedará con estatus Cancelada y liberará el monto pendiente.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cancelar fila',
            cancelButtonText: 'No',
            confirmButtonColor: '#dc2626'
        });

        if (!confirm.isConfirmed) return;

        this._pedidosService
            .actualizarFacturacionFila(this.pedidoId, fila.id, {
                concepto: fila.concepto,
                fechaProgramada: fila.fechaProgramada,
                monto: fila.monto,
                estatus: 'Cancelada'
            })
            .subscribe({
                next: (act) => {
                    Object.assign(fila, act);
                    Swal.fire({ icon: 'info', title: 'Factura cancelada', timer: 1500, showConfirmButton: false });
                    this._cdr.markForCheck();
                },
                error: (err) => {
                    const msg = err?.error?.mensaje || 'No se pudo cancelar la fila.';
                    Swal.fire({ icon: 'error', title: 'Error', text: msg });
                }
            });
    }

    // ==================== SEGUIMIENTO Y BITÁCORA (F5) ====================
    cargarBitacora(page: number = 1): void {
        this.cargandoBitacora = true;
        this.bitacoraPage = page;
        this._pedidosService.obtenerBitacora(this.pedidoId, page, this.bitacoraSize).subscribe({
            next: (items) => {
                this.cargandoBitacora = false;
                this.bitacoraItems = items || [];
                this._cdr.markForCheck();
            },
            error: () => {
                this.cargandoBitacora = false;
                this._cdr.markForCheck();
            }
        });
    }

    agregarNotaBitacora(): void {
        if (this.guardandoBitacora || !this.nuevaBitacoraTexto || this.nuevaBitacoraTexto.trim().length < 5) {
            Swal.fire({
                icon: 'warning',
                title: 'Texto requerido',
                text: 'La nota de bitácora debe tener al menos 5 caracteres.'
            });
            return;
        }

        this.guardandoBitacora = true;
        this._pedidosService
            .agregarBitacora(this.pedidoId, {
                tipo: this.nuevaBitacoraTipo as any,
                texto: this.nuevaBitacoraTexto
            })
            .subscribe({
                next: () => {
                    this.guardandoBitacora = false;
                    this.nuevaBitacoraTexto = '';
                    Swal.fire({ icon: 'success', title: 'Nota agregada', timer: 1500, showConfirmButton: false });
                    this.cargarBitacora(1);
                },
                error: (err) => {
                    this.guardandoBitacora = false;
                    const msg = err?.error?.mensaje || 'No se pudo registrar en bitácora.';
                    Swal.fire({ icon: 'error', title: 'Error', text: msg });
                    this._cdr.markForCheck();
                }
            });
    }

    // Transiciones de Ciclo de Vida
    async iniciarEjecucion(): Promise<void> {
        if (this.ejecutandoAccionEstatus) return;

        const confirm = await Swal.fire({
            title: '¿Iniciar ejecución del pedido?',
            text: 'El pedido pasará a estatus «En ejecución».',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, iniciar ejecución',
            cancelButtonText: 'Cancelar'
        });

        if (!confirm.isConfirmed) return;

        this.ejecutandoAccionEstatus = true;
        this._pedidosService.iniciarEjecucion(this.pedidoId).subscribe({
            next: () => {
                this.ejecutandoAccionEstatus = false;
                Swal.fire({ icon: 'success', title: 'Pedido en ejecución', timer: 1500, showConfirmButton: false });
                this.cargarPedido();
            },
            error: (err) => {
                this.ejecutandoAccionEstatus = false;
                const msg = err?.error?.mensaje || 'No se pudo iniciar la ejecución.';
                Swal.fire({ icon: 'error', title: 'Error', text: msg });
                this._cdr.markForCheck();
            }
        });
    }

    async entregarPedido(fechaDirecta?: string, comentarioDirecto?: string): Promise<void> {
        if (this.ejecutandoAccionEstatus) return;

        let fecha = fechaDirecta;
        let comentario = comentarioDirecto;

        if (!fecha && fechaDirecta === undefined) {
            const { value: formVals } = await Swal.fire({
                title: 'Entregar Pedido',
                html: `
                    <div class="flex flex-col gap-3 text-left">
                        <label class="text-xs font-semibold">Fecha de Entrega (opcional, hoy por omisión)</label>
                        <input id="swal-fecha-entrega" type="date" class="swal2-input !m-0 !w-full" />
                        <label class="text-xs font-semibold mt-2">Comentario de Entrega (opcional)</label>
                        <textarea id="swal-comentario-entrega" class="swal2-textarea !m-0 !w-full" placeholder="Detalles de recepción o entrega..."></textarea>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Marcar Entregado',
                cancelButtonText: 'Cancelar',
                preConfirm: () => {
                    const f = (document.getElementById('swal-fecha-entrega') as HTMLInputElement)?.value;
                    const c = (document.getElementById('swal-comentario-entrega') as HTMLTextAreaElement)?.value;
                    return { fecha: f || undefined, comentario: c || undefined };
                }
            });

            if (!formVals) return;
            fecha = formVals.fecha;
            comentario = formVals.comentario;
        }

        this.ejecutandoAccionEstatus = true;
        this._pedidosService.entregar(this.pedidoId, { fechaEntrega: fecha, comentario }).subscribe({
            next: () => {
                this.ejecutandoAccionEstatus = false;
                Swal.fire({ icon: 'success', title: 'Pedido entregado', timer: 1500, showConfirmButton: false });
                this.cargarPedido();
            },
            error: (err) => {
                this.ejecutandoAccionEstatus = false;
                const msg = err?.error?.mensaje || 'No se pudo marcar como entregado.';
                Swal.fire({ icon: 'error', title: 'Error', text: msg });
                this._cdr.markForCheck();
            }
        });
    }

    async reabrirEjecucion(comentarioDirecto?: string): Promise<void> {
        if (this.ejecutandoAccionEstatus) return;

        let comentario = comentarioDirecto;
        if (!comentario) {
            const { value: motivo } = await Swal.fire({
                title: 'Reabrir Ejecución del Pedido',
                input: 'textarea',
                inputLabel: 'Motivo de reapertura (obligatorio, mínimo 10 caracteres)',
                inputPlaceholder: 'Indica la razón por la cual se reabre el pedido entregado...',
                inputValidator: (val) => {
                    if (!val || val.trim().length < 10) {
                        return 'Debes ingresar un motivo de al menos 10 caracteres.';
                    }
                    return null;
                },
                showCancelButton: true,
                confirmButtonText: 'Reabrir pedido',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#eab308'
            });

            if (!motivo) return;
            comentario = motivo;
        }

        this.ejecutandoAccionEstatus = true;
        this._pedidosService.reabrirEjecucion(this.pedidoId, { comentario }).subscribe({
            next: () => {
                this.ejecutandoAccionEstatus = false;
                Swal.fire({ icon: 'info', title: 'Pedido reabierto', timer: 1500, showConfirmButton: false });
                this.cargarPedido();
            },
            error: (err) => {
                this.ejecutandoAccionEstatus = false;
                const msg = err?.error?.mensaje || 'No se pudo reabrir la ejecución.';
                Swal.fire({ icon: 'error', title: 'Error', text: msg });
                this._cdr.markForCheck();
            }
        });
    }

    async cerrarPedido(comentarioDirecto?: string, condicionesCumplidas: boolean = true): Promise<void> {
        if (!this.pedido?.permisos?.puedeCerrar || this.ejecutandoAccionEstatus) return;

        let comentario = comentarioDirecto;
        if (!comentario) {
            const { value: formVals } = await Swal.fire({
                title: 'Cerrar Pedido (SGC 7.10)',
                html: `
                    <div class="flex flex-col gap-3 text-left">
                        <label class="flex items-center gap-2">
                            <input id="swal-condiciones" type="checkbox" checked />
                            <span class="text-xs font-semibold">Todas las condiciones comerciales y técnicas se han cumplido</span>
                        </label>
                        <label class="text-xs font-semibold mt-2">Comentario de Cierre (obligatorio, mínimo 10 caracteres)</label>
                        <textarea id="swal-comentario-cierre" class="swal2-textarea !m-0 !w-full" placeholder="Comentario de conformidad final..."></textarea>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Cerrar Pedido',
                cancelButtonText: 'Cancelar',
                preConfirm: () => {
                    const chk = (document.getElementById('swal-condiciones') as HTMLInputElement)?.checked;
                    const c = (document.getElementById('swal-comentario-cierre') as HTMLTextAreaElement)?.value;
                    if (!chk) {
                        Swal.showValidationMessage('Debes confirmar el cumplimiento de condiciones.');
                        return null;
                    }
                    if (!c || c.trim().length < 10) {
                        Swal.showValidationMessage('El comentario de cierre debe tener al menos 10 caracteres.');
                        return null;
                    }
                    return { condiciones: chk, comentario: c };
                }
            });

            if (!formVals) return;
            comentario = formVals.comentario;
            condicionesCumplidas = formVals.condiciones;
        }

        this.ejecutandoAccionEstatus = true;
        this.faltantesCierre = [];

        this._pedidosService
            .cerrar(this.pedidoId, {
                condicionesCumplidas,
                comentario
            })
            .subscribe({
                next: () => {
                    this.ejecutandoAccionEstatus = false;
                    Swal.fire({ icon: 'success', title: 'Pedido cerrado', timer: 2000, showConfirmButton: false });
                    this.cargarPedido();
                },
                error: (err) => {
                    this.ejecutandoAccionEstatus = false;
                    const msg = err?.error?.mensaje || 'No se pudo cerrar el pedido.';
                    this.faltantesCierre = err?.error?.faltantes || [msg];
                    Swal.fire({ icon: 'warning', title: 'Cierre no completado', text: msg });
                    this._cdr.markForCheck();
                }
            });
    }

    async cancelarPedido(motivoDirecto?: string): Promise<void> {
        if (!this.pedido?.permisos?.puedeCancelar || this.ejecutandoAccionEstatus) return;

        let motivo = motivoDirecto;
        if (!motivo) {
            const { value } = await Swal.fire({
                title: `¿Cancelar el pedido ${this.pedido.folio}?`,
                input: 'textarea',
                inputLabel: 'Motivo de la cancelación (obligatorio, 10 a 1000 caracteres)',
                inputPlaceholder: 'Ingresa la razón por la que se cancela este pedido...',
                inputValidator: (val) => {
                    if (!val || val.trim().length < 10) {
                        return 'Debes ingresar un motivo de al menos 10 caracteres.';
                    }
                    return null;
                },
                showCancelButton: true,
                confirmButtonText: 'Sí, cancelar pedido',
                cancelButtonText: 'Volver',
                confirmButtonColor: '#dc2626'
            });

            if (!value) return;
            motivo = value;
        }

        this.ejecutandoAccionEstatus = true;
        this._pedidosService.cancelar(this.pedidoId, { motivo }).subscribe({
            next: () => {
                this.ejecutandoAccionEstatus = false;
                Swal.fire({ icon: 'info', title: 'Pedido cancelado', timer: 2000, showConfirmButton: false });
                this.cargarPedido();
            },
            error: (err) => {
                this.ejecutandoAccionEstatus = false;
                const msg = err?.error?.mensaje || 'No se pudo cancelar el pedido.';
                Swal.fire({ icon: 'error', title: 'Error al cancelar', text: msg });
                this._cdr.markForCheck();
            }
        });
    }

    // ==================== MODIFICACIONES (F5) ====================
    registrarModificacion(): void {
        if (this.registrandoModificacion) return;

        if (!this.nuevaModDescripcion || this.nuevaModDescripcion.trim().length < 10) {
            Swal.fire({
                icon: 'warning',
                title: 'Descripción requerida',
                text: 'La descripción de la modificación debe tener al menos 10 caracteres.'
            });
            return;
        }

        const impacto = Number(this.nuevaModImpactoEconomico || 0);

        this.registrandoModificacion = true;
        this._pedidosService
            .registrarModificacion(this.pedidoId, {
                descripcion: this.nuevaModDescripcion,
                impactoTecnico: this.nuevaModImpactoTecnico || undefined,
                impactoEconomico: impacto,
                requiereActualizarCotizacion: this.nuevaModRequiereCotizacion,
                cotizacionActualizadaFolio: this.nuevaModRequiereCotizacion ? this.nuevaModCotizacionFolio : undefined
            })
            .subscribe({
                next: (nuevaMod) => {
                    this.registrandoModificacion = false;
                    this.nuevaModDescripcion = '';
                    this.nuevaModImpactoTecnico = '';
                    this.nuevaModImpactoEconomico = 0;
                    this.nuevaModRequiereCotizacion = false;
                    this.nuevaModCotizacionFolio = '';
                    if (this.pedido) {
                        this.pedido.modificaciones = [...(this.pedido.modificaciones || []), nuevaMod];
                    }
                    Swal.fire({ icon: 'success', title: 'Modificación registrada', timer: 1500, showConfirmButton: false });
                    this._cdr.markForCheck();
                },
                error: (err) => {
                    this.registrandoModificacion = false;
                    const msg = err?.error?.mensaje || 'No se pudo registrar la modificación.';
                    Swal.fire({ icon: 'error', title: 'Error', text: msg });
                    this._cdr.markForCheck();
                }
            });
    }

    async aprobarModificacion(
        mod: PedidoModificacionItem,
        referenciaDirecta?: string,
        fechaDirecta?: string
    ): Promise<void> {
        let referencia = referenciaDirecta;
        let fecha = fechaDirecta;

        if (!referencia || !fecha) {
            const { value: formVals } = await Swal.fire({
                title: `Aprobar Modificación #${mod.consecutivo}`,
                html: `
                    <div class="flex flex-col gap-3 text-left">
                        <label class="text-xs font-semibold">Referencia de Aprobación del Cliente (mínimo 5 caracteres)</label>
                        <input id="swal-ref-aprobacion" class="swal2-input !m-0 !w-full" placeholder="Correo / Adendum / Minuta" />
                        <label class="text-xs font-semibold mt-2">Fecha de Aprobación</label>
                        <input id="swal-fecha-aprobacion" type="date" class="swal2-input !m-0 !w-full" />
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Aprobar por cliente',
                cancelButtonText: 'Cancelar',
                preConfirm: () => {
                    const r = (document.getElementById('swal-ref-aprobacion') as HTMLInputElement)?.value;
                    const d = (document.getElementById('swal-fecha-aprobacion') as HTMLInputElement)?.value;
                    if (!r || r.trim().length < 5) {
                        Swal.showValidationMessage('La referencia debe tener al menos 5 caracteres.');
                        return null;
                    }
                    if (!d) {
                        Swal.showValidationMessage('Debes seleccionar la fecha de aprobación.');
                        return null;
                    }
                    return { referencia: r, fecha: d };
                }
            });

            if (!formVals) return;
            referencia = formVals.referencia;
            fecha = formVals.fecha;
        }

        this._pedidosService
            .aprobarModificacionCliente(this.pedidoId, mod.id, {
                referencia,
                fecha
            })
            .subscribe({
                next: () => {
                    mod.estatus = 'AprobadaPorCliente';
                    mod.referenciaAprobacion = referencia;
                    mod.fechaAprobacion = fecha;
                    Swal.fire({ icon: 'success', title: 'Modificación aprobada', timer: 1500, showConfirmButton: false });
                    this._cdr.markForCheck();
                },
                error: (err) => {
                    const msg = err?.error?.mensaje || 'No se pudo aprobar la modificación.';
                    Swal.fire({ icon: 'error', title: 'Error', text: msg });
                }
            });
    }

    async aplicarModificacion(mod: PedidoModificacionItem): Promise<void> {
        const confirm = await Swal.fire({
            title: `¿Aplicar modificación #${mod.consecutivo}?`,
            text: `Se impactará el monto del pedido en $${mod.impactoEconomico.toFixed(2)}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, aplicar',
            cancelButtonText: 'Cancelar'
        });

        if (!confirm.isConfirmed) return;

        this._pedidosService.aplicarModificacion(this.pedidoId, mod.id).subscribe({
            next: () => {
                mod.estatus = 'Aplicada';
                if (this.pedido) {
                    this.pedido.montoPedido += mod.impactoEconomico;
                }
                Swal.fire({ icon: 'success', title: 'Modificación aplicada', timer: 1500, showConfirmButton: false });
                this.cargarPedido();
            },
            error: (err) => {
                const msg = err?.error?.mensaje || 'No se pudo aplicar la modificación.';
                Swal.fire({ icon: 'error', title: 'Error', text: msg });
            }
        });
    }

    async cancelarModificacion(mod: PedidoModificacionItem, motivoDirecto?: string): Promise<void> {
        let motivo = motivoDirecto;
        if (!motivo) {
            const { value } = await Swal.fire({
                title: `Cancelar modificación #${mod.consecutivo}`,
                input: 'textarea',
                inputLabel: 'Motivo de la cancelación',
                inputPlaceholder: 'Ingresa el motivo...',
                showCancelButton: true,
                confirmButtonText: 'Cancelar modificación',
                cancelButtonText: 'Volver',
                confirmButtonColor: '#dc2626'
            });

            if (!value) return;
            motivo = value;
        }

        this._pedidosService.cancelarModificacion(this.pedidoId, mod.id, motivo).subscribe({
            next: () => {
                mod.estatus = 'Cancelada';
                Swal.fire({ icon: 'info', title: 'Modificación cancelada', timer: 1500, showConfirmButton: false });
                this._cdr.markForCheck();
            },
            error: (err) => {
                const msg = err?.error?.mensaje || 'No se pudo cancelar la modificación.';
                Swal.fire({ icon: 'error', title: 'Error', text: msg });
            }
        });
    }

    obtenerClaseEstatus(estatus: string): string {
        switch (estatus) {
            case 'Recibido':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'EnValidacion':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
            case 'Validado':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
            case 'Liberado':
                return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200';
            case 'EnEjecucion':
                return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
            case 'Entregado':
                return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
            case 'Cerrado':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'Cancelado':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
        }
    }
}
