import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { mensajeError } from '../colaboradores/colaboradores.utils';
import { ExpedienteService } from '../expediente/expediente.service';
import { ExpedienteTipo } from '../expediente/expediente.types';

/**
 * RRHH sube o reemplaza el formato descargable de cada documento (solicitud de empleo, beneficiarios, tallas y EPP).
 * La lista de tipos llega por `data` (quien abre el diálogo la consulta antes): no hace peticiones al abrirse.
 */
@Component({
    selector: 'rrhh-formatos-dialog',
    standalone: true,
    imports: [MatDialogModule, MatButtonModule],
    template: `
        <h2 mat-dialog-title>Formatos descargables</h2>
        <mat-dialog-content class="!max-h-[65vh]">
            <p class="text-secondary mb-3">El colaborador los descarga desde su expediente, los llena y los sube. Acepta PDF, JPG o PNG de hasta 10 MB.</p>
            @for (t of tipos(); track t.tipoDocumentoId) {
                <div class="flex flex-wrap items-center gap-3 py-2 border-b last:border-b-0">
                    <div class="min-w-0 flex-1 basis-56">
                        <div class="font-medium">{{ t.nombre }}</div>
                        <div class="text-xs" [class.text-emerald-700]="t.tieneFormato" [class.text-secondary]="!t.tieneFormato">
                            {{ t.tieneFormato ? 'Formato cargado' : 'Sin formato' }}
                        </div>
                    </div>
                    <button mat-stroked-button type="button" [disabled]="subiendo() === t.tipoDocumentoId" (click)="elegir(t)">
                        {{ subiendo() === t.tipoDocumentoId ? 'Subiendo…' : t.tieneFormato ? 'Reemplazar' : 'Subir formato' }}
                    </button>
                </div>
            }
            <input #selector type="file" class="hidden" accept="application/pdf,image/jpeg,image/png" (change)="alElegir($event)" />
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-stroked-button type="button" mat-dialog-close>Cerrar</button>
        </mat-dialog-actions>
    `
})
export class FormatosDialogComponent {
    private readonly _service = inject(ExpedienteService);
    private readonly _snackBar = inject(MatSnackBar);
    readonly tipos = signal<ExpedienteTipo[]>(inject<ExpedienteTipo[]>(MAT_DIALOG_DATA));
    readonly subiendo = signal<number | null>(null);
    @ViewChild('selector', { static: true }) selector!: ElementRef<HTMLInputElement>;
    private _objetivo: ExpedienteTipo | null = null;

    elegir(tipo: ExpedienteTipo): void {
        this._objetivo = tipo;
        this.selector.nativeElement.value = '';
        this.selector.nativeElement.click();
    }

    alElegir(evento: Event): void {
        const archivo = (evento.target as HTMLInputElement).files?.[0];
        const tipo = this._objetivo;
        if (!archivo || !tipo) return;
        if (archivo.size > 10 * 1024 * 1024) {
            this._snackBar.open('El archivo pesa más de 10 MB.', 'Cerrar', { duration: 5000 });
            return;
        }
        this.subiendo.set(tipo.tipoDocumentoId);
        this._service.subirFormato(tipo.tipoDocumentoId, archivo).subscribe({
            next: (r) => {
                this.tipos.update((lista) => lista.map((t) => (t.tipoDocumentoId === tipo.tipoDocumentoId ? { ...t, tieneFormato: true } : t)));
                this.subiendo.set(null);
                this._snackBar.open(r.mensaje, 'Cerrar', { duration: 5000 });
            },
            error: (e) => {
                this.subiendo.set(null);
                this._snackBar.open(mensajeError(e, 'No se pudo subir el formato.'), 'Cerrar', { duration: 5000 });
            }
        });
    }
}
