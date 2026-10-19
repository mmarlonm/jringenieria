import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AusenciasService } from '../ausencias/ausencias.service';
import { SolicitudAusencia } from '../ausencias/ausencias.types';
import { desdeIso, mensajeError } from '../colaboradores/colaboradores.utils';
import { RechazoDialogComponent } from './rechazo-dialog.component';

@Component({
    selector: 'rrhh-aprobaciones',
    standalone: true,
    templateUrl: './aprobaciones.component.html',
    imports: [CommonModule, MatButtonModule, MatIconModule]
})
export class AprobacionesComponent implements OnInit {
    private readonly _service = inject(AusenciasService);
    private readonly _dialog = inject(MatDialog);
    private readonly _snackBar = inject(MatSnackBar);

    readonly solicitudes = signal<SolicitudAusencia[]>([]);
    readonly cargando = signal(false);
    readonly error = signal<string | null>(null);
    readonly procesandoId = signal<number | null>(null);

    ngOnInit(): void {
        this.cargar();
    }

    cargar(): void {
        this.cargando.set(true);
        this._service.porAprobar().subscribe({
            next: (lista) => {
                this.solicitudes.set(lista);
                this.error.set(null);
                this.cargando.set(false);
            },
            error: (e) => {
                this.cargando.set(false);
                const texto = mensajeError(e, 'No se pudieron cargar las solicitudes por aprobar.');
                this.error.set(texto);
                this._snackBar.open(texto, 'Cerrar', { duration: 5000 });
            }
        });
    }

    aprobar(solicitud: SolicitudAusencia): void {
        this.procesandoId.set(solicitud.solicitudId);
        this._service.aprobar(solicitud.solicitudId).subscribe({
            next: (resp) => {
                this.procesandoId.set(null);
                this._snackBar.open(resp.mensaje || 'Solicitud aprobada con éxito.', 'Cerrar', { duration: 5000 });
                this.cargar();
            },
            error: (e) => {
                this.procesandoId.set(null);
                this._snackBar.open(mensajeError(e, 'No se pudo aprobar la solicitud.'), 'Cerrar', { duration: 5000 });
            }
        });
    }

    rechazar(solicitud: SolicitudAusencia): void {
        this._dialog
            .open(RechazoDialogComponent, {
                width: '480px',
                maxWidth: '95vw',
                data: { colaborador: solicitud.colaborador }
            })
            .afterClosed()
            .subscribe((motivo?: string) => {
                if (!motivo) return;
                this.procesandoId.set(solicitud.solicitudId);
                this._service.rechazar(solicitud.solicitudId, motivo).subscribe({
                    next: (resp) => {
                        this.procesandoId.set(null);
                        this._snackBar.open(resp.mensaje || 'Solicitud rechazada.', 'Cerrar', { duration: 5000 });
                        this.cargar();
                    },
                    error: (e) => {
                        this.procesandoId.set(null);
                        this._snackBar.open(mensajeError(e, 'No se pudo rechazar la solicitud.'), 'Cerrar', { duration: 5000 });
                    }
                });
            });
    }

    iniciales(nombre: string): string {
        if (!nombre) return '';
        return nombre
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((p) => p.charAt(0).toUpperCase())
            .join('');
    }

    formatearFecha(iso: string): string {
        const f = desdeIso(iso);
        return f ? f.toFormat('dd/MM/yyyy') : iso;
    }
}
