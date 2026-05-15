import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { ImagePreviewDialogComponent } from 'app/modules/admin/dashboards/tasks/task-media-dialog/task-media-dialog-viewer.component';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PurchaseReceptionService } from './purchase-reception.service';
import { ChatNotificationService } from 'app/shared/components/chat-notification/chat-notification.service';

@Component({
    selector: 'purchase-reception-details-dialog',
    templateUrl: './purchase-reception-details-dialog.component.html',
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatDialogModule,
        MatIconModule,
        MatCardModule,
        MatDividerModule,
        MatTooltipModule
    ]
})
export class PurchaseReceptionDetailsDialogComponent implements OnInit {
    reception: any = null;
    archivos: string[] = [];
    isLoading: boolean = true;

    constructor(
        public matDialogRef: MatDialogRef<PurchaseReceptionDetailsDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { idRecepcion: number, idSolicitud: number },
        private _receptionService: PurchaseReceptionService,
        private _notificationService: ChatNotificationService,
        private _dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.loadDetails();
        this.loadFiles();
    }

    loadDetails(): void {
        this._receptionService.getRecepcionPorId(this.data.idRecepcion).subscribe({
            next: (res) => {
                this.reception = res.data || res;
                this.isLoading = false;
            },
            error: () => {
                this.isLoading = false;
                this._notificationService.showError('Error', 'No se pudieron cargar los detalles de la recepción');
            }
        });
    }

    loadFiles(): void {
        this._receptionService.getArchivosRecepcion(this.data.idRecepcion).subscribe({
            next: (res) => {
                this.archivos = res || [];
            },
            error: () => {
                console.error('Error loading files');
            }
        });
    }

    getFileConfig(nombre: string): any {
        const n = nombre.toUpperCase();
        if (n.startsWith('FACTURA_')) return { label: 'Factura', color: 'text-emerald-500', bg: 'bg-emerald-50', icon: 'heroicons_outline:document-text', type: 'Facturas' };
        if (n.startsWith('EVIDENCIA_')) return { label: 'Evidencia', color: 'text-blue-500', bg: 'bg-blue-50', icon: 'heroicons_outline:camera', type: 'Evidencias' };
        if (n.startsWith('PAGO_')) return { label: 'Pago', color: 'text-amber-500', bg: 'bg-amber-50', icon: 'heroicons_outline:cash', type: 'Pagos' };
        return { label: 'Archivo', color: 'text-gray-500', bg: 'bg-gray-50', icon: 'heroicons_outline:document', type: 'Otros' };
    }

    eliminar(nombre: string): void {
        const config = this.getFileConfig(nombre);
        this._receptionService.eliminarArchivo(this.data.idSolicitud, config.type, nombre).subscribe({
            next: () => {
                this._notificationService.showSuccess('Éxito', 'Archivo eliminado');
                this.loadFiles();
            },
            error: () => this._notificationService.showError('Error', 'No se pudo eliminar el archivo')
        });
    }

    descargar(nombre: string): void {
        this._receptionService.descargarArchivo(this.data.idSolicitud, nombre).subscribe({
            next: (res) => {
                if (res && res.data) {
                    const byteCharacters = atob(res.data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: res.contentType });

                    const a = document.createElement('a');
                    const objectUrl = URL.createObjectURL(blob);
                    a.href = objectUrl;
                    a.download = nombre;
                    a.click();
                    URL.revokeObjectURL(objectUrl);
                }
            },
            error: () => {
                this._notificationService.showError('Error', 'No se pudo descargar el archivo');
            }
        });
    }

    previsualizar(nombre: string): void {
        this._receptionService.descargarArchivo(this.data.idSolicitud, nombre).subscribe({
            next: (res) => {
                if (res && res.data) {
                    const byteCharacters = atob(res.data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: res.contentType });
                    const fileURL = URL.createObjectURL(blob);
                    
                    const isPdf = nombre.toLowerCase().endsWith('.pdf');

                    this._dialog.open(ImagePreviewDialogComponent, {
                        data: {
                            url: fileURL,
                            name: nombre,
                            isPdf: isPdf
                        },
                        panelClass: 'bg-transparent',
                        maxWidth: isPdf ? '95vw' : '90vw',
                        width: isPdf ? '1100px' : 'auto',
                        backdropClass: ['bg-black', 'bg-opacity-80']
                    });
                }
            },
            error: () => this._notificationService.showError('Error', 'No se pudo abrir el archivo')
        });
    }

    close(): void {
        this.matDialogRef.close();
    }
}
