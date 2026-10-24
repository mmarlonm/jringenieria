import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Subject, takeUntil } from 'rxjs';
import { CotizacionEtapasService } from '../cotizacion-etapas.service';
import { EngineeringService } from '../../engineering.service';
import { UsersService } from 'app/modules/admin/security/users/users.service';
import { SubcontratacionService, SubcontratistaPersonal } from '../../subcontratacion.service';
import {
    CotizacionEtapasDetalleDto,
    CotizacionEtapaDto,
    CotizacionEtapasRevisionDto,
    CotizacionEtapasArchivoDto,
    ESTATUS_ETAPA,
    GuardarEtapaDto,
    CambiarEstatusDto
} from '../cotizacion-etapas.models';
import { EtapaConfig, obtenerEtapaConfig } from '../etapas.config';
import { puedeAutorizar } from '../etapa-permisos.utils';

export interface EtapaDetalleDialogData {
    idSeguimiento: number;
    etapa: number;
}

@Component({
    selector: 'app-etapa-detalle-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatTabsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatRadioModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatTooltipModule,
        MatProgressBarModule
    ],
    templateUrl: './etapa-detalle-dialog.component.html',
    styleUrls: ['./etapa-detalle-dialog.component.scss']
})
export class EtapaDetalleDialogComponent implements OnInit, OnDestroy {
    idSeguimiento: number;
    etapaNumero: number;
    etapaConfig?: EtapaConfig;
    detalle?: CotizacionEtapasDetalleDto;
    etapaActualDto?: CotizacionEtapaDto;

    form: FormGroup;
    cargando = false;
    guardando = false;
    errorMsg: string | null = null;
    huboCambios = false;

    usuariosJr: any[] = [];
    aliados: SubcontratistaPersonal[] = [];

    // Archivos
    revisionSeleccionadaArchivos: number = 1;
    archivosLista: CotizacionEtapasArchivoDto[] = [];
    cargandoArchivos = false;

    // Modales internos simples para autorizar / rechazar / cancelar
    modalAutorizarAbierto = false;
    etapaSiguienteSeleccionada: number | null = null;
    montoAutorizacion: number | null = null;

    modalRechazarAbierto = false;
    motivoRechazoTexto = '';

    modalCancelarAbierto = false;
    motivoCancelacionTexto = '';

    private readonly _unsubscribeAll = new Subject<void>();

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: EtapaDetalleDialogData,
        private readonly _dialogRef: MatDialogRef<EtapaDetalleDialogComponent>,
        private readonly _fb: FormBuilder,
        private readonly _service: CotizacionEtapasService,
        private readonly _engineeringService: EngineeringService,
        private readonly _usersService: UsersService,
        private readonly _subcontratacionService: SubcontratacionService
    ) {
        this.idSeguimiento = data.idSeguimiento;
        this.etapaNumero = data.etapa;
        this.etapaConfig = obtenerEtapaConfig(this.etapaNumero);

        this.form = this._fb.group({
            responsableUsuarioId: [null],
            esAliado: [false],
            autorizadorDesignadoUsuarioId: [null],
            informacionBrindada: [null],
            fechaProgramada: [null],
            montoTotalEstimado: [null],
            notas: [''],
            queCambioUltimaRevision: ['']
        });
    }

    ngOnInit(): void {
        this._cargarCatalogos();
        this.cargarDetalle();
    }

    onTipoResponsableChange(): void {
        this.form.get('responsableUsuarioId')?.setValue(null);
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    get usuarioActualId(): number {
        try {
            const info = JSON.parse(localStorage.getItem('userInformation') || '{}');
            return info?.usuario?.usuarioId || info?.usuario?.id || 1;
        } catch {
            return 1;
        }
    }

    get esAdmin(): boolean {
        try {
            const info = JSON.parse(localStorage.getItem('userInformation') || '{}');
            const rol = (info?.usuario?.rol || info?.rol || '').toUpperCase();
            return rol === 'ADMIN' || rol === 'ADMINISTRADOR' || rol === 'SUPERADMIN';
        } catch {
            return false;
        }
    }

    get puedeAutorizarAccion(): boolean {
        return puedeAutorizar(this.etapaActualDto, this.usuarioActualId, this.esAdmin);
    }

    get ultimaRevision(): CotizacionEtapasRevisionDto | undefined {
        if (!this.etapaActualDto?.revisiones?.length) return undefined;
        return [...this.etapaActualDto.revisiones].sort((a, b) => b.numero - a.numero)[0];
    }

    puedeIniciarRevision(): boolean {
        if (this.detalle?.cancelado) return false;
        const ult = this.ultimaRevision;
        return !!ult && ult.resultado === ESTATUS_ETAPA.Rechazada;
    }

    puedeGuardarRevision(): boolean {
        const ult = this.ultimaRevision;
        if (ult && ult.numero >= 2 && !ult.queCambio) {
            const texto = this.form.get('queCambioUltimaRevision')?.value;
            return !!texto && texto.trim().length > 0;
        }
        return true;
    }

    private _cargarCatalogos(): void {
        this._usersService.getUsers()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (res) => (this.usuariosJr = res || []),
                error: (err) => console.error(err)
            });

        this._subcontratacionService.getPersonal()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (res) => (this.aliados = (res || []).filter((p) => p.activo !== false)),
                error: (err) => console.error(err)
            });
    }

    cargarDetalle(): void {
        this.cargando = true;
        this.errorMsg = null;

        this._service.obtener(this.idSeguimiento)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (det) => {
                    this.cargando = false;
                    this.detalle = det;
                    this.etapaActualDto = det.etapas?.find((e) => e.etapa === this.etapaNumero);

                    if (this.etapaActualDto) {
                        const esAliado = !!(this.etapaActualDto.responsableAliadoId || (this.etapaActualDto as any).esAliado);
                        const respId = esAliado
                            ? (this.etapaActualDto.responsableAliadoId ?? null)
                            : (this.etapaActualDto.responsableUsuarioId ?? null);

                        this.form.patchValue({
                            responsableUsuarioId: respId,
                            esAliado: esAliado,
                            autorizadorDesignadoUsuarioId: this.etapaActualDto.autorizadorDesignadoUsuarioId ?? (this.etapaActualDto as any).autorizaUsuarioId ?? null,
                            informacionBrindada: this.etapaActualDto.informacionBrindada ?? (this.etapaActualDto as any).informacionSuficiente ?? null,
                            fechaProgramada: this.etapaActualDto.fechaProgramada ? new Date(this.etapaActualDto.fechaProgramada) : null,
                            montoTotalEstimado: this.etapaActualDto.montoTotalEstimado ?? this.ultimaRevision?.monto ?? null,
                            notas: this.etapaActualDto.notas ?? (this.etapaActualDto as any).observacionesInformacion ?? '',
                            queCambioUltimaRevision: ''
                        }, { emitEvent: false });

                        const ult = this.ultimaRevision;
                        if (ult) {
                            this.revisionSeleccionadaArchivos = ult.numero;
                            this.cargarArchivos();
                        }
                    }
                },
                error: (err) => {
                    this.cargando = false;
                    this.errorMsg = err?.error?.mensaje || 'Error al obtener detalle del caso.';
                }
            });
    }

    guardar(): void {
        if (!this.puedeGuardarRevision()) return;

        this.guardando = true;
        this.errorMsg = null;

        const val = this.form.value;
        const dto: GuardarEtapaDto = {
            responsableUsuarioId: !val.esAliado ? val.responsableUsuarioId : null,
            responsableAliadoId: val.esAliado ? val.responsableUsuarioId : null,
            esAliado: !!val.esAliado,
            autorizadorDesignadoUsuarioId: val.autorizadorDesignadoUsuarioId,
            informacionBrindada: val.informacionBrindada,
            fechaProgramada: val.fechaProgramada ? new Date(val.fechaProgramada).toISOString() : null,
            montoTotalEstimado: val.montoTotalEstimado,
            notas: val.notas,
            queCambioUltimaRevision: val.queCambioUltimaRevision?.trim() || null
        };

        this._service.guardar(this.idSeguimiento, this.etapaNumero, dto)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (actualizado) => {
                    this.guardando = false;
                    this.huboCambios = true;
                    this.cargarDetalle();
                },
                error: (err) => {
                    this.guardando = false;
                    this.errorMsg = err?.error?.mensaje || 'Error al guardar los cambios.';
                }
            });
    }

    // --- ACCIONES DE ESTATUS ---
    ponerEnProceso(): void {
        this.guardando = true;
        this.errorMsg = null;
        this._service.cambiarEstatus(this.idSeguimiento, this.etapaNumero, {
            nuevoEstatus: ESTATUS_ETAPA.EnProceso
        })
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: () => {
                    this.guardando = false;
                    this.huboCambios = true;
                    this.cargarDetalle();
                },
                error: (err) => {
                    this.guardando = false;
                    this.errorMsg = err?.error?.mensaje || 'Error al poner etapa en proceso.';
                }
            });
    }

    abrirModalAutorizar(): void {
        const siguientes = this.etapaConfig?.siguientes || [];
        this.etapaSiguienteSeleccionada = siguientes.length > 0 ? siguientes[0] : null;
        this.montoAutorizacion = this.form.get('montoTotalEstimado')?.value || null;
        this.modalAutorizarAbierto = true;
    }

    confirmarAutorizar(): void {
        this.guardando = true;
        this.errorMsg = null;

        const dto: CambiarEstatusDto = {
            nuevoEstatus: ESTATUS_ETAPA.Autorizada,
            etapaSiguiente: this.etapaSiguienteSeleccionada,
            montoTotalEstimado: this.etapaConfig?.usaMonto ? this.montoAutorizacion : undefined
        };

        this._service.cambiarEstatus(this.idSeguimiento, this.etapaNumero, dto)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: () => {
                    this.guardando = false;
                    this.huboCambios = true;
                    this.modalAutorizarAbierto = false;
                    this.cargarDetalle();
                },
                error: (err) => {
                    this.guardando = false;
                    this.errorMsg = err?.error?.mensaje || 'Error al autorizar la etapa.';
                }
            });
    }

    abrirModalRechazar(): void {
        this.motivoRechazoTexto = '';
        this.modalRechazarAbierto = true;
    }

    confirmarRechazar(): void {
        if (!this.motivoRechazoTexto.trim()) return;

        this.guardando = true;
        this.errorMsg = null;

        const dto: CambiarEstatusDto = {
            nuevoEstatus: ESTATUS_ETAPA.Rechazada,
            motivoRechazo: this.motivoRechazoTexto.trim()
        };

        this._service.cambiarEstatus(this.idSeguimiento, this.etapaNumero, dto)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: () => {
                    this.guardando = false;
                    this.huboCambios = true;
                    this.modalRechazarAbierto = false;
                    this.cargarDetalle();
                },
                error: (err) => {
                    this.guardando = false;
                    this.errorMsg = err?.error?.mensaje || 'Error al rechazar la etapa.';
                }
            });
    }

    iniciarRevision(): void {
        this.guardando = true;
        this.errorMsg = null;

        this._service.iniciarRevision(this.idSeguimiento, this.etapaNumero)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: () => {
                    this.guardando = false;
                    this.huboCambios = true;
                    this.cargarDetalle();
                },
                error: (err) => {
                    this.guardando = false;
                    this.errorMsg = err?.error?.mensaje || 'Error al iniciar nueva revisión.';
                }
            });
    }

    abrirModalCancelar(): void {
        this.motivoCancelacionTexto = '';
        this.modalCancelarAbierto = true;
    }

    confirmarCancelar(): void {
        if (!this.motivoCancelacionTexto.trim()) return;

        this.guardando = true;
        this.errorMsg = null;

        this._service.cancelar(this.idSeguimiento, this.motivoCancelacionTexto.trim())
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: () => {
                    this.guardando = false;
                    this.huboCambios = true;
                    this.modalCancelarAbierto = false;
                    this.cargarDetalle();
                },
                error: (err) => {
                    this.guardando = false;
                    this.errorMsg = err?.error?.mensaje || 'Error al cancelar el caso.';
                }
            });
    }

    // --- ARCHIVOS ---
    cambiarRevisionArchivos(numero: number): void {
        this.revisionSeleccionadaArchivos = numero;
        this.cargarArchivos();
    }

    cargarArchivos(): void {
        this.cargandoArchivos = true;
        this._service.archivos(this.idSeguimiento, this.etapaNumero, this.revisionSeleccionadaArchivos)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (archivos) => {
                    this.cargandoArchivos = false;
                    this.archivosLista = archivos || [];
                },
                error: (err) => {
                    this.cargandoArchivos = false;
                    console.error('Error cargando archivos', err);
                }
            });
    }

    onArchivosSeleccionados(event: any): void {
        const files: FileList = event.target.files;
        if (!files || files.length === 0) return;

        const arrayFiles: File[] = [];
        for (let i = 0; i < files.length; i++) {
            arrayFiles.push(files[i]);
        }

        this.cargandoArchivos = true;
        this._service.subirArchivos(this.idSeguimiento, this.etapaNumero, this.revisionSeleccionadaArchivos, arrayFiles)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: () => {
                    this.cargarArchivos();
                    event.target.value = '';
                },
                error: (err) => {
                    this.cargandoArchivos = false;
                    this.errorMsg = err?.error?.mensaje || 'Error al subir archivos.';
                }
            });
    }

    descargarArchivo(nombre: string): void {
        const rev = this.etapaActualDto?.revisiones?.find((r) => r.numero === this.revisionSeleccionadaArchivos);
        if (rev?.historica) {
            const carpetaLegada = this.etapaNumero === 2 ? 'Levantamiento' : (this.etapaNumero === 5 ? 'Cotizacion' : '');
            this._engineeringService.descargarArchivoEjecucion(this.idSeguimiento, carpetaLegada, nombre);
            return;
        }

        this._service.descargarArchivo(this.idSeguimiento, this.etapaNumero, this.revisionSeleccionadaArchivos, nombre)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (blob) => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = nombre;
                    a.click();
                    window.URL.revokeObjectURL(url);
                },
                error: (err) => console.error('Error al descargar archivo', err)
            });
    }

    eliminarArchivo(nombre: string): void {
        if (!confirm(`¿Eliminar el archivo "${nombre}"?`)) return;

        this.cargandoArchivos = true;
        this._service.eliminarArchivo(this.idSeguimiento, this.etapaNumero, this.revisionSeleccionadaArchivos, nombre)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: () => this.cargarArchivos(),
                error: (err) => {
                    this.cargandoArchivos = false;
                    this.errorMsg = err?.error?.mensaje || 'Error al eliminar archivo.';
                }
            });
    }

    revisionActualEstaCongelada(): boolean {
        const rev = this.etapaActualDto?.revisiones?.find((r) => r.numero === this.revisionSeleccionadaArchivos);
        return !rev || rev.resultado === ESTATUS_ETAPA.Autorizada || rev.historica;
    }

    cerrar(): void {
        this._dialogRef.close(this.huboCambios);
    }
}
