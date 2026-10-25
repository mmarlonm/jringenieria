import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

/** Anterior / Siguiente con el rango visible, para los listados paginados de Finanzas (CFDI, movimientos e historial). */
@Component({
    selector: 'app-finanzas-paginador',
    standalone: true,
    imports: [MatButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (total > 0) {
            <div class="flex items-center justify-between gap-3 px-2 pt-4 text-xs font-bold text-gray-500">
                <span>{{ desde }}–{{ hasta }} de {{ total }}</span>
                <div class="flex gap-2">
                    <button mat-stroked-button type="button" class="rounded-xl" [disabled]="deshabilitado || pagina <= 1"
                        (click)="cambio.emit(pagina - 1)">Anterior</button>
                    <button mat-stroked-button type="button" class="rounded-xl" [disabled]="deshabilitado || hasta >= total"
                        (click)="cambio.emit(pagina + 1)">Siguiente</button>
                </div>
            </div>
        }
    `
})
export class PaginadorComponent {
    @Input() pagina = 1;
    @Input() tamano = 50;
    @Input() total = 0;
    @Input() deshabilitado = false;
    /** Número de página (desde 1) al que se quiere ir. */
    @Output() cambio = new EventEmitter<number>();

    get desde(): number {
        return (this.pagina - 1) * this.tamano + 1;
    }

    get hasta(): number {
        return Math.min(this.pagina * this.tamano, this.total);
    }
}
