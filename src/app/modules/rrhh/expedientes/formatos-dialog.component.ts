import { CommonModule } from '@angular/common';
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
    imports: [CommonModule, MatDialogModule, MatButtonModule],
    template: `
        <h2 mat-dialog-title>Formatos descargables</h2>
        <mat-dialog-content class="!max-h-[65vh]">
            <p class="text-secondary mb-3">El colaborador los descarga desde su expediente, los llena y los sube. Acepta PDF, JPG o PNG de hasta 50 MB. Puedes arrastrar archivos directamente a las filas o presionar el botón.</p>
            @for (t of tipos(); track t.tipoDocumentoId) {
                <div class="flex flex-wrap items-center gap-3 py-2 border-b last:border-b-0 rounded-lg px-2 transition-colors relative"
                    [ngClass]="arrastrandoTipoId() === t.tipoDocumentoId ? 'bg-primary-50 dark:bg-primary-950/40 border border-dashed border-primary-500' : ''"
                    (dragover)="onDragOver($event, t)"
                    (dragleave)="onDragLeave($event, t)"
                    (drop)="onDrop($event, t)">
                    <div class="min-w-0 flex-1 basis-56">
                        <div class="font-medium">{{ t.nombre }}</div>
                        <div class="text-xs" [class.text-emerald-700]="t.tieneFormato" [class.text-secondary]="!t.tieneFormato">
                            {{ t.tieneFormato ? 'Formato cargado' : 'Sin formato' }}
                        </div>
                    </div>
                    @if (arrastrandoTipoId() === t.tipoDocumentoId) {
                        <span class="text-xs font-semibold text-primary-700 dark:text-primary-300 animate-pulse">Suelta el formato aquí</span>
                    } @else {
                        <button mat-stroked-button type="button" [disabled]="subiendo() === t.tipoDocumentoId" (click)="elegir(t)">
                            {{ subiendo() === t.tipoDocumentoId ? 'Subiendo…' : t.tieneFormato ? 'Reemplazar' : 'Subir formato' }}
                        </button>
                    }
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
    readonly arrastrandoTipoId = signal<number | null>(null);
    @ViewChild('selector', { static: true }) selector!: ElementRef<HTMLInputElement>;
    private _objetivo: ExpedienteTipo | null = null;

    elegir(tipo: ExpedienteTipo): void {
        this._objetivo = tipo;
        this.selector.nativeElement.value = '';
        this.selector.nativeElement.click();
    }

    onDragOver(evento: DragEvent, t: ExpedienteTipo): void {
        if (this.subiendo() === t.tipoDocumentoId) return;
        evento.preventDefault();
        evento.stopPropagation();
        if (evento.dataTransfer) {
            evento.dataTransfer.dropEffect = 'copy';
        }
        if (this.arrastrandoTipoId() !== t.tipoDocumentoId) {
            this.arrastrandoTipoId.set(t.tipoDocumentoId);
        }
    }

    onDragLeave(evento: DragEvent, t: ExpedienteTipo): void {
        evento.preventDefault();
        evento.stopPropagation();
        if (this.arrastrandoTipoId() === t.tipoDocumentoId) {
            this.arrastrandoTipoId.set(null);
        }
    }

    onDrop(evento: DragEvent, t: ExpedienteTipo): void {
        evento.preventDefault();
        evento.stopPropagation();
        this.arrastrandoTipoId.set(null);

        if (this.subiendo() === t.tipoDocumentoId) return;

        const archivo = evento.dataTransfer?.files?.[0];
        if (!archivo) return;
        this.subirArchivoFormato(t, archivo);
    }

    alElegir(evento: Event): void {
        const archivo = (evento.target as HTMLInputElement).files?.[0];
        const tipo = this._objetivo;
        if (!archivo || !tipo) return;
        this.subirArchivoFormato(tipo, archivo);
    }

    private subirArchivoFormato(tipo: ExpedienteTipo, archivo: File): void {
        const TAMANO_MAXIMO = 50 * 1024 * 1024;
        if (archivo.size > TAMANO_MAXIMO) {
            this._snackBar.open(`El archivo pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el máximo permitido es 50 MB.`, 'Cerrar', { duration: 5000 });
            return;
        }

        const extension = (archivo.name.split('.').pop() ?? '').toLowerCase();
        const extensionesPermitidas = ['pdf', 'jpg', 'jpeg', 'png'];
        if (!extensionesPermitidas.includes(extension)) {
            this._snackBar.open(`El archivo «${archivo.name}» no es compatible. Solo se permiten PDF, JPG, JPEG o PNG.`, 'Cerrar', { duration: 5000 });
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
