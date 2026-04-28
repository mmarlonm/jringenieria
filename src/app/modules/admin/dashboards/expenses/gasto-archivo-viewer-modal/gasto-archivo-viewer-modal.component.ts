import { ChangeDetectionStrategy, Component, Inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
    selector: 'gasto-archivo-viewer-modal',
    template: `
        <div class="flex flex-col h-full overflow-hidden">
            <div class="flex items-center justify-between p-4 border-b bg-gray-50">
                <div class="flex flex-col min-w-0">
                    <span class="text-xs font-semibold text-secondary uppercase truncate">{{data.nombre}}</span>
                </div>
                <button mat-icon-button (click)="dialogRef.close()">
                    <mat-icon [svgIcon]="'heroicons_outline:x-mark'"></mat-icon>
                </button>
            </div>

            <div class="flex-auto overflow-auto bg-slate-900 flex items-center justify-center p-4 min-h-[60vh]">
                <ng-container [ngSwitch]="type">
                    <!-- Imagen -->
                    <img *ngSwitchCase="'image'" [src]="safeUrl" class="max-w-full max-h-full object-contain shadow-2xl rounded" />
                    
                    <!-- PDF -->
                    <iframe *ngSwitchCase="'pdf'" [src]="safeUrl" class="w-full h-full border-0 min-h-[70vh]"></iframe>
                    
                    <!-- Desconocido / Otros -->
                    <div *ngSwitchDefault class="text-white flex flex-col items-center">
                        <mat-icon class="icon-size-20 mb-4" [svgIcon]="'heroicons_outline:document'"></mat-icon>
                        <p>No se puede previsualizar este tipo de archivo.</p>
                        <a [href]="safeUrl" [download]="data.nombre" mat-flat-button color="primary" class="mt-4">
                            Descargar Archivo
                        </a>
                    </div>
                </ng-container>
            </div>
        </div>
    `,
    styles: [`
        gasto-archivo-viewer-modal {
            display: block;
            width: 100%;
            height: 100%;
        }
    `],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule]
})
export class GastoArchivoViewerModalComponent {
    type: 'image' | 'pdf' | 'other' = 'other';
    safeUrl: SafeResourceUrl;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: { base64: string, contentType: string, nombre: string },
        public dialogRef: MatDialogRef<GastoArchivoViewerModalComponent>,
        private _sanitizer: DomSanitizer
    ) {
        this.init();
    }

    init(): void {
        const url = `data:${this.data.contentType};base64,${this.data.base64}`;
        this.safeUrl = this._sanitizer.bypassSecurityTrustResourceUrl(url);

        if (this.data.contentType.includes('image')) {
            this.type = 'image';
        } else if (this.data.contentType.includes('pdf')) {
            this.type = 'pdf';
        } else {
            this.type = 'other';
        }
    }
}
