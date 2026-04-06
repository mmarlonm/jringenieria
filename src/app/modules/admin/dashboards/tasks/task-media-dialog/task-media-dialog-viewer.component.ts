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
        <div class="relative flex flex-col bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden outline-none border border-white/20 shadow-2xl">
            <div class="w-full flex justify-between items-center px-4 py-3 bg-slate-900 border-b border-white/10 text-white z-10">
                <div class="flex items-center gap-2">
                    <mat-icon class="icon-size-5 text-indigo-400" [svgIcon]="data.isPdf ? 'heroicons_solid:document-text' : 'heroicons_solid:photo'"></mat-icon>
                    <span class="truncate max-w-[60vw] font-bold tracking-tight">{{ data.name }}</span>
                </div>
                <button mat-icon-button (click)="close()" class="hover:bg-white/10">
                    <mat-icon class="icon-size-5">close</mat-icon>
                </button>
            </div>
            
            <div class="flex items-center justify-center bg-slate-200 dark:bg-slate-800 transition-all duration-300 overflow-hidden" 
                 [style.height]="data.isPdf ? '88vh' : 'auto'">
                
                <img *ngIf="!data.isPdf" 
                     [src]="data.url" 
                     [alt]="data.name" 
                     class="max-w-[95vw] max-h-[85vh] object-contain shadow-2xl rounded-lg m-4 border-4 border-white/50">

                <div *ngIf="data.isPdf" class="w-full h-full p-2 lg:p-4">
                    <ngx-extended-pdf-viewer
                        [src]="data.url"
                        [height]="'100%'"
                        [useBrowserVisibleOnly]="false"
                        [textLayer]="true"
                        [zoom]="'page-fit'"
                        [showPagingButtons]="true"
                        [showRotationButton]="true"
                        [language]="'es-ES'"
                        class="rounded-lg overflow-hidden shadow-inner">
                    </ngx-extended-pdf-viewer>
                </div>
            </div>
        </div>
    `,
    styles: [`
        ::ng-deep .cdk-overlay-pane {
            max-width: 95vw !important;
            width: 1100px !important;
        }
        ::ng-deep .mat-mdc-dialog-container .mdc-dialog__surface { 
            background: transparent !important; 
            box-shadow: none !important;
            border-radius: 12px !important;
        }
    `]
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