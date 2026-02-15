import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-image-preview-dialog',
    standalone: true,
    imports: [MatDialogModule, MatButtonModule, MatIconModule],
    template: `
        <div class="relative flex flex-col items-center justify-center bg-transparent outline-none">
            <div class="absolute top-0 w-full flex justify-between items-center p-2 bg-black bg-opacity-60 text-white z-10 rounded-t-md">
                <span class="truncate px-2 font-medium">{{ data.name }}</span>
                <button mat-icon-button (click)="close()">
                    <mat-icon svgIcon="heroicons_outline:x-mark">close</mat-icon>
                </button>
            </div>
            
            <img [src]="data.url" [alt]="data.name" class="max-w-[90vw] max-h-[85vh] object-contain rounded-md shadow-2xl">
        </div>
    `
})
export class ImagePreviewDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<ImagePreviewDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { url: string, name: string }
    ) { }

    close(): void {
        this.dialogRef.close();
    }
}