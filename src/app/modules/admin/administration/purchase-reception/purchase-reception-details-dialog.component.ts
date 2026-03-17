import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
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
    archivos: any[] = [];
    isLoading: boolean = true;

    constructor(
        public matDialogRef: MatDialogRef<PurchaseReceptionDetailsDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { idRecepcion: number, idSolicitud: number },
        private _receptionService: PurchaseReceptionService,
        private _notificationService: ChatNotificationService
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
                this.archivos = res.data || res || [];
            },
            error: () => {
                console.error('Error loading files');
            }
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

    close(): void {
        this.matDialogRef.close();
    }
}
