import { Component, Inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FuseCardComponent } from '@fuse/components/card';
import { Subject, takeUntil } from 'rxjs';
import { CierreTerminalService } from '../cierre-terminal.service';
import { CierreTerminalResponse } from '../cierre-terminal.types';
import { ChatNotificationService } from 'app/shared/components/chat-notification/chat-notification.service';
import { ImagePreviewDialogComponent } from 'app/modules/admin/dashboards/tasks/task-media-dialog/task-media-dialog-viewer.component';

@Component({
    selector: 'cierre-terminal-detail',
    templateUrl: './cierre-terminal-detail.component.html',
    styleUrls: ['./cierre-terminal-detail.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatTableModule,
        MatTooltipModule,
        MatDialogModule,
        FuseCardComponent,
        ImagePreviewDialogComponent
    ]
})
export class CierreTerminalDetailComponent implements OnInit, OnDestroy {
    cierreResponse: CierreTerminalResponse | null = null;
    isLoading: boolean = false;
    
    displayedColumns: string[] = ['folio', 'tipo', 'cliente', 'total', 'saldo', 'fecha', 'estatus'];
    
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: { id: number },
        public matDialogRef: MatDialogRef<CierreTerminalDetailComponent>,
        private _cierreService: CierreTerminalService,
        private _notificationService: ChatNotificationService,
        private _dialog: MatDialog
    ) { }

    ngOnInit(): void {
        if (this.data?.id) {
            this.loadCierre(this.data.id);
        }
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    loadCierre(id: number): void {
        this.isLoading = true;
        this._cierreService.getById(id)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (res) => {
                    this.cierreResponse = res;
                    this.isLoading = false;
                },
                error: () => {
                    this.isLoading = false;
                    this._notificationService.showError('Error', 'No se pudo cargar la información del cierre.');
                    this.close();
                }
            });
    }

    descargar(nombreArchivo: string): void {
        if (!this.cierreResponse?.detalle?.datosCierre?.id) return;
        
        const id = this.cierreResponse.detalle.datosCierre.id;
        
        this._cierreService.descargarEvidencia(id, nombreArchivo)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
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
                        a.download = nombreArchivo;
                        a.click();
                        URL.revokeObjectURL(objectUrl);
                    } else {
                        this._notificationService.showError('Error', 'Archivo no encontrado o vacío.');
                    }
                },
                error: () => {
                    this._notificationService.showError('Error', 'No se pudo descargar el archivo.');
                }
            });
    }

    verEvidencia(nombreArchivo: string): void {
        if (!this.cierreResponse?.detalle?.datosCierre?.id) return;
        
        const id = this.cierreResponse.detalle.datosCierre.id;
        const extension = nombreArchivo.split('.').pop()?.toLowerCase() || '';
        
        this._cierreService.descargarEvidencia(id, nombreArchivo)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (res) => {
                    if (res && res.data) {
                        const isPdf = extension === 'pdf';
                        let fileData: any;

                        if (isPdf) {
                            const binaryString = window.atob(res.data);
                            const len = binaryString.length;
                            const bytes = new Uint8Array(len);
                            for (let i = 0; i < len; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            fileData = bytes;
                        } else {
                            fileData = `data:image/${extension};base64,${res.data}`;
                        }

                        this._dialog.open(ImagePreviewDialogComponent, {
                            data: {
                                url: fileData,
                                name: nombreArchivo,
                                isPdf: isPdf
                            },
                            panelClass: 'bg-transparent',
                            maxWidth: isPdf ? '95vw' : '90vw',
                            width: isPdf ? '1200px' : 'auto',
                            backdropClass: ['bg-black', 'bg-opacity-80']
                        });
                    } else {
                        this._notificationService.showError('Error', 'Archivo no encontrado o vacío.');
                    }
                },
                error: () => {
                    this._notificationService.showError('Error', 'No se pudo cargar el archivo.');
                }
            });
    }

    close(): void {
        this.matDialogRef.close();
    }
}
