import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { DocumentosRequisicionComponent } from './documentos-requisicion.component';

/** Ventana con la documentación de una requisición (se abre desde la lista de «Solicitud de compras»). */
@Component({
    selector: 'documentos-requisicion-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, DocumentosRequisicionComponent],
    template: `
        <div class="flex flex-col max-h-[90vh]">
            <div class="flex items-center justify-between p-5 border-b">
                <div class="text-xl font-extrabold tracking-tight">Documentos de la requisición <span *ngIf="data.folio">#{{ data.folio }}</span></div>
                <button mat-button mat-dialog-close>Cerrar</button>
            </div>
            <div class="p-5 overflow-y-auto">
                <documentos-requisicion [idSolicitud]="data.idSolicitud"></documentos-requisicion>
            </div>
        </div>
    `,
})
export class DocumentosRequisicionDialogComponent {
    constructor(@Inject(MAT_DIALOG_DATA) public data: { idSolicitud: number; folio?: string | number }) {}
}
