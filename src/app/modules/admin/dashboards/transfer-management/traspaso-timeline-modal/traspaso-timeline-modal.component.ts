import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TransferManagementService } from '../transfer-management.service';
import { environment } from 'environments/environment';

@Component({
    selector: 'app-traspaso-timeline-modal',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule
    ],
    templateUrl: './traspaso-timeline-modal.component.html',
    styles: [`
        .timeline-step::before {
            content: '';
            position: absolute;
            left: 20px;
            top: 40px;
            bottom: -20px;
            width: 2px;
            background: #e2e8f0;
        }
        .timeline-step:last-child::before { display: none; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    `]
})
export class TraspasoTimelineModalComponent implements OnInit {

    public traspaso: any;
    public apiBaseUrl = environment.apiUrl.replace('/api', '');

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: any,
        private _dialogRef: MatDialogRef<TraspasoTimelineModalComponent>,
        private _service: TransferManagementService
    ) {
        this.traspaso = data.traspaso;
    }

    ngOnInit(): void {
        console.log('Detalle de Traspaso:', this.traspaso);
    }

    descargar(ruta: string): void {
        if (!ruta) return;

        // El controlador devuelve Base64, así que llamamos al servicio
        this._service.descargarEvidencia(ruta).subscribe({
            next: (res) => {
                const base64Content = res.data; // Según el DTO del backend
                if (!base64Content) return;

                const linkSource = `data:application/pdf;base64,${base64Content}`;
                const downloadLink = document.createElement('a');
                const fileName = ruta.split('/').pop() || 'evidencia.pdf';

                downloadLink.href = linkSource;
                downloadLink.download = fileName;
                downloadLink.click();
            }
        });
    }

    verPDF(ruta: string): void {
        if (!ruta) return;

        this._service.descargarEvidencia(ruta).subscribe({
            next: (res) => {
                const base64Content = res.data;
                if (!base64Content) return;

                const byteCharacters = atob(base64Content);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const file = new Blob([byteArray], { type: 'application/pdf' });
                const fileURL = URL.createObjectURL(file);
                window.open(fileURL);
            }
        });
    }
}
