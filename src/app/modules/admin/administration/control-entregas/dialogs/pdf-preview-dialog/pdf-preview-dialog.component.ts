import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
    selector: 'pdf-preview-dialog',
    template: `
        <div class="flex flex-col h-[90vh] w-[80vw] max-w-[1000px] overflow-hidden bg-gray-100 rounded-2xl shadow-2xl">
            <!-- Header -->
            <div class="flex items-center justify-between h-16 pl-6 pr-4 bg-[#1e293b] text-white shrink-0">
                <div class="flex items-center">
                    <mat-icon class="text-blue-400">picture_as_pdf</mat-icon>
                    <span class="ml-3 text-lg font-bold tracking-tight">Vista Previa de Remisión</span>
                </div>
                <div class="flex items-center gap-2">
                    <button mat-flat-button 
                            color="primary"
                            (click)="download()"
                            class="bg-blue-600 hover:bg-blue-700 font-bold px-6 rounded-xl shadow-lg">
                        <mat-icon class="mr-2">download</mat-icon>
                        Descargar PDF
                    </button>
                    <button mat-icon-button (click)="close()" class="text-gray-400 hover:text-white">
                        <mat-icon>close</mat-icon>
                    </button>
                </div>
            </div>

            <!-- Content (PDF Iframe) -->
            <div class="flex-auto relative bg-gray-200 overflow-hidden">
                <iframe [src]="pdfUrl" class="w-full h-full border-none shadow-inner"></iframe>
                
                <!-- Loading State -->
                <div *ngIf="!pdfUrl" class="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                    <mat-spinner diameter="40"></mat-spinner>
                    <p class="mt-4 font-bold uppercase tracking-widest text-xs">Generando Vista Previa...</p>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .mat-mdc-dialog-container .mdc-dialog__surface {
            border-radius: 16px !important;
            overflow: hidden !important;
        }
    `],
    standalone: true,
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        MatButtonModule,
        MatDialogModule,
        MatIconModule
    ]
})
export class PdfPreviewDialogComponent {
    pdfUrl: SafeResourceUrl;

    constructor(
        public dialogRef: MatDialogRef<PdfPreviewDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { blob: Blob, filename: string },
        private _sanitizer: DomSanitizer
    ) {
        const url = URL.createObjectURL(data.blob);
        this.pdfUrl = this._sanitizer.bypassSecurityTrustResourceUrl(url);
    }

    download(): void {
        const link = document.createElement('a');
        link.href = (this.pdfUrl as any).changingThisBreaksApplicationSecurity;
        link.download = this.data.filename;
        link.click();
        this.dialogRef.close(true);
    }

    close(): void {
        this.dialogRef.close();
    }
}
