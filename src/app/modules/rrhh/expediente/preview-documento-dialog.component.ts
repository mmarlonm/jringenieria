import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { SafeResourceUrl } from '@angular/platform-browser';

export type TipoVista = 'pdf' | 'imagen' | 'otro';

export interface DatosVista {
    nombre: string;
    tipo: TipoVista;
    url: SafeResourceUrl;
}

/** Vista previa de un documento. Recibe el archivo ya descargado (URL de blob) como `data`: no hace peticiones al abrirse. */
@Component({
    selector: 'rrhh-preview-documento-dialog',
    standalone: true,
    imports: [MatDialogModule, MatButtonModule],
    template: `
        <h2 mat-dialog-title>{{ data.nombre }}</h2>
        <mat-dialog-content class="!max-h-[75vh]">
            @switch (data.tipo) {
                @case ('pdf') {
                    <iframe [src]="data.url" class="w-full h-[70vh] border-0" title="Vista previa del documento"></iframe>
                }
                @case ('imagen') {
                    <img [src]="data.url" [alt]="data.nombre" class="max-w-full max-h-[70vh] mx-auto" />
                }
                @default {
                    <p class="text-secondary">No hay vista previa para este tipo de archivo; descárgalo para verlo.</p>
                }
            }
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-stroked-button type="button" mat-dialog-close>Cerrar</button>
        </mat-dialog-actions>
    `
})
export class PreviewDocumentoDialogComponent {
    readonly data = inject<DatosVista>(MAT_DIALOG_DATA);
}
