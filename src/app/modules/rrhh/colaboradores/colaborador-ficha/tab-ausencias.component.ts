import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { forkJoin } from 'rxjs';
import { AusenciasService } from '../../ausencias/ausencias.service';
import {
    Ajuste,
    AjusteGuardar,
    EstatusSolicitud,
    Incidencia,
    IncidenciaGuardar,
    SaldoVacaciones,
    SolicitudAusencia,
    SolicitudGuardar,
    TipoAusencia
} from '../../ausencias/ausencias.types';
import { mensajeError } from '../colaboradores.utils';
import { AjusteDialogComponent } from './ajuste-dialog.component';
import { CapturaDialogComponent } from './captura-dialog.component';
import { IncidenciaDialogComponent } from './incidencia-dialog.component';

@Component({
    selector: 'rrhh-tab-ausencias',
    standalone: true,
    templateUrl: './tab-ausencias.component.html',
    imports: [CommonModule, MatButtonModule, MatIconModule, MatTableModule]
})
export class TabAusenciasComponent implements OnInit {
    private readonly _ausenciasService = inject(AusenciasService);
    private readonly _dialog = inject(MatDialog);
    private readonly _snackBar = inject(MatSnackBar);
    private readonly _confirmacion = inject(FuseConfirmationService);

    @Input({ required: true }) colaboradorId!: number;

    readonly cargando = signal(false);
    readonly saldo = signal<SaldoVacaciones | null>(null);
    readonly listaAjustes = signal<Ajuste[]>([]);
    readonly listaIncidencias = signal<Incidencia[]>([]);
    readonly listaSolicitudes = signal<SolicitudAusencia[]>([]);
    readonly catalogoTipos = signal<TipoAusencia[]>([]);

    readonly colsAjustes = ['fecha', 'dias', 'motivo', 'registradoPor'];
    readonly colsIncidencias = ['tipo', 'fechas', 'dias', 'detalle', 'acciones'];
    readonly colsSolicitudes = ['tipo', 'fechas', 'dias', 'estatus', 'acciones'];

    ngOnInit(): void {
        this.cargarTodo();
    }

    cargarTodo(): void {
        this.cargando.set(true);
        forkJoin({
            saldo: this._ausenciasService.saldoDe(this.colaboradorId),
            ajustes: this._ausenciasService.ajustes(this.colaboradorId),
            incidencias: this._ausenciasService.incidencias(this.colaboradorId),
            solicitudes: this._ausenciasService.solicitudesDe(this.colaboradorId),
            tipos: this._ausenciasService.tiposRrhh()
        }).subscribe({
            next: (resp) => {
                this.saldo.set(resp.saldo);
                this.listaAjustes.set(resp.ajustes);
                this.listaIncidencias.set(resp.incidencias);
                this.listaSolicitudes.set(resp.solicitudes);
                this.catalogoTipos.set(resp.tipos);
                this.cargando.set(false);
            },
            error: (e) => {
                this.cargando.set(false);
                this.aviso(mensajeError(e, 'No se pudo cargar la información de ausencias.'));
            }
        });
    }

    abrirAjustarSaldo(): void {
        this._dialog
            .open<AjusteDialogComponent, void, AjusteGuardar>(AjusteDialogComponent, {
                width: '460px',
                maxWidth: '95vw'
            })
            .afterClosed()
            .subscribe((dto) => {
                if (!dto) return;
                this._ausenciasService.ajustar(this.colaboradorId, dto).subscribe({
                    next: () => {
                        this.aviso('Ajuste de saldo registrado.');
                        this.cargarTodo();
                    },
                    error: (e) => this.aviso(mensajeError(e, 'No se pudo registrar el ajuste.'))
                });
            });
    }

    abrirRegistrarIncidencia(): void {
        this._dialog
            .open<IncidenciaDialogComponent, void, IncidenciaGuardar>(IncidenciaDialogComponent, {
                width: '500px',
                maxWidth: '95vw'
            })
            .afterClosed()
            .subscribe((dto) => {
                if (!dto) return;
                this._ausenciasService.registrarIncidencia(this.colaboradorId, dto).subscribe({
                    next: () => {
                        this.aviso('Incidencia registrada.');
                        this.cargarTodo();
                    },
                    error: (e) => this.aviso(mensajeError(e, 'No se pudo registrar la incidencia.'))
                });
            });
    }

    abrirCapturarSolicitud(): void {
        this._dialog
            .open<CapturaDialogComponent, { tipos: TipoAusencia[] }, SolicitudGuardar>(CapturaDialogComponent, {
                width: '500px',
                maxWidth: '95vw',
                data: { tipos: this.catalogoTipos() }
            })
            .afterClosed()
            .subscribe((dto) => {
                if (!dto) return;
                this._ausenciasService.capturar(this.colaboradorId, dto).subscribe({
                    next: () => {
                        this.aviso('Solicitud capturada y aprobada.');
                        this.cargarTodo();
                    },
                    error: (e) => this.aviso(mensajeError(e, 'No se pudo capturar la solicitud.'))
                });
            });
    }

    eliminarIncidencia(incidencia: Incidencia): void {
        this._confirmacion
            .open({
                title: 'Quitar incidencia',
                message: `¿Deseas eliminar la incidencia de tipo «${incidencia.tipo}» del ${incidencia.fechaInicio}?`,
                actions: { confirm: { label: 'Quitar' } }
            })
            .afterClosed()
            .subscribe((res) => {
                if (res !== 'confirmed') return;
                this._ausenciasService.eliminarIncidencia(incidencia.incidenciaId).subscribe({
                    next: (r) => {
                        this.aviso(r.mensaje || 'Incidencia eliminada.');
                        this.cargarTodo();
                    },
                    error: (e) => this.aviso(mensajeError(e, 'No se pudo eliminar la incidencia.'))
                });
            });
    }

    cancelarSolicitud(solicitud: SolicitudAusencia): void {
        this._confirmacion
            .open({
                title: 'Cancelar solicitud',
                message: `¿Deseas cancelar la solicitud de ${solicitud.tipo} (${solicitud.diasHabiles} días hábiles)?`,
                actions: { confirm: { label: 'Cancelar solicitud' } }
            })
            .afterClosed()
            .subscribe((res) => {
                if (res !== 'confirmed') return;
                this._ausenciasService.cancelarComoRrhh(solicitud.solicitudId).subscribe({
                    next: (r) => {
                        this.aviso(r.mensaje || 'Solicitud cancelada.');
                        this.cargarTodo();
                    },
                    error: (e) => this.aviso(mensajeError(e, 'No se pudo cancelar la solicitud.'))
                });
            });
    }

    puedeCancelarSolicitud(estatus: EstatusSolicitud): boolean {
        return estatus !== 'CANCELADA' && estatus !== 'RECHAZADA';
    }

    etiquetaEstatus(estatus: EstatusSolicitud): string {
        switch (estatus) {
            case 'PENDIENTE_JEFE': return 'Con el jefe';
            case 'PENDIENTE_RRHH': return 'Con RRHH';
            case 'APROBADA': return 'Aprobada';
            case 'RECHAZADA': return 'Rechazada';
            default: return 'Cancelada';
        }
    }

    claseEstatus(estatus: EstatusSolicitud): string {
        switch (estatus) {
            case 'APROBADA':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'PENDIENTE_JEFE':
            case 'PENDIENTE_RRHH':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
            case 'RECHAZADA':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            case 'CANCELADA':
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
        }
    }

    private aviso(texto: string): void {
        this._snackBar.open(texto, 'Cerrar', { duration: 5000 });
    }
}
