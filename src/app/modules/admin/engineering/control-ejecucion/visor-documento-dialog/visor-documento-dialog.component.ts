import { Component, Inject, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { renderAsync } from 'docx-preview';

export interface VisorDocumentoData {
    nombreArchivo: string;
    blob?: Blob;
    formatoNoSoportado?: boolean;
    errorCarga?: boolean;
    onDescargar?: () => void;
}

@Component({
    selector: 'app-visor-documento-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        MatProgressBarModule
    ],
    templateUrl: './visor-documento-dialog.component.html'
})
export class VisorDocumentoDialogComponent implements OnInit, AfterViewInit {
    @ViewChild('docxContainer') docxContainer!: ElementRef<HTMLDivElement>;

    cargando: boolean = false;
    errorMsg: string | null = null;
    formatoNoSoportado: boolean = false;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: VisorDocumentoData,
        private _dialogRef: MatDialogRef<VisorDocumentoDialogComponent>,
        private _cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        const nombre = this.data?.nombreArchivo || '';
        const ext = nombre.split('.').pop()?.toLowerCase() || '';

        if (ext === 'doc' || this.data?.formatoNoSoportado) {
            this.formatoNoSoportado = true;
            this.errorMsg = 'Este formato no se puede ver aquí';
            return;
        }

        if (this.data?.errorCarga) {
            this.errorMsg = 'No se pudo visualizar el documento.';
            return;
        }

        if (this.data?.blob) {
            this.cargando = true;
        }
    }

    ngAfterViewInit(): void {
        if (!this.formatoNoSoportado && !this.errorMsg && this.data?.blob && this.docxContainer) {
            setTimeout(() => this.renderizarDocx(this.data.blob!));
        }
    }

    renderDocumento(blob: Blob, container: HTMLElement): Promise<any> {
        return renderAsync(blob, container);
    }

    async renderizarDocx(blob: Blob): Promise<void> {
        this.cargando = true;
        try {
            await this.renderDocumento(blob, this.docxContainer.nativeElement);
            this.cargando = false;
            this._cdr.detectChanges();
        } catch (err) {
            console.error('Error al renderizar docx:', err);
            this.cargando = false;
            this.errorMsg = 'No se pudo visualizar el documento.';
            this._cdr.detectChanges();
        }
    }

    descargar(): void {
        if (this.data?.onDescargar) {
            this.data.onDescargar();
            return;
        }
        if (this.data?.blob) {
            const url = window.URL.createObjectURL(this.data.blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.data.nombreArchivo;
            a.click();
            window.URL.revokeObjectURL(url);
        }
    }

    cerrar(): void {
        this._dialogRef.close();
    }
}
