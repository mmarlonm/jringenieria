import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common'; // Necesario para *ngIf
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';

@Component({
    selector: 'app-image-preview-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        NgxExtendedPdfViewerModule
    ],
    template: `
        <div class="relative flex flex-col bg-white dark:bg-slate-900 rounded-md overflow-hidden outline-none">
            <div class="w-full flex justify-between items-center p-2 bg-black bg-opacity-80 text-white z-10">
                <span class="truncate px-2 font-medium">{{ data.name }}</span>
                <button mat-icon-button (click)="close()">
                    <mat-icon>close</mat-icon>
                </button>
            </div>
            
            <div class="flex items-center justify-center bg-gray-200 dark:bg-slate-800" 
                 [style.height]="data.isPdf ? '85vh' : 'auto'">
                
                <img *ngIf="!data.isPdf" 
                     [src]="data.url" 
                     [alt]="data.name" 
                     class="max-w-[90vw] max-h-[80vh] object-contain shadow-2xl">

                <ngx-extended-pdf-viewer *ngIf="data.isPdf"
                    [src]="data.url"
                    [height]="'85vh'"
                    [useBrowserVisibleOnly]="false"
                    [textLayer]="true"
                    [zoom]="'page-fit'"
                    [showPagingButtons]="true"
                    [showRotationButton]="true"
                    [language]="'es-ES'">
                </ngx-extended-pdf-viewer>
            </div>
        </div>
    `
})
export class ImagePreviewDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<ImagePreviewDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { url: string, name: string, isPdf: boolean }
    ) { }

    close(): void {
        this.dialogRef.close();
    }
}