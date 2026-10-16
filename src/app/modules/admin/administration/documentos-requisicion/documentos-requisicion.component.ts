import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { DocumentosRequisicionService } from 'app/core/documentos-requisicion/documentos-requisicion.service';
import { DocumentacionRequisicion, DocumentoRequisicion, TipoRequerido } from 'app/core/documentos-requisicion/documentos-requisicion.types';
import { aceptarArchivos, formatearTamano } from 'app/core/documentos-requisicion/documentos-requisicion.utils';
import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';
import { ImagePreviewDialogComponent } from 'app/modules/admin/dashboards/tasks/task-media-dialog/task-media-dialog-viewer.component';
import Swal from 'sweetalert2';

/** Documentación de una requisición: qué se exige, qué se ha subido y su revisión. */
@Component({
    selector: 'documentos-requisicion',
    standalone: true,
    imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
    templateUrl: './documentos-requisicion.component.html',
})
export class DocumentosRequisicionComponent implements OnChanges {
    @Input() idSolicitud!: number;
    /** Se emite tras subir, borrar, aprobar o rechazar, por si la requisición se cerró y hay que refrescar la pantalla. */
    @Output() cambio = new EventEmitter<void>();

    private _servicio = inject(DocumentosRequisicionService);
    private _permisos = inject(PermisosEspecialesService);
    private _dialog = inject(MatDialog);
    private _cdr = inject(ChangeDetectorRef);

    datos: DocumentacionRequisicion | null = null;
    cargando = false;
    error: string | null = null;
    subiendo: Record<string, boolean> = {};
    rechazando: DocumentoRequisicion | null = null;
    motivoRechazo = '';

    readonly aceptar = aceptarArchivos;
    readonly tamano = formatearTamano;

    get puedeRevisar(): boolean {
        return this._permisos.tiene('compras.documentos.revisar');
    }

    ngOnChanges(cambios: SimpleChanges): void {
        if (cambios['idSolicitud'] && this.idSolicitud) this.cargar();
    }

    cargar(): void {
        this.cargando = true;
        this._servicio.obtener(this.idSolicitud).subscribe({
            next: datos => {
                this.datos = datos;
                this.error = null;
                this.cargando = false;
                this._cdr.markForCheck();
            },
            error: err => {
                this.cargando = false;
                this.error = this.mensajeDe(err, 'No se pudo cargar la documentación.');
                this._cdr.markForCheck();
            },
        });
    }

    documentosDe(tipo: string): DocumentoRequisicion[] {
        return (this.datos?.documentos ?? []).filter(d => d.tipoDocumento === tipo);
    }

    etiquetaEstado(t: TipoRequerido): string {
        return ({ Completo: 'Completo', EnRevision: 'En revisión', Rechazado: 'Rechazado', Falta: 'Falta' } as Record<string, string>)[t.estado] ?? t.estado;
    }

    claseEstado(estado: string): string {
        switch (estado) {
            case 'Completo': case 'Aprobado': return 'bg-emerald-100 text-emerald-700';
            case 'EnRevision': case 'Pendiente': return 'bg-amber-100 text-amber-700';
            case 'Rechazado': return 'bg-rose-100 text-rose-700';
            default: return 'bg-gray-100 text-gray-600';
        }
    }

    // ------------------------------------------------------------------ subir

    elegirArchivo(tipo: TipoRequerido, evento: Event): void {
        const input = evento.target as HTMLInputElement;
        const archivo = input.files?.[0];
        input.value = ''; // permite volver a elegir el mismo archivo
        if (!archivo) return;

        this.subiendo[tipo.tipo] = true;
        this._servicio.subir(this.idSolicitud, tipo.tipo, archivo).subscribe({
            next: () => {
                this.subiendo[tipo.tipo] = false;
                this.cargar();
                this.cambio.emit();
            },
            error: err => {
                this.subiendo[tipo.tipo] = false;
                Swal.fire('No se pudo subir el documento', this.mensajeDe(err, 'Inténtalo de nuevo.'), 'error');
                this._cdr.markForCheck();
            },
        });
    }

    // ------------------------------------------------------------------ ver, descargar, borrar

    ver(doc: DocumentoRequisicion): void {
        this._servicio.descargar(this.idSolicitud, doc.idDocumento).subscribe({
            next: blob => {
                const esPdf = doc.nombreOriginal.toLowerCase().endsWith('.pdf');
                const url = URL.createObjectURL(esPdf ? new Blob([blob], { type: 'application/pdf' }) : blob);
                this._dialog.open(ImagePreviewDialogComponent, {
                    data: { url, name: doc.nombreOriginal, isPdf: esPdf },
                    panelClass: 'bg-transparent',
                    maxWidth: esPdf ? '95vw' : '90vw',
                    width: esPdf ? '1200px' : 'auto',
                    backdropClass: ['bg-black', 'bg-opacity-80'],
                });
            },
            error: err => Swal.fire('No se pudo abrir el documento', this.mensajeDe(err, 'Inténtalo de nuevo.'), 'error'),
        });
    }

    descargar(doc: DocumentoRequisicion): void {
        this._servicio.descargar(this.idSolicitud, doc.idDocumento).subscribe({
            next: blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = doc.nombreOriginal;
                a.click();
                window.URL.revokeObjectURL(url);
            },
            error: err => Swal.fire('No se pudo descargar el documento', this.mensajeDe(err, 'Inténtalo de nuevo.'), 'error'),
        });
    }

    puedeBorrar(doc: DocumentoRequisicion): boolean {
        return !this.datos?.cerrada && doc.estatus !== 'Aprobado';
    }

    eliminar(doc: DocumentoRequisicion): void {
        Swal.fire({
            title: '¿Eliminar el documento?',
            text: `Se eliminará «${doc.nombreOriginal}».`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        }).then(r => {
            if (!r.isConfirmed) return;
            this._servicio.eliminar(this.idSolicitud, doc.idDocumento).subscribe({
                next: () => { this.cargar(); this.cambio.emit(); },
                error: err => Swal.fire('No se pudo eliminar', this.mensajeDe(err, 'Inténtalo de nuevo.'), 'error'),
            });
        });
    }

    // ------------------------------------------------------------------ revisión

    aprobar(doc: DocumentoRequisicion): void {
        this._servicio.aprobar(this.idSolicitud, doc.idDocumento).subscribe({
            next: () => { this.cargar(); this.cambio.emit(); },
            error: err => Swal.fire('No se pudo aprobar', this.mensajeDe(err, 'Inténtalo de nuevo.'), 'error'),
        });
    }

    iniciarRechazo(doc: DocumentoRequisicion): void {
        this.rechazando = doc;
        this.motivoRechazo = '';
    }

    cancelarRechazo(): void {
        this.rechazando = null;
        this.motivoRechazo = '';
    }

    confirmarRechazo(): void {
        const doc = this.rechazando;
        const motivo = this.motivoRechazo.trim();
        if (!doc || !motivo) return;
        this._servicio.rechazar(this.idSolicitud, doc.idDocumento, motivo).subscribe({
            next: () => { this.cancelarRechazo(); this.cargar(); this.cambio.emit(); },
            error: err => Swal.fire('No se pudo rechazar', this.mensajeDe(err, 'Inténtalo de nuevo.'), 'error'),
        });
    }

    private mensajeDe(err: any, porDefecto: string): string {
        return err?.error?.mensaje || (err?.status === 403 ? 'No tienes permiso para esta acción.' : porDefecto);
    }
}
