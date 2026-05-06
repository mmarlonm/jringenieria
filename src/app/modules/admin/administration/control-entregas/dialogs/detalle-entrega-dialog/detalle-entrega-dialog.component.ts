import { Component, Inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Subject, takeUntil } from 'rxjs';
import { ControlEntregasService } from '../../control-entregas.service';
import { MaterialEntregaDto, RegistroEntregaDto } from '../../models/control-entregas.types';
import { EntregaFormDialogComponent } from '../entrega-form-dialog/entrega-form-dialog.component';
import Swal from 'sweetalert2';

@Component({
    selector: 'detalle-entrega-dialog',
    templateUrl: './detalle-entrega-dialog.component.html',
    standalone: true,
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatDialogModule,
        MatIconModule,
        MatTableModule,
        MatTooltipModule,
        MatProgressSpinnerModule,
        MatFormFieldModule,
        MatInputModule
    ]
})
export class DetalleEntregaDialogComponent implements OnInit, OnDestroy {
    
    dataSource: MatTableDataSource<MaterialEntregaDto> = new MatTableDataSource();
    displayedColumns: string[] = ['producto', 'cantidadFacturada', 'entregado', 'saldo', 'estatus', 'acciones'];
    dynamicColumns: string[] = [];
    maxSurtidos: number = 0;
    isLoading: boolean = false;
    folio: string;
    tempFolio: string = '';

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    idFacturaMaestro: number = 0;
    nombreCliente: string = '';
    fechaFacturacion: string = new Date().toISOString().split('T')[0];
    isNewSyncMode: boolean = false;
    isReadOnly: boolean = false;

    constructor(
        public dialogRef: MatDialogRef<DetalleEntregaDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { folio: string, readOnly?: boolean },
        private _controlEntregasService: ControlEntregasService,
        private _dialog: MatDialog
    ) {
        this.folio = data.folio;
        this.tempFolio = data.folio;
        this.isReadOnly = data.readOnly || false;
    }

    ngOnInit(): void {
        if (this.folio) {
            this.buscarDetalle(false);
        }
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    sincronizarFolio(): void {
        if (!this.tempFolio.trim()) {
            Swal.fire('Atención', 'Ingresa un folio de factura válido.', 'warning');
            return;
        }
        this.folio = this.tempFolio;
        this.buscarDetalle(true); 
    }

    buscarDetalle(isNewSync: boolean = false): void {
        if (!this.folio) return;

        this.isNewSyncMode = isNewSync;
        this.isLoading = true;
        const request$ = isNewSync 
            ? this._controlEntregasService.obtenerMaterialesPorFolio(this.folio)
            : this._controlEntregasService.obtenerDetalleEntregas(this.folio);

        request$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (materiales) => {
                    // Guardamos el valor original para detectar incrementos al actualizar
                    materiales.forEach(m => {
                        (m as any)._originalAcumulado = m.surtidoAcumulado || 0;
                    });
                    
                    this.dataSource.data = materiales;
                    this._setupDynamicColumns(materiales);
                    this.isLoading = false;

                    if (materiales.length > 0) {
                        const m = materiales[0];
                        // Solo actualizamos el nombre si es una sincronización nueva
                        if (isNewSync) {
                            this.nombreCliente = m.nombreCliente;
                        } else {
                            // Si ya existe, intentamos obtener el idMaestro
                            // Nota: En una implementación real, el DTO debería traer el idFacturaMaestro
                            // Por ahora lo buscamos en el primer material si estuviera ahí
                            // o lo manejamos mediante el servicio si fuera necesario.
                            // Para propósitos de este ejercicio, asumiremos que viene en el DTO o lo buscamos
                            this.nombreCliente = m.nombreCliente;
                        }
                    }

                    // Intentar obtener el ID del maestro desde el servicio/datos
                    if (!isNewSync) {
                        this._controlEntregasService.obtenerMaestroEntregas().subscribe(maestros => {
                            const maestro = maestros.find(x => x.folio === this.folio);
                            if (maestro) {
                                this.idFacturaMaestro = maestro.idFacturaMaestro || 0;
                                if (maestro.fechaFacturacion) {
                                    this.fechaFacturacion = new Date(maestro.fechaFacturacion).toISOString().split('T')[0];
                                }
                            }
                        });
                    }
                },
                error: () => {
                    this.isLoading = false;
                    Swal.fire('Error', 'No se pudo obtener el detalle.', 'error');
                }
            });
    }

    guardarConfiguracion(): void {
        if (this.dataSource.data.length === 0) return;

        const userObjStr = localStorage.getItem('userInformation');
        let idUsuario = 0;
        if (userObjStr) {
            try {
                const userObj = JSON.parse(userObjStr);
                idUsuario = userObj?.usuario?.id || 0;
            } catch (e) {}
        }

        // Construir el objeto Maestro para el backend con partidas y surtidos anidados
        const maestro = {
            folioFactura: this.folio,
            nombreCliente: this.nombreCliente,
            fechaFacturacion: this.fechaFacturacion,
            sincronizadoDesdeContpaq: true,
            createdBy: idUsuario,
            partidas: this.dataSource.data.map(m => {
                const partida: any = {
                    numeroPartida: m.numeroPartida,
                    codigoProducto: m.codigoProducto ? m.codigoProducto.substring(0, 50) : '',
                    descripcion: m.descripcion,
                    cantidadFacturada: m.cantidadFacturada,
                    surtidos: []
                };

                // Si se capturó una entrega inicial en la tabla, la incluimos
                if (m.surtidoAcumulado > 0) {
                    partida.surtidos.push({
                        cantidadEntregada: m.surtidoAcumulado,
                        idUsuarioAlmacen: idUsuario,
                        observaciones: 'Surtido inicial al configurar'
                    });
                }

                return partida;
            })
        };

        this.isLoading = true;
        this._controlEntregasService.crearConfiguracion(maestro).subscribe({
            next: () => {
                this.isLoading = false;
                this.isNewSyncMode = false;
                Swal.fire('¡Éxito!', 'Configuración y entregas iniciales guardadas.', 'success');
                this.buscarDetalle(false); 
            },
            error: (err) => {
                this.isLoading = false;
                const msg = err.error?.message || 'Error al guardar la configuración';
                Swal.fire('Error', msg, 'error');
            }
        });
    }

    actualizarConfiguracion(): void {
        const userObjStr = localStorage.getItem('userInformation');
        let idUsuario = 0;
        if (userObjStr) {
            try {
                const userObj = JSON.parse(userObjStr);
                idUsuario = userObj?.usuario?.id || 0;
            } catch (e) {}
        }

        const maestro = {
            idFacturaMaestro: this.idFacturaMaestro,
            folioFactura: this.folio,
            nombreCliente: this.nombreCliente,
            fechaFacturacion: this.fechaFacturacion,
            updatedBy: idUsuario,
            partidas: this.dataSource.data.map(m => {
                const partida: any = {
                    idPartida: m.idPartida,
                    idFacturaMaestro: this.idFacturaMaestro,
                    numeroPartida: m.numeroPartida,
                    codigoProducto: m.codigoProducto ? m.codigoProducto.substring(0, 50) : '',
                    descripcion: m.descripcion,
                    cantidadFacturada: m.cantidadFacturada,
                    surtidos: []
                };

                // Si hubo un incremento manual en la columna "Piezas Enviadas",
                // lo registramos como un nuevo surtido (idSurtido: 0)
                // Nota: Necesitamos comparar contra el acumulado original que trajo el API
                // Por ahora, si es mayor al que cargamos inicialmente, mandamos la diferencia.
                // Buscamos el original en la carga inicial (podríamos guardarlo en una propiedad oculta)
                const originalAcumulado = (m as any)._originalAcumulado || 0;
                if (m.surtidoAcumulado > originalAcumulado) {
                    partida.surtidos.push({
                        idSurtido: 0,
                        cantidadEntregada: m.surtidoAcumulado - originalAcumulado,
                        idUsuarioAlmacen: idUsuario,
                        observaciones: 'Actualización manual de control físico'
                    });
                }

                return partida;
            })
        };

        this.isLoading = true;
        this._controlEntregasService.actualizarConfiguracion(idUsuario, maestro).subscribe({
            next: () => {
                this.isLoading = false;
                Swal.fire('¡Actualizado!', 'Registro y control físico actualizados correctamente.', 'success');
                this.buscarDetalle(false); // Recargar para obtener los nuevos acumulados del server
            },
            error: () => {
                this.isLoading = false;
                Swal.fire('Error', 'No se pudo actualizar el registro.', 'error');
            }
        });
    }

    recalcularDesdeEnviado(row: MaterialEntregaDto): void {
        row.surtidoPendiente = Math.max(0, row.cantidadFacturada - row.surtidoAcumulado);
        this._updateStatus(row);
    }

    recalcularDesdeFaltante(row: MaterialEntregaDto): void {
        row.surtidoAcumulado = Math.max(0, row.cantidadFacturada - row.surtidoPendiente);
        this._updateStatus(row);
    }

    private _updateStatus(row: MaterialEntregaDto): void {
        if (row.surtidoPendiente <= 0) {
            row.status = 'COMPLETO';
        } else if (row.surtidoAcumulado > 0) {
            row.status = 'PARCIAL';
        } else {
            row.status = 'PENDIENTE';
        }
    }

    confirmarEnvioRapido(row: MaterialEntregaDto): void {
        Swal.fire({
            title: 'Confirmar Envío',
            text: `¿Registrar el envío físico de las piezas faltantes (${row.surtidoPendiente})?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, enviar todo',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                const userObjStr = localStorage.getItem('userInformation');
                let idUsuario = 0;
                if (userObjStr) {
                    try {
                        const userObj = JSON.parse(userObjStr);
                        idUsuario = userObj?.usuario?.id || 0;
                    } catch (e) {}
                }

                const payload: RegistroEntregaDto = {
                    idPartida: row.idPartida,
                    cantidadEntregada: row.surtidoPendiente,
                    idUsuarioAlmacen: idUsuario,
                    observaciones: 'Envío total del faltante'
                };

                this.isLoading = true;
                this._controlEntregasService.registrarEntrega(payload).subscribe({
                    next: () => {
                        this.isLoading = false;
                        Swal.fire('¡Enviado!', 'Se ha registrado la entrega.', 'success');
                        this.buscarDetalle(false);
                    },
                    error: () => {
                        this.isLoading = false;
                        Swal.fire('Error', 'No se pudo registrar el envío.', 'error');
                    }
                });
            }
        });
    }

    private _setupDynamicColumns(materiales: MaterialEntregaDto[]): void {
        this.maxSurtidos = Math.max(0, ...materiales.map(m => m.historialSurtidos?.length || 0));
        this.dynamicColumns = [];
        for (let i = 1; i <= this.maxSurtidos; i++) {
            this.dynamicColumns.push(`surtido_${i}`);
        }

        this.displayedColumns = [
            'producto',
            ...this.dynamicColumns,
            'cantidadFacturada',
            'entregado',
            'saldo',
            'estatus',
            'acciones'
        ];
    }

    registrarEntrega(material: MaterialEntregaDto): void {
        const dialogRef = this._dialog.open(EntregaFormDialogComponent, {
            data: { material },
            width: '100%',
            maxWidth: '500px',
            autoFocus: false
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this._ejecutarRegistro(material, result);
            }
        });
    }

    ejecutarEntregaRapida(material: MaterialEntregaDto, input: HTMLInputElement): void {
        const cantidad = parseFloat(input.value);
        if (isNaN(cantidad) || cantidad <= 0) return;

        if (cantidad > material.surtidoPendiente) {
            Swal.fire('Atención', 'La cantidad no puede exceder el faltante.', 'warning');
            return;
        }

        const userObjStr = localStorage.getItem('userInformation');
        let idUsuario = 0;
        if (userObjStr) {
            try {
                const userObj = JSON.parse(userObjStr);
                idUsuario = userObj?.usuario?.id || 0;
            } catch (e) {}
        }

        const payload: RegistroEntregaDto = {
            idPartida: material.idPartida,
            cantidadEntregada: cantidad,
            idUsuarioAlmacen: idUsuario,
            observaciones: 'Entrega rápida desde tablero'
        };

        this.isLoading = true;
        this._controlEntregasService.registrarEntrega(payload).subscribe({
            next: () => {
                Swal.fire({
                    title: '¡Éxito!',
                    text: 'Entrega registrada',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                input.value = '';
                this.buscarDetalle();
            },
            error: (err) => {
                this.isLoading = false;
                const msg = err.error?.message || 'Error al registrar';
                Swal.fire('Atención', msg, 'warning');
            }
        });
    }

    private _ejecutarRegistro(material: MaterialEntregaDto, datos: any): void {
        const userObjStr = localStorage.getItem('userInformation');
        let idUsuario = 0;
        if (userObjStr) {
            try {
                const userObj = JSON.parse(userObjStr);
                idUsuario = userObj?.usuario?.id || 0;
            } catch (e) {}
        }

        const payload: RegistroEntregaDto = {
            idPartida: material.idPartida,
            cantidadEntregada: datos.cantidadAEntregar,
            idUsuarioAlmacen: idUsuario,
            observaciones: datos.observaciones
        };

        this.isLoading = true;
        this._controlEntregasService.registrarEntrega(payload).subscribe({
            next: () => {
                Swal.fire({
                    title: '¡Éxito!',
                    text: 'Entrega registrada correctamente',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
                this.buscarDetalle();
            },
            error: (err) => {
                this.isLoading = false;
                const msg = err.error?.message || 'Error al registrar';
                Swal.fire('Atención', msg, 'warning');
            }
        });
    }

    getStatusClass(status: string): string {
        switch (status) {
            case 'COMPLETO': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'PARCIAL': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'PENDIENTE': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    }

    close(): void {
        this.dialogRef.close();
    }
}
