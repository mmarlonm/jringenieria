import { DateTime } from 'luxon';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { forkJoin } from 'rxjs';
import { mensajeError } from '../colaboradores/colaboradores.utils';
import { AusenciasService } from './ausencias.service';
import { SaldoVacaciones, SolicitudAusencia, TipoAusencia } from './ausencias.types';
import { SolicitudDialogComponent } from './solicitud-dialog.component';

@Component({
    selector: 'rrhh-mis-solicitudes',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule],
    templateUrl: './mis-solicitudes.component.html'
})
export class MisSolicitudesComponent implements OnInit {
    private readonly _service = inject(AusenciasService);
    private readonly _dialog = inject(MatDialog);
    private readonly _confirmacion = inject(FuseConfirmationService);
    private readonly _snackBar = inject(MatSnackBar);

    readonly cargando = signal(false);
    readonly error = signal<string | null>(null);
    readonly saldo = signal<SaldoVacaciones | null>(null);
    readonly tipos = signal<TipoAusencia[]>([]);
    readonly solicitudes = signal<SolicitudAusencia[]>([]);
    readonly cancelando = signal<number | null>(null);

    ngOnInit(): void {
        this.cargar();
    }

    cargar(conIndicador = true): void {
        if (conIndicador) this.cargando.set(true);

        forkJoin({
            saldo: this._service.saldo(),
            tipos: this._service.tipos(),
            solicitudes: this._service.misSolicitudes()
        }).subscribe({
            next: (resp) => {
                this.saldo.set(resp.saldo);
                this.tipos.set(resp.tipos);
                this.solicitudes.set(resp.solicitudes);
                this.error.set(null);
                this.cargando.set(false);
            },
            error: (e) => {
                this.cargando.set(false);
                const texto = mensajeError(e, 'No se pudo cargar la información de ausencias.');
                if (this.saldo()) {
                    this.aviso(texto);
                } else {
                    this.error.set(texto);
                }
            }
        });
    }

    abrirSolicitud(): void {
        const saldoActual = this.saldo();
        const tiposActuales = this.tipos();
        if (!saldoActual || !tiposActuales.length) return;

        this._dialog
            .open(SolicitudDialogComponent, {
                width: '600px',
                maxWidth: '95vw',
                data: { tipos: tiposActuales, saldo: saldoActual }
            })
            .afterClosed()
            .subscribe((creada?: boolean) => {
                if (creada) {
                    this.cargar(false);
                }
            });
    }

    /** 'yyyy-MM-ddT00:00:00' del API → dd/MM/yyyy. */
    private corta(fecha: string): string {
        return DateTime.fromISO(fecha).toFormat('dd/MM/yyyy');
    }

    cancelar(s: SolicitudAusencia): void {
        this._confirmacion
            .open({
                title: 'Cancelar solicitud',
                message: `¿Deseas cancelar la solicitud de ${s.tipo.toLowerCase()} del ${this.corta(s.fechaInicio)} al ${this.corta(s.fechaFin)}?`,
                actions: { confirm: { label: 'Cancelar solicitud' } }
            })
            .afterClosed()
            .subscribe((resultado) => {
                if (resultado !== 'confirmed') return;

                this.cancelando.set(s.solicitudId);
                this._service.cancelar(s.solicitudId).subscribe({
                    next: (res) => {
                        this.cancelando.set(null);
                        this.aviso(res.mensaje || 'Solicitud cancelada.');
                        this.cargar(false);
                    },
                    error: (e) => {
                        this.cancelando.set(null);
                        this.aviso(mensajeError(e, 'No se pudo cancelar la solicitud.'));
                    }
                });
            });
    }

    esPendiente(estatus: string): boolean {
        return estatus === 'PENDIENTE_JEFE' || estatus === 'PENDIENTE_RRHH';
    }

    private aviso(texto: string): void {
        this._snackBar.open(texto, 'Cerrar', { duration: 5000 });
    }
}
