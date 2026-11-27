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
